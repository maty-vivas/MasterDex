import { useEffect, useMemo, useRef, useState } from 'react';
import { API, DEX_REGIONS, PAGE_SIZE, TYPE_MEMBER_CACHE } from '../data/constants.js';
import Header from '../components/Header.jsx';
import PokemonRow from '../components/PokemonRow.jsx';
import PreviewPanel from '../components/PreviewPanel.jsx';

/** Pantalla de lista: combina búsqueda, filtros y carga incremental sin almacenar datos duplicados. */
export default function DexScreen({ pokemon, details, loading, error, query, filters, setFilters, sort, onHome, setQuery, setSort, onOpen, onRetry, onLoadPreview }) {
  // preview es la fila enfocada o sobrevolada; visibleCount controla el scroll incremental.
  const [preview, setPreview] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef(null);
  const pageLock = useRef(false);
  const filterRequest = useRef(0);
  const [typeMembers, setTypeMembers] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);

  // Calcula los resultados en memoria: OR entre regiones elegidas y OR entre tipos elegidos.
  // Cuando hay filtros de ambos grupos, los resultados deben cumplir ambos grupos.
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase().replace(/^#/, '');
    let list = pokemon.filter((item) => !normalizedQuery || item.name.includes(normalizedQuery) || String(item.id).padStart(4, '0').includes(normalizedQuery) || String(item.id) === normalizedQuery);
    if (filters.regions.length) list = list.filter((item) => filters.regions.some((id) => { const region = DEX_REGIONS.find((entry) => entry.id === id); return region && item.id >= region.min && item.id <= region.max; }));
    if (sort.startsWith('name-')) {
      const direction = sort.endsWith('-asc') ? 1 : -1;
      list = [...list].sort((a, b) => a.name.localeCompare(b.name) * direction || a.id - b.id);
    } else if (sort.endsWith('-desc')) {
      list = [...list].sort((a, b) => b.id - a.id);
    }
    if (filters.types.length && typeMembers) list = list.filter((item) => typeMembers.has(item.id));
    return list;
  }, [pokemon, query, sort, filters, typeMembers]);
  // Solo se renderiza el tramo visible; el resto se añade al acercarse al final de la lista.
  const shown = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  // Una nueva búsqueda u orden empieza desde el principio para no dejar el scroll en un punto inválido.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query, filters, sort]);
  // El bloqueo evita que varios eventos scroll seguidos agreguen tandas antes del siguiente render.
  useEffect(() => { pageLock.current = false; }, [visibleCount]);
  useEffect(() => { setPreview(null); }, [query, filters, sort]);

  // El panel de la lista es la zona desplazable; este puente permite que la rueda funcione
  // aunque el cursor esté sobre el panel de vista previa u otra zona no interactiva.
  useEffect(() => {
    function routeWheelToList(event) {
      const list = listRef.current;
      if (!list || list.contains(event.target) || event.deltaY === 0) return;
      if (event.target instanceof Element && event.target.closest('.filter-menu, input, select, button, a')) return;
      const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? list.clientHeight : 1;
      list.scrollTop += event.deltaY * multiplier;
    }
    window.addEventListener('wheel', routeWheelToList, { passive: true });
    return () => window.removeEventListener('wheel', routeWheelToList);
  }, []);

  // Precarga los detalles únicamente para filas renderizadas, así los tipos e iconos aparecen pronto.
  useEffect(() => {
    if (!loading && !error) shown.forEach(onLoadPreview);
  }, [shown, loading, error, onLoadPreview]);

  // La API devuelve el conjunto de Pokémon por tipo. Se cachean miembros y se cancelan
  // solicitudes obsoletas si el usuario cambia la selección antes de que terminen.
  useEffect(() => {
    if (!filters.types.length) { setTypeMembers(null); setFilterLoading(false); return undefined; }
    const requestId = ++filterRequest.current;
    const controller = new AbortController();
    setFilterLoading(true);
    Promise.all(filters.types.map((typeName) => {
      if (TYPE_MEMBER_CACHE.has(typeName)) return Promise.resolve(TYPE_MEMBER_CACHE.get(typeName));
      return fetch(`${API}/type/${typeName}`, { signal: controller.signal })
        .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
        .then((data) => {
          const members = new Set(data.pokemon.map(({ pokemon: item }) => Number(item.url.match(/\/pokemon\/(\d+)\//)?.[1])).filter(Number.isFinite));
          TYPE_MEMBER_CACHE.set(typeName, members);
          return members;
        });
    }))
      .then((sets) => { if (requestId === filterRequest.current) setTypeMembers(new Set(sets.flatMap((members) => [...members]))); })
      .catch((reason) => { if (reason.name !== 'AbortError' && requestId === filterRequest.current) setTypeMembers(new Set()); })
      .finally(() => { if (requestId === filterRequest.current) setFilterLoading(false); });
    return () => controller.abort();
  }, [filters.types]);

  /** Añade otra tanda cuando quedan menos de 180 px de lista por recorrer. */
  function handleListScroll(event) {
    const element = event.currentTarget;
    const nearEnd = element.scrollHeight - element.scrollTop - element.clientHeight < 180;
    if (nearEnd && !pageLock.current && !loading && !filterLoading && shown.length < filtered.length) {
      pageLock.current = true;
      setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
    }
  }

  return <>
    <Header onHome={onHome} query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} sort={sort} setSort={setSort} />
    <main className="dex-layout">
      <PreviewPanel pokemon={preview} detail={preview ? details[preview.id] : null} />
      <section className="dex-list-panel" aria-label="Lista Pokédex">
        <div className="pokemon-list" ref={listRef} onScroll={handleListScroll} aria-live="polite">
          {loading && <div className="loading-state"><span className="loader" /><span>CONECTANDO CON LA POKÉDEX…</span></div>}
          {!loading && error && <div className="error-state"><strong>NO SE PUDO CONECTAR CON LA POKÉDEX</strong><span>Comprueba tu conexión e inténtalo de nuevo.</span><button onClick={onRetry}>REINTENTAR</button></div>}
          {!loading && !error && filterLoading && <div className="loading-state"><span className="loader" /><span>APLICANDO FILTROS…</span></div>}
          {!loading && !error && !filterLoading && !filtered.length && <div className="empty-state">NO SE ENCONTRARON POKÉMON.</div>}
          {!loading && !error && !filterLoading && shown.map((item) => <PokemonRow key={item.id} pokemon={item} detail={details[item.id]} onPreview={setPreview} onLoadPreview={onLoadPreview} onOpen={() => onOpen(item.id)} />)}
        </div>
        <div className="pagination-row"><span>{loading ? 'CARGANDO REGISTROS' : `MOSTRANDO ${shown.length} DE ${filtered.length}`}</span></div>
      </section>
    </main>
  </>;
}
