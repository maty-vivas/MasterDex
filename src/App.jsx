import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { API } from './data/constants.js';
import DexScreen from './screens/DexScreen.jsx';
import PokemonDetailPage from './screens/PokemonDetailPage.jsx';
import { readPokemonRoute } from './utils/pokemon.js';

/** Coordina el estado compartido y decide qué pantalla mostrar según la URL. */
export default function App() {
  // Estos datos viven aquí porque la lista y la ficha los necesitan en ambas pantallas.
  const [allPokemon, setAllPokemon] = useState([]);
  const [details, setDetails] = useState({});
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('id-asc');
  const [filters, setFilters] = useState({ types:[], regions:[] });
  // El modo de sprites pertenece a la navegación global y sobrevive entre fichas y recargas.
  const [viewMode, setViewMode] = useState(() => {
    try { return window.localStorage.getItem('masterdex-view-mode') === '3d' ? '3d' : '2d'; }
    catch { return '2d'; }
  });
  const [routeId, setRouteId] = useState(readPokemonRoute);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [fallbackDirection, setFallbackDirection] = useState('');
  const activeViewTransition = useRef(null);
  // Evita pedir el mismo detalle varias veces cuando la lista carga muchas filas a la vez.
  const detailRequests = useRef(new Map());
  const detailsRef = useRef(details);
  detailsRef.current = details;

  // Conserva la preferencia del usuario incluso si recarga o vuelve más tarde.
  useEffect(() => {
    try { window.localStorage.setItem('masterdex-view-mode', viewMode); }
    catch { /* La navegación sigue funcionando si el navegador bloquea el almacenamiento local. */ }
  }, [viewMode]);

  // Mantiene el nombre corto en la pestaña al volver a la lista.
  useEffect(() => {
    if (routeId === null) document.title = 'MasterDex';
  }, [routeId]);

  // Carga el índice nacional una vez; cambiar retryKey vuelve a ejecutar la solicitud.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/pokemon?limit=1025`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setAllPokemon(data.results.map((pokemon, index) => ({ id: index + 1, name: pokemon.name, url: pokemon.url }))))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retryKey]);

  // Cambia de pantalla con transición nativa cuando el navegador la soporta.
  // Si no, anima la entrada de la pantalla nueva; en ambos casos respeta movimiento reducido.
  const transitionToRoute = useCallback((nextId) => {
    // Cambiar entre dos fichas usa un fundido; Lista ↔ Ficha conserva el deslizamiento direccional.
    const transitionKind = routeId !== null && nextId !== null
      ? 'detail'
      : nextId === null ? 'back' : 'forward';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = document.startViewTransition?.bind(document);
    if (!startViewTransition || prefersReducedMotion) {
      setFallbackDirection(prefersReducedMotion ? '' : transitionKind);
      setRouteId(nextId);
      return;
    }

    setFallbackDirection('');
    activeViewTransition.current?.skipTransition();
    document.documentElement.dataset.routeDirection = transitionKind;
    const viewTransition = startViewTransition(() => flushSync(() => setRouteId(nextId)));
    activeViewTransition.current = viewTransition;
    const reportTransitionError = (transitionError) => {
      if (transitionError?.name !== 'AbortError') console.error('No se pudo completar la transición de vista.', transitionError);
    };
    // Al reemplazar una transición activa, el navegador rechaza ready/updateCallbackDone con AbortError.
    viewTransition.ready.catch(reportTransitionError);
    viewTransition.updateCallbackDone.catch(reportTransitionError);
    const clearTransition = () => {
      if (activeViewTransition.current !== viewTransition) return;
      activeViewTransition.current = null;
      delete document.documentElement.dataset.routeDirection;
    };
    viewTransition.finished.then(clearTransition, clearTransition);
  }, [routeId]);

  // Mantiene la pantalla sincronizada cuando el usuario usa Atrás o Adelante del navegador.
  useEffect(() => {
    const onPopState = () => transitionToRoute(readPokemonRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [transitionToRoute]);

  /** Actualiza la ruta sin recargar la aplicación y abre una ficha. */
  function openPokemon(id) {
    window.history.pushState({}, '', `/pokemon/${id}`);
    transitionToRoute(id);
    window.scrollTo(0, 0);
  }
  /** Vuelve a la lista; si ya está abierta, solo lleva la ventana arriba. */
  function goHome() {
    if (routeId === null) { window.scrollTo(0, 0); return; }
    window.history.pushState({}, '', '/');
    transitionToRoute(null);
    window.scrollTo(0, 0);
  }
  /** Reinicia los estados de error/carga y vuelve a consultar el índice nacional. */
  function retry() { setError(false); setLoading(true); setRetryKey((key) => key + 1); }

  // Las filas visibles necesitan detalles para enseñar tipos e iconos; se cachean en estado.
  const loadPreview = useCallback((pokemon) => {
    if (detailsRef.current[pokemon.id] || detailRequests.current.has(pokemon.id)) return;
    const request = fetch(pokemon.url).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((detail) => {
      setDetails((current) => ({ ...current, [pokemon.id]: detail }));
      return detail;
    }).catch(() => null).finally(() => detailRequests.current.delete(pokemon.id));
    detailRequests.current.set(pokemon.id, request);
  }, []);

  // El índice puede seguir cargando al entrar directamente en /pokemon/{id}; en ese caso la ficha espera.
  const selectedPokemon = routeId === null ? null : allPokemon.find((item) => item.id === routeId) || null;
  return <div
    key={routeId ?? 'dex'}
    className={`app-shell${fallbackDirection ? ` route-fallback-${fallbackDirection}` : ''}`}
  >
    {routeId === null
      ? <DexScreen pokemon={allPokemon} details={details} loading={loading} error={error} query={query} filters={filters} setFilters={setFilters} sort={sort} onHome={goHome} setQuery={setQuery} setSort={setSort} onOpen={openPokemon} onRetry={retry} onLoadPreview={loadPreview} />
      : <PokemonDetailPage pokemon={selectedPokemon} cachedDetail={details[routeId]} loading={loading} viewMode={viewMode} setViewMode={setViewMode} onBack={goHome} onOpen={openPokemon} />}
  </div>;
}
