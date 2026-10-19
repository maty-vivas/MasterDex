import { useEffect, useRef, useState } from 'react';
import { DEX_REGIONS, TYPE_COLORS, TYPE_ICON_FILES, TYPES } from '../data/constants.js';
import { typeLabel } from '../utils/pokemon.js';
import Brand from './Brand.jsx';
import FilterGroup from './FilterGroup.jsx';

const EMPTY_FILTERS = { types:[], regions:[] };
const noop = () => {};

/** Encabezado de la Pokédex con búsqueda, filtros combinables y orden. */
export default function Header({ onHome, showCatalogControls = true, onRandomPokemon = noop, randomPokemonDisabled = true, query = '', setQuery = noop, filters = EMPTY_FILTERS, setFilters = noop, sort = 'id-asc', setSort = noop }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const searchInputRef = useRef(null);
  const activeFilterCount = filters.types.length + filters.regions.length;
  const sortFamily = sort.startsWith('name-') ? 'name' : 'id';
  const sortDirection = sort.endsWith('-desc') ? 'desc' : 'asc';
  /** Alterna una región o un tipo sin borrar las opciones marcadas del mismo grupo. */
  function toggleFilter(group, value) {
    setFilters((current) => ({ ...current, [group]: current[group].includes(value) ? current[group].filter((item) => item !== value) : [...current[group], value] }));
  }
  // Cierra ambos menús si se hace clic fuera o se presiona Escape.
  useEffect(() => {
    if (!filterOpen && !sortOpen && !mobileSearchOpen) return undefined;
    function closeOnOutside(event) {
      if (!filterRef.current?.contains(event.target)) setFilterOpen(false);
      if (!sortRef.current?.contains(event.target)) setSortOpen(false);
      if (mobileSearchOpen && !event.target.closest('.topbar')) setMobileSearchOpen(false);
    }
    function closeOnEscape(event) { if (event.key === 'Escape') { setFilterOpen(false); setSortOpen(false); setMobileSearchOpen(false); } }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [filterOpen, sortOpen, mobileSearchOpen]);

  // Al desplegar la búsqueda en celular, deja el cursor listo para escribir.
  useEffect(() => {
    if (!mobileSearchOpen) return undefined;
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [mobileSearchOpen]);
  /** Cambia de criterio en ascendente o invierte el criterio ya seleccionado. */
  function chooseSort(family) {
    setSort((current) => {
      const currentFamily = current.startsWith('name-') ? 'name' : 'id';
      const currentDirection = current.endsWith('-desc') ? 'desc' : 'asc';
      return family === currentFamily ? `${family}-${currentDirection === 'asc' ? 'desc' : 'asc'}` : `${family}-asc`;
    });
  }
  return <header className={`topbar${showCatalogControls ? '' : ' detail-topbar'}${mobileSearchOpen ? ' mobile-search-open' : ''}`}>
    <Brand onHome={onHome} />
    {showCatalogControls && <div className="header-controls">
      <button className="random-pokemon-button" type="button" onClick={onRandomPokemon} disabled={randomPokemonDisabled} aria-label="Abrir un Pokémon aleatorio" title="Descubrir un Pokémon al azar">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12v11H4z" /><circle cx="7" cy="7.5" r=".9" /><circle cx="13" cy="12.5" r=".9" /><circle cx="10" cy="10" r=".9" /></svg>
        <span>ALEATORIO</span>
      </button>
      <button className={`filter-trigger mobile-search-toggle${mobileSearchOpen ? ' is-open' : ''}`} type="button" aria-expanded={mobileSearchOpen} aria-controls="pokemon-search-panel" aria-label={mobileSearchOpen ? 'Cerrar búsqueda' : 'Buscar Pokémon'} onClick={() => { setFilterOpen(false); setSortOpen(false); setMobileSearchOpen((open) => !open); }}>
        <svg viewBox="0 0 20 20" aria-hidden="true">{mobileSearchOpen ? <path d="m5 5 10 10M15 5 5 15" /> : <><circle cx="8.5" cy="8.5" r="5.3" /><path d="m12.4 12.4 4.2 4.2" /></>}</svg>
        <span>{mobileSearchOpen ? 'CERRAR' : 'BUSCAR'}</span>
      </button>
      <div className={`mobile-search-panel${mobileSearchOpen ? ' is-open' : ''}`} id="pokemon-search-panel">
        <div className="search-filter" ref={filterRef}>
          <label className="header-search" htmlFor="pokemon-search"><span className="search-icon" aria-hidden="true" /><input ref={searchInputRef} id="pokemon-search" type="search" placeholder="Buscar Pokémon…" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <button className={`filter-trigger${filterOpen ? ' is-open' : ''}${activeFilterCount ? ' has-filters' : ''}`} type="button" aria-expanded={filterOpen} aria-controls="pokemon-filter-menu" onClick={() => { setSortOpen(false); setFilterOpen((open) => !open); }}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.2 3.2h15.6l-6 6.8v5.1l-3.6 1.8V10l-6-6.8Z" /></svg><span>FILTRO</span>{activeFilterCount > 0 && <b>{activeFilterCount}</b>}
          </button>
          {filterOpen && <div className="filter-menu" id="pokemon-filter-menu" aria-label="Filtros de la Pokédex">
            <FilterGroup title="REGIÓN DE ORIGEN" options={DEX_REGIONS} selected={filters.regions} onToggle={(value) => toggleFilter('regions', value)} />
            <FilterGroup title="TIPO" options={TYPES.map((id) => ({ id, label: typeLabel(id), icon:TYPE_ICON_FILES[id === 'fighting' ? 'fight' : id], color:TYPE_COLORS[id] }))} selected={filters.types} onToggle={(value) => toggleFilter('types', value)} className="type-filter-group two-column-options" />
            <div className="filter-menu-footer"><span>{activeFilterCount ? `${activeFilterCount} FILTROS ACTIVOS` : 'MARCA UNA O VARIAS OPCIONES'}</span><button type="button" onClick={() => setFilters({ types:[], regions:[] })} disabled={!activeFilterCount}>LIMPIAR</button></div>
          </div>}
        </div>
        <div className="sort-control-wrap" ref={sortRef}>
          <button className={`filter-trigger sort-trigger${sortOpen ? ' is-open' : ''}`} type="button" aria-label="Ordenar Pokémon" aria-expanded={sortOpen} aria-controls="pokemon-sort-menu" onClick={() => { setFilterOpen(false); setSortOpen((open) => !open); }}>
            <svg className="sort-arrows" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 16V4m0 0L2.8 7.2M6 4l3.2 3.2M14 4v12m0 0l3.2-3.2M14 16l-3.2-3.2" /></svg><span>ORDEN</span>
          </button>
          {sortOpen && <div className="sort-menu" id="pokemon-sort-menu" aria-label="Orden de la Pokédex">
            <p className="sort-menu-title">ORDENAR POR</p>
            {[{ id:'id', label:'N.º POKÉDEX' }, { id:'name', label:'ALFABÉTICO' }].map((option) => {
              const selected = sortFamily === option.id;
              const direction = selected ? sortDirection : 'asc';
              return <button key={option.id} className={`sort-option${selected ? ' selected' : ''}`} type="button" aria-pressed={selected} aria-label={`${option.label}, orden ${direction === 'asc' ? 'ascendente' : 'descendente'}`} onClick={() => chooseSort(option.id)}>
                <span>{option.label}<small>{direction === 'asc' ? 'ASCENDENTE' : 'DESCENDENTE'}</small></span><b className={direction === 'desc' ? 'descending' : ''} aria-hidden="true">↑</b>
              </button>;
            })}
          </div>}
        </div>
      </div>
    </div>}
  </header>;
}
