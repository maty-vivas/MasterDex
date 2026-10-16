import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import physicalClassIcon from './assets/moves/move-class-physical.png';
import specialClassIcon from './assets/moves/move-class-special.png';
import statusClassIcon from './assets/moves/move-class-status.png';
import hpStatIcon from './assets/stats/ps.svg';
import attackStatIcon from './assets/stats/atk.svg';
import defenseStatIcon from './assets/stats/def.svg';
import specialAttackStatIcon from './assets/stats/sp-atk.svg';
import specialDefenseStatIcon from './assets/stats/sp-def.svg';
import speedStatIcon from './assets/stats/speed.svg';

const API = 'https://pokeapi.co/api/v2';
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const ARTWORK = `${SPRITES}/other/official-artwork`;
const MOVE_INFO_CACHE = new Map();
const PAGE_SIZE = 60;
const TYPE_NAMES = { normal:'NORMAL',fire:'FUEGO',water:'AGUA',electric:'ELÉCTRICO',grass:'PLANTA',ice:'HIELO',fighting:'LUCHA',poison:'VENENO',ground:'TIERRA',flying:'VOLADOR',psychic:'PSÍQUICO',bug:'BICHO',rock:'ROCA',ghost:'FANTASMA',dragon:'DRAGÓN',dark:'SINIESTRO',steel:'ACERO',fairy:'HADA' };
const TYPE_COLORS = { normal:'#858b91',fire:'#ed624b',water:'#4389df',electric:'#d9b936',grass:'#60a94f',ice:'#6bbdc5',fighting:'#ca5545',poison:'#9859ad',ground:'#bd9845',flying:'#8291d5',psychic:'#d85b8c',bug:'#99a62d',rock:'#ad9146',ghost:'#756198',dragon:'#6651bd',dark:'#60575b',steel:'#7d91a1',fairy:'#d47fa8' };
const TYPES = Object.keys(TYPE_NAMES);
const TYPE_ICON_FILES = Object.fromEntries(Object.entries(import.meta.glob('./assets/pkmn-types/*.svg', { eager:true, query:'?url', import:'default' })).map(([path, url]) => [path.split('/').pop().replace('.svg', ''), url]));
const TYPE_MEMBER_CACHE = new Map();
const DEX_REGIONS = [
  { id:'kanto', label:'Kanto', min:1, max:151 }, { id:'johto', label:'Johto', min:152, max:251 },
  { id:'hoenn', label:'Hoenn', min:252, max:386 }, { id:'sinnoh', label:'Sinnoh', min:387, max:493 },
  { id:'unova', label:'Unova', min:494, max:649 }, { id:'kalos', label:'Kalos', min:650, max:721 },
  { id:'alola', label:'Alola', min:722, max:809 }, { id:'galar', label:'Galar', min:810, max:905 },
  { id:'paldea', label:'Paldea', min:906, max:1025 },
];

function padId(id) { return String(id).padStart(3, '0'); }
function typeLabel(type) { return TYPE_NAMES[type] || type.toUpperCase(); }
function SparkleIcon({ className = '' }) {
  return <svg className={`sparkle-icon ${className}`.trim()} viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5 12.1 7.9 18.5 10l-6.4 2.1L10 18.5l-2.1-6.4L1.5 10l6.4-2.1L10 1.5Z" /><path d="m16.1 1 .8 2.1L19 4l-2.1.8-.8 2.1-.8-2.1L13.2 4l2.1-.9.8-2.1Z" /></svg>;
}
function readPokemonRoute() {
  const match = window.location.pathname.match(/^\/pokemon\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function Brand({ onHome }) {
  return <a className="brand" href="/" onClick={(event) => { event.preventDefault(); onHome(); }} aria-label="MasterDex, inicio">
    <span className="brand-mark" aria-hidden="true"><span /></span>
    <span>MASTER<span className="brand-accent">DEX</span></span>
  </a>;
}

function FilterGroup({ title, options, selected, onToggle, className = '' }) {
  return <section className={`filter-group ${className}`}>
    <h2>{title}</h2>
    <div className="filter-options">{options.map((option) => <label key={option.id} className={`filter-option${option.icon ? ' filter-option-type' : ''}`} style={option.color ? { '--filter-type-color': option.color } : undefined}>
      <input type="checkbox" checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} />
      {option.icon && <img className="filter-type-icon" src={option.icon} alt="" aria-hidden="true" />}
      <span>{option.label}</span>
    </label>)}</div>
  </section>;
}

function Header({ onHome, query, setQuery, filters, setFilters, sort, setSort }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const activeFilterCount = filters.types.length + filters.regions.length;
  function toggleFilter(group, value) {
    setFilters((current) => ({ ...current, [group]: current[group].includes(value) ? current[group].filter((item) => item !== value) : [...current[group], value] }));
  }
  useEffect(() => {
    if (!filterOpen) return undefined;
    function closeOnOutside(event) { if (!filterRef.current?.contains(event.target)) setFilterOpen(false); }
    function closeOnEscape(event) { if (event.key === 'Escape') setFilterOpen(false); }
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [filterOpen]);
  return <header className="topbar">
    <Brand onHome={onHome} />
    <div className="header-controls">
      <div className="search-filter" ref={filterRef}>
        <label className="header-search" htmlFor="pokemon-search"><span className="search-icon" aria-hidden="true" /><input id="pokemon-search" type="search" placeholder="Buscar Pokémon…" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <button className={`filter-trigger${filterOpen ? ' is-open' : ''}${activeFilterCount ? ' has-filters' : ''}`} type="button" aria-expanded={filterOpen} aria-controls="pokemon-filter-menu" onClick={() => setFilterOpen((open) => !open)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2.2 3.2h15.6l-6 6.8v5.1l-3.6 1.8V10l-6-6.8Z" /></svg><span>FILTRO</span>{activeFilterCount > 0 && <b>{activeFilterCount}</b>}
        </button>
        {filterOpen && <div className="filter-menu" id="pokemon-filter-menu" aria-label="Filtros de la Pokédex">
          <FilterGroup title="REGIÓN DE ORIGEN" options={DEX_REGIONS} selected={filters.regions} onToggle={(value) => toggleFilter('regions', value)} />
          <FilterGroup title="TIPO" options={TYPES.map((id) => ({ id, label: typeLabel(id), icon:TYPE_ICON_FILES[id === 'fighting' ? 'fight' : id], color:TYPE_COLORS[id] }))} selected={filters.types} onToggle={(value) => toggleFilter('types', value)} className="type-filter-group two-column-options" />
          <div className="filter-menu-footer"><span>{activeFilterCount ? `${activeFilterCount} FILTROS ACTIVOS` : 'MARCA UNA O VARIAS OPCIONES'}</span><button type="button" onClick={() => setFilters({ types:[], regions:[] })} disabled={!activeFilterCount}>LIMPIAR</button></div>
        </div>}
      </div>
      <label className="header-select sort-select"><span>ORDEN</span><select aria-label="Ordenar Pokémon" value={sort} onChange={(event) => setSort(event.target.value)}><option value="id">N.º nacional</option><option value="name">Nombre A–Z</option></select></label>
    </div>
  </header>;
}

function TypeBadge({ type }) {
  return <span className="type-badge" style={{ '--type-color': TYPE_COLORS[type] || '#526164' }}>{typeLabel(type)}</span>;
}

function MoveClassIcon({ damageClass }) {
  const labels = { physical:'Físico', special:'Especial', status:'Estado' };
  const images = { physical:physicalClassIcon, special:specialClassIcon, status:statusClassIcon };
  const label = labels[damageClass];
  if (!label) return null;
  return <img className="move-class-icon" src={images[damageClass]} alt={`Clase: ${label}`} title={label} draggable="false" />;
}

function latestPokemonIcon(pokemon, candidateIndex) {
  const generationEight = pokemon?.sprites?.versions?.['generation-viii'];
  const candidates = [
    generationEight?.['sword-shield']?.icons?.front_default,
    generationEight?.icons?.front_default,
    pokemon?.sprites?.versions?.['generation-vii']?.icons?.front_default,
    pokemon?.sprites?.versions?.['generation-vi']?.icons?.front_default,
    pokemon?.sprites?.versions?.['generation-ix']?.['scarlet-violet']?.icons?.front_default,
  ].filter(Boolean);
  return candidateIndex === undefined ? candidates[0] || null : candidates[candidateIndex] || null;
}

function PokemonRow({ pokemon, detail, onPreview, onLoadPreview, onOpen }) {
  const iconCandidates = [...new Set([0, 1, 2, 3, 4].map((index) => latestPokemonIcon(detail, index)).filter(Boolean))];
  const iconSignature = iconCandidates.join('|');
  const [iconState, setIconState] = useState({ signature:'', failedCount:0 });
  const failedCount = iconState.signature === iconSignature ? iconState.failedCount : 0;
  const iconFailed = failedCount >= iconCandidates.length;
  const icon = iconCandidates[Math.min(failedCount, iconCandidates.length - 1)];
  return <article className="pokemon-row" tabIndex="0" role="button" aria-label={`Ver ficha de ${pokemon.name}`}
    onMouseEnter={() => { onPreview(pokemon); onLoadPreview(pokemon); }} onMouseLeave={() => onPreview(null)}
    onFocus={() => { onPreview(pokemon); onLoadPreview(pokemon); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null); }}
    onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}>
    <span className="row-sprite"><img loading="lazy" src={icon || undefined} alt="" style={iconFailed ? { visibility:'hidden' } : undefined} onError={() => setIconState({ signature:iconSignature, failedCount:Math.min(failedCount + 1, iconCandidates.length) })} /></span>
    <span className="row-number">{padId(pokemon.id)}</span>
    <span className="row-name">{pokemon.name}</span>
    <span className="row-types">{detail ? detail.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) : <span className="type-loading">CARGANDO…</span>}</span>
  </article>;
}

function PreviewPanel({ pokemon, detail }) {
  if (!pokemon) return <aside className="preview-panel empty-preview" aria-live="polite">
    <div className="preview-decoration" aria-hidden="true"><span className="preview-ring ring-one" /><span className="preview-ring ring-two" /><div className="preview-ball"><div className="preview-ball-top" /><div className="preview-ball-middle"><i /></div><div className="preview-ball-bottom" /></div><span className="preview-plus plus-one">＋</span><span className="preview-plus plus-two">＋</span></div>
    <p className="preview-hint">ELIGE UN POKÉMON</p>
    <span className="preview-caption">PASA EL CURSOR SOBRE UN REGISTRO</span>
  </aside>;

  return <aside className="preview-panel pokemon-preview" aria-live="polite">
    <span className="preview-number">N.º {padId(pokemon.id)} / POKÉDEX NACIONAL</span>
    <div className="preview-artwork"><span className="preview-art-ring" /><img src={`${ARTWORK}/${pokemon.id}.png`} alt={`Ilustración de ${pokemon.name}`} /></div>
    <h2 className="preview-name">{pokemon.name}</h2>
    <div className="preview-types">{detail?.types.map(({ type }) => <TypeBadge key={type.name} type={type.name} />) || <span className="type-loading">CARGANDO TIPOS…</span>}</div>
    <span className="preview-caption">VISTA PREVIA · HAZ CLIC PARA VER LA FICHA</span>
  </aside>;
}

function DexScreen({ pokemon, details, loading, error, query, filters, setFilters, sort, onHome, setQuery, setSort, onOpen, onRetry, onLoadPreview }) {
  const [preview, setPreview] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef(null);
  const pageLock = useRef(false);
  const filterRequest = useRef(0);
  const [typeMembers, setTypeMembers] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase().replace(/^#/, '');
    let list = pokemon.filter((item) => !normalizedQuery || item.name.includes(normalizedQuery) || String(item.id).padStart(4, '0').includes(normalizedQuery) || String(item.id) === normalizedQuery);
    if (filters.regions.length) list = list.filter((item) => filters.regions.some((id) => { const region = DEX_REGIONS.find((entry) => entry.id === id); return region && item.id >= region.min && item.id <= region.max; }));
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (filters.types.length && typeMembers) list = list.filter((item) => typeMembers.has(item.id));
    return list;
  }, [pokemon, query, sort, filters, typeMembers]);
  const shown = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query, filters, sort]);
  useEffect(() => { pageLock.current = false; }, [visibleCount]);
  useEffect(() => { setPreview(null); }, [query, filters, sort]);
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
  useEffect(() => {
    if (!loading && !error) shown.forEach(onLoadPreview);
  }, [shown, loading, error, onLoadPreview]);
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

const STAT_LABELS = { hp:'PS', attack:'ATAQUE', defense:'DEFENSA', 'special-attack':'AT. ESP.', 'special-defense':'DEF. ESP.', speed:'VELOCIDAD' };
const STAT_ICONS = { hp:hpStatIcon, attack:attackStatIcon, defense:defenseStatIcon, 'special-attack':specialAttackStatIcon, 'special-defense':specialDefenseStatIcon, speed:speedStatIcon };
function StatIcon({ stat }) {
  return <span className="stat-icon" style={{ '--stat-icon-mask': `url("${STAT_ICONS[stat]}")` }} aria-hidden="true" />;
}

const ROMAN_GENERATIONS = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9 };

function latestGenerationSprite(pokemon, shiny = false) {
  const spriteKey = shiny ? 'front_shiny' : 'front_default';
  const generations = Object.entries(pokemon?.sprites?.versions || {})
    .map(([name, games]) => ({ name, games, number: ROMAN_GENERATIONS[name.replace('generation-', '')] || 0 }))
    .filter(({ number }) => number >= 6 && number <= 8)
    .sort((a, b) => b.number - a.number);
  const findFrontSprite = ({ name: generation, games }) => {
    const image = Object.entries(games || {})
      .filter(([key]) => key !== 'icons')
      .map(([, game]) => game?.[spriteKey])
      .find(Boolean);
    if (image) return { url: image, generation };
    return null;
  };
  for (const version of generations) {
    const sprite = findFrontSprite(version);
    if (sprite) return sprite;
  }

  const generationNine = pokemon?.sprites?.versions?.['generation-ix'];
  const legendsZaSprite = generationNine?.['legends-za']?.[spriteKey];
  if (legendsZaSprite) return { url: legendsZaSprite, generation: 'generation-ix' };

  const scarletVioletSprite = generationNine?.['scarlet-violet']?.[spriteKey];
  if (scarletVioletSprite) return { url: scarletVioletSprite, generation: 'generation-ix' };

  // Recent forms may have no VI–VIII or Scarlet/Violet model. Try other Gen IX games last.
  const fallback = findFrontSprite({ name: 'generation-ix', games: generationNine });
  if (fallback) return fallback;

  return null;
}

function pokemonImage(pokemon, mode, shiny = false) {
  const sprites = pokemon?.sprites;
  if (!sprites) return '';
  if (mode === '3d') return latestGenerationSprite(pokemon, shiny)?.url || '';
  const genFive = sprites.versions?.['generation-v']?.['black-white'];
  if (shiny) return genFive?.front_shiny || sprites.front_shiny || '';
  if (genFive?.front_default) return genFive.front_default;
  return sprites.front_default || '';
}

function hasGenerationFiveSprite(pokemon, shiny = false) {
  const sprite = pokemon?.sprites?.versions?.['generation-v']?.['black-white'];
  return Boolean(shiny ? sprite?.front_shiny : sprite?.front_default);
}

function latestSpriteGenerationLabel(pokemon, shiny = false) {
  return latestGenerationSprite(pokemon, shiny)?.generation?.replace('generation-', '').toUpperCase() || '3D';
}

function getLatestFlavorText(species, languages) {
  const entries = (species?.flavor_text_entries || []).filter((entry) => languages.includes(entry.language.name));
  if (!entries.length) return null;
  const versionNumber = (entry) => Number(entry.version?.url?.match(/\/(\d+)\/?$/)?.[1] || 0);
  const latestVersion = Math.max(...entries.map(versionNumber));
  const latestEntries = entries.filter((entry) => versionNumber(entry) === latestVersion);
  const chosen = latestEntries.find((entry) => entry.language.name === languages[0]) || latestEntries[0];
  return chosen.flavor_text.replace(/[\n\f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function spanishFlavorText(species) {
  const spanish = getLatestFlavorText(species, ['es', 'es-419']);
  if (spanish) return { text: spanish, translated: false, loading: false };
  const english = getLatestFlavorText(species, ['en']);
  return english
    ? { text: english, translated: false, loading: false, hasEnglishFallback: true, englishText: english }
    : { text: 'Una especie registrada en la Pokédex nacional.', translated: false, loading: false };
}

async function translateFlavorText(text, signal) {
  const cacheKey = `masterdex-flavor-es:${text}`;
  let cached = null;
  try { cached = localStorage.getItem(cacheKey); } catch { /* Storage may be disabled by the browser. */ }
  if (cached) return cached;
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.search = new URLSearchParams({ client: 'gtx', sl: 'en', tl: 'es', dt: 't', q: text }).toString();
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Translation service unavailable');
  const result = await response.json();
  const translated = (result[0] || []).map((part) => part[0]).filter(Boolean).join('').trim();
  if (!translated) throw new Error('Empty translation');
  try { localStorage.setItem(cacheKey, translated); } catch { /* Translation still works without persistent storage. */ }
  return translated;
}

function latestLevelMoves(pokemon) {
  const available = (pokemon?.moves || []).map((entry) => ({ entry, details: entry.version_group_details.filter((item) => item.move_learn_method.name === 'level-up') }))
    .filter(({ details }) => details.length);
  if (!available.length) return [];
  const versionId = (detail) => Number(detail.version_group.url.match(/\/(\d+)\/?$/)?.[1] || 0);
  const latestGroup = Math.max(...available.flatMap(({ details }) => details.map(versionId)));
  return available.map(({ entry, details }) => {
    const learned = details.filter((item) => versionId(item) === latestGroup).sort((a, b) => a.level_learned_at - b.level_learned_at)[0];
    return learned ? { name: entry.move.name, url: entry.move.url, level: learned.level_learned_at } : null;
  }).filter(Boolean).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

function humanizeSlug(value) { return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function formLabel(form, speciesName) {
  if (form.is_default) return 'Forma habitual';
  const name = form.pokemon.name;
  const speciesPrefix = `${speciesName}-`;
  const slug = name.startsWith(speciesPrefix) ? name.slice(speciesPrefix.length) : name;
  if (slug.split('-').includes('mega')) {
    const baseTokens = speciesName.split('-');
    const suffix = slug.split('-').filter((part) => part !== 'mega' && !baseTokens.includes(part)).join('-');
    return `Mega ${humanizeSlug(speciesName)}${suffix ? ` ${humanizeSlug(suffix)}` : ''}`;
  }
  if (slug.includes('gmax') || slug.includes('gigantamax')) return 'Gigamax';
  if (slug.includes('primal')) return `Forma primigenia de ${humanizeSlug(speciesName)}`;
  const region = ['alola', 'galar', 'hisui', 'paldea'].find((name) => slug.includes(name));
  if (region) return `Forma de ${humanizeSlug(region)}`;
  return `${humanizeSlug(speciesName)} ${humanizeSlug(slug)}`;
}

function evolutionRequirement(child) {
  const detail = child.evolution_details?.[0];
  if (!detail) return 'EVOLUCIONA';
  if (detail.min_level) return `NIVEL ${detail.min_level}`;
  if (detail.item?.name) return humanizeSlug(detail.item.name);
  if (detail.min_happiness) return 'AMISTAD';
  if (detail.time_of_day) return detail.time_of_day === 'day' ? 'DE DÍA' : 'DE NOCHE';
  if (detail.trigger?.name === 'trade') return 'INTERCAMBIO';
  if (detail.trigger?.name) return humanizeSlug(detail.trigger.name).toUpperCase();
  return 'EVOLUCIONA';
}

function EvolutionBranch({ node, selectedId, onOpen }) {
  const id = Number(node.species.url.match(/\/pokemon-species\/(\d+)\//)?.[1] || 0);
  const selected = id === selectedId;
  return <div className="evolution-branch">
    <button className={`evolution-entry${selected ? ' is-current' : ''}`} onClick={() => onOpen(id)} aria-label={`Abrir ficha de ${node.species.name}`}>
      <img loading="lazy" src={`${ARTWORK}/${id}.png`} alt="" />
      <span>N.º {padId(id)}</span><strong>{humanizeSlug(node.species.name)}</strong>
    </button>
    {node.evolves_to?.length > 0 && <div className="evolution-children">{node.evolves_to.map((child) => <div className="evolution-path" key={child.species.name}><div className="evolution-link"><span className="evolution-arrow" aria-hidden="true">→</span><span>{evolutionRequirement(child)}</span></div><EvolutionBranch node={child} selectedId={selectedId} onOpen={onOpen} /></div>)}</div>}
  </div>;
}

function PokemonDetailPage({ pokemon, cachedDetail, loading, onBack, onOpen }) {
  const [detail, setDetail] = useState(cachedDetail || null);
  const [species, setSpecies] = useState(null);
  const [evolution, setEvolution] = useState(null);
  const [forms, setForms] = useState([]);
  const [abilityNames, setAbilityNames] = useState({});
  const [moveDetails, setMoveDetails] = useState({});
  const [selectedForm, setSelectedForm] = useState(null);
  const [viewMode, setViewMode] = useState('2d');
  const [isShiny, setIsShiny] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [error, setError] = useState(false);
  const [descriptionData, setDescriptionData] = useState({ text: 'Una especie registrada en la Pokédex nacional.', translated: false, loading: false });
  const [descriptionTranslation, setDescriptionTranslation] = useState(null);
  const [showOriginalDescription, setShowOriginalDescription] = useState(false);
  const descriptionTranslationController = useRef(null);

  useEffect(() => {
    if (!pokemon) return undefined;
    const controller = new AbortController();
    setDetail(cachedDetail || null); setSpecies(null); setEvolution(null); setForms([]); setAbilityNames({}); setMoveDetails({}); setSelectedForm(null); setImageLoadFailed(false); setError(false);
    const getDetail = cachedDetail ? Promise.resolve(cachedDetail) : fetch(pokemon.url, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json(); });
    getDetail.then(async (data) => {
      setDetail(data);
      const speciesResponse = await fetch(data.species.url, { signal: controller.signal });
      if (!speciesResponse.ok) throw new Error();
      const speciesData = await speciesResponse.json();
      if (controller.signal.aborted) return;
      setSpecies(speciesData);

      const varietyRequests = (speciesData.varieties || []).map(async (variety) => {
        if (variety.is_default || variety.pokemon.name === data.name) return { ...variety, data };
        const response = await fetch(variety.pokemon.url, { signal: controller.signal });
        if (!response.ok) throw new Error();
        return { ...variety, data: await response.json() };
      });
      const chainRequest = speciesData.evolution_chain?.url
        ? fetch(speciesData.evolution_chain.url, { signal: controller.signal }).then((response) => response.ok ? response.json() : null)
        : Promise.resolve(null);
      const [varietyResults, chainData] = await Promise.all([
        Promise.allSettled(varietyRequests), chainRequest.catch(() => null),
      ]);
      if (controller.signal.aborted) return;
      const loadedForms = varietyResults.filter((result) => result.status === 'fulfilled').map((result) => result.value);
      if (!loadedForms.some((form) => form.is_default)) loadedForms.unshift({ is_default: true, pokemon: { name: data.name }, data });
      setForms(loadedForms);
      setEvolution(chainData?.chain || null);

      const abilities = [...new Map(loadedForms.flatMap((form) => form.data.abilities || []).map((item) => [item.ability.name, item.ability])).values()];
      const abilityResults = await Promise.allSettled(abilities.map(async (ability) => {
        const response = await fetch(ability.url, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const abilityData = await response.json();
        const localized = abilityData.names.find((name) => name.language.name === 'es') || abilityData.names.find((name) => name.language.name === 'es-419');
        return [ability.name, localized?.name || humanizeSlug(ability.name)];
      }));
      if (!controller.signal.aborted) setAbilityNames(Object.fromEntries(abilityResults.filter((result) => result.status === 'fulfilled').map((result) => result.value)));
    }).catch((reason) => { if (reason.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [pokemon, cachedDetail]);

  useEffect(() => {
    descriptionTranslationController.current?.abort();
    const source = spanishFlavorText(species);
    setDescriptionData(source);
    setDescriptionTranslation(null);
    setShowOriginalDescription(false);
    return () => descriptionTranslationController.current?.abort();
  }, [species]);

  const requestDescriptionTranslation = useCallback(async () => {
    if (!descriptionData.hasEnglishFallback || descriptionTranslation?.loading) return;
    const controller = new AbortController();
    descriptionTranslationController.current = controller;
    setDescriptionTranslation({ loading: true, text: '' });
    try {
      const text = await translateFlavorText(descriptionData.englishText, controller.signal);
      if (controller.signal.aborted) return;
      setDescriptionTranslation({ loading: false, text, error: false });
    } catch {
      if (!controller.signal.aborted) setDescriptionTranslation({ loading: false, text: '', error: true });
    }
  }, [descriptionData, descriptionTranslation]);

  useEffect(() => {
    if (!detail) return undefined;
    const controller = new AbortController();
    const movesToLoad = latestLevelMoves(detail).filter((move) => !MOVE_INFO_CACHE.has(move.name));
    let nextIndex = 0;
    async function loadMoveDetails() {
      const workers = Array.from({ length: Math.min(6, movesToLoad.length) }, async () => {
        while (nextIndex < movesToLoad.length && !controller.signal.aborted) {
          const move = movesToLoad[nextIndex++];
          try {
            const response = await fetch(move.url, { signal: controller.signal });
            if (!response.ok) continue;
            const data = await response.json();
            const localized = data.names.find((entry) => entry.language.name === 'es') || data.names.find((entry) => entry.language.name === 'es-419');
            const info = { name: localized?.name || humanizeSlug(move.name), type: data.type.name, damageClass: data.damage_class.name };
            MOVE_INFO_CACHE.set(move.name, info);
          } catch (reason) { if (reason.name === 'AbortError') return; }
        }
      });
      await Promise.all(workers);
      if (!controller.signal.aborted) setMoveDetails(Object.fromEntries(latestLevelMoves(detail).filter((move) => MOVE_INFO_CACHE.has(move.name)).map((move) => [move.name, MOVE_INFO_CACHE.get(move.name)])));
    }
    setMoveDetails(Object.fromEntries(latestLevelMoves(detail).filter((move) => MOVE_INFO_CACHE.has(move.name)).map((move) => [move.name, MOVE_INFO_CACHE.get(move.name)])));
    loadMoveDetails();
    return () => controller.abort();
  }, [detail]);

  const activeForm = forms.find((form) => form.pokemon.name === selectedForm) || forms.find((form) => form.is_default);
  const selectedData = activeForm?.data || detail;
  const displayImage = pokemonImage(selectedData, viewMode, isShiny);
  const visibleForms = species?.name === 'zygarde'
    ? forms
      .filter((form) => !form.pokemon.name.endsWith('-power-construct'))
      .sort((a, b) => {
        const order = (form) => form.is_default ? 0 : form.pokemon.name.includes('-10') ? 1 : form.pokemon.name.includes('complete') ? 2 : form.pokemon.name.includes('mega') ? 3 : 4;
        return order(a) - order(b);
      })
    : forms;
  useEffect(() => setImageLoadFailed(false), [displayImage]);
  useEffect(() => setIsShiny(false), [pokemon?.id, selectedForm]);
  const dexNumber = species?.pokedex_numbers?.find((entry) => entry.pokedex.name === 'national')?.entry_number || species?.id || pokemon?.id || 0;
  const moves = latestLevelMoves(detail);
  const description = descriptionData;
  const selectedAbilities = selectedData?.abilities || detail?.abilities || [];

  return <>
    <header className="topbar detail-topbar"><Brand onHome={onBack} /></header>
    <main className="detail-screen">
      <button className="back-button" onClick={onBack}><span aria-hidden="true">←</span> VOLVER A LA POKÉDEX</button>
      {loading && !pokemon && <div className="loading-state detail-loading"><span className="loader" /><span>CARGANDO POKÉDEX…</span></div>}
      {!loading && !pokemon && <div className="error-state detail-error">NO SE ENCONTRÓ ESA ESPECIE.</div>}
      {pokemon && !detail && !error && <div className="loading-state detail-loading"><span className="loader" /><span>CARGANDO FICHA…</span></div>}
      {error && <div className="error-state detail-error">NO SE PUDO CARGAR LA FICHA. INTÉNTALO DE NUEVO.</div>}
      {pokemon && detail && <>
        {visibleForms.length > 1 && <nav className="detail-form-selector" aria-label="Formas y variantes">
          <h2 className="detail-section-title">FORMAS Y VARIANTES</h2>
          <div className="form-options" role="group" aria-label="Seleccionar forma del Pokémon">{visibleForms.map((form) => {
            const icon = latestPokemonIcon(form.data) || pokemonImage(form.data, '2d') || latestGenerationSprite(form.data)?.url;
            return <button key={form.pokemon.name} className={`form-option${activeForm?.pokemon.name === form.pokemon.name ? ' selected' : ''}`} onClick={() => setSelectedForm(form.pokemon.name)} aria-pressed={activeForm?.pokemon.name === form.pokemon.name}>
              <img loading="lazy" src={icon} alt="" /><span>{formLabel(form, species?.name || pokemon.name)}</span>
            </button>;
          })}</div>
        </nav>}
        <section className="detail-hero" aria-labelledby="detail-name">
          <div className="detail-visual-column">
            <div className={`detail-page-art${viewMode === '2d' ? ' is-pixel-art' : ' is-3d-sprite'}`}>
              <span className="detail-art-grid" />
              <div className="detail-view-toggle" role="group" aria-label="Vista de imagen">
                <button className={viewMode === '2d' ? 'selected' : ''} onClick={() => setViewMode('2d')}>2D</button>
                <button className={viewMode === '3d' ? 'selected' : ''} onClick={() => setViewMode('3d')}>3D</button>
              </div>
              {displayImage && !imageLoadFailed ? <img src={displayImage} alt={`${isShiny ? 'Shiny · ' : ''}${viewMode === '3d' ? 'Render 3D' : 'Sprite 2D'} de ${selectedData?.name || pokemon.name}`} onError={() => setImageLoadFailed(true)} /> : <span className="detail-image-missing">{isShiny ? `SHINY ${viewMode === '3d' ? '3D' : '2D'} NO DISPONIBLE` : viewMode === '3d' ? 'RENDER 3D NO DISPONIBLE' : 'SPRITE 2D NO DISPONIBLE'}</span>}
              <span className="detail-art-number">N.º {padId(dexNumber)} / POKÉDEX NACIONAL</span>
              <button type="button" className={`shiny-toggle${isShiny ? ' is-active' : ''}`} aria-pressed={isShiny} onClick={() => setIsShiny((current) => !current)}><SparkleIcon /><span>SHINY</span></button>
              {(viewMode === '3d' || (displayImage && !imageLoadFailed)) && <span className="detail-art-note">{viewMode === '3d' ? `SPRITE 3D${isShiny ? ' SHINY' : ''} · GENERACIÓN ${latestSpriteGenerationLabel(selectedData, isShiny)}` : `SPRITE 2D${isShiny ? ' SHINY' : ''} · ${hasGenerationFiveSprite(selectedData, isShiny) ? 'GENERACIÓN V' : 'DISPONIBLE'}`}</span>}
            </div>
            <section className="detail-info-panel abilities-panel"><h2 className="detail-section-title">HABILIDADES</h2><div className="ability-list">{selectedAbilities.map(({ ability, is_hidden }) => <div className={`ability-entry${is_hidden ? ' is-hidden' : ''}`} key={ability.name}><strong>{abilityNames[ability.name] || humanizeSlug(ability.name)}</strong><span>{is_hidden ? 'HABILIDAD OCULTA' : 'HABILIDAD'}</span></div>)}</div></section>
          </div>
          <div className="detail-overview">
            <p className="eyebrow"><span className="eyebrow-line" /> POKÉDEX NACIONAL / {padId(dexNumber)}</p>
            <h1 id="detail-name">{species?.names?.find((entry) => entry.language.name === 'es')?.name || pokemon.name}</h1>
            {activeForm && !activeForm.is_default && <p className="detail-current-form">{formLabel(activeForm, species?.name || pokemon.name)}</p>}
            <div className="detail-types">{(selectedData?.types || detail.types).map(({ type }) => <TypeBadge key={type.name} type={type.name} />)}</div>
            <h2 className="detail-section-title">DESCRIPCIÓN</h2>
            <p className="detail-description">{descriptionTranslation?.text && !showOriginalDescription ? descriptionTranslation.text : description.text}</p>
            {description.hasEnglishFallback && <div className="description-translation-controls">
              {descriptionTranslation?.text && !showOriginalDescription
                ? <><span className="description-translation-note">TRADUCIDO DEL INGLÉS</span><button className="description-translation-toggle" onClick={() => setShowOriginalDescription(true)}>MOSTRAR ORIGINAL</button></>
                : <><span className="description-translation-note">TEXTO ORIGINAL EN INGLÉS</span>{descriptionTranslation?.text
                  ? <button className="description-translate-button" onClick={() => setShowOriginalDescription(false)}>
                    <SparkleIcon className="description-translate-sparkle" />MOSTRAR TRADUCCIÓN
                  </button>
                  : <button className="description-translate-button" onClick={requestDescriptionTranslation} disabled={descriptionTranslation?.loading}>
                <SparkleIcon className="description-translate-sparkle" />
                {descriptionTranslation?.loading ? 'TRADUCIENDO…' : 'MOSTRAR TRADUCCIÓN'}
              </button>}</>}
              {descriptionTranslation?.error && <span className="description-translation-error" role="status">No se pudo traducir. Inténtalo de nuevo.</span>}
            </div>}
            <div className="physical-facts"><div><span>ALTURA</span><strong>{(selectedData.height / 10).toFixed(1)} m</strong></div><div><span>PESO</span><strong>{(selectedData.weight / 10).toFixed(1)} kg</strong></div></div>
            <h2 className="detail-section-title stats-title">CARACTERÍSTICAS BASE</h2>
            <div className="detail-stats" role="table" aria-label="Características base">{Object.entries(STAT_LABELS).map(([key, label]) => {
              const value = selectedData.stats.find((stat) => stat.stat.name === key)?.base_stat ?? 0;
              const tier = value < 20 ? 'extreme-low' : value < 50 ? 'low' : value < 90 ? 'mid' : value < 150 ? 'high' : 'standout';
              return <div className={`stat-row stat-${key} stat-tier-${tier}`} key={key} role="row"><span className="stat-label"><i><StatIcon stat={key} /></i>{label}</span><strong>{value}</strong><div className="stat-track"><i style={{ width: `${Math.min(value / 255 * 100, 100)}%` }} /></div></div>;
            })}</div>
          </div>
        </section>
        <div className="detail-sections-grid">
          <div className="detail-column">
            <section className="detail-info-panel"><h2 className="detail-section-title">CADENA EVOLUTIVA</h2>{evolution ? <div className="evolution-chain-scroll"><EvolutionBranch node={evolution} selectedId={species?.id || pokemon.id} onOpen={onOpen} /></div> : <p className="detail-muted">Sin datos evolutivos disponibles.</p>}</section>
          </div>
          <section className="detail-info-panel moves-panel"><div className="moves-heading"><h2 className="detail-section-title">MOVIMIENTOS POR NIVEL</h2><span>{moves.length} MOV.</span></div>{moves.length ? <div className="level-moves"><table className="move-table"><thead><tr><th>NIVEL</th><th>MOVIMIENTO</th><th>TIPO</th><th>CLASE</th></tr></thead><tbody>{moves.map((move) => {
            const info = moveDetails[move.name] || MOVE_INFO_CACHE.get(move.name);
            return <tr key={move.name}><td>{move.level === 0 ? '—' : move.level}</td><td>{info?.name || humanizeSlug(move.name)}</td><td>{info?.type ? <TypeBadge type={info.type} /> : '—'}</td><td>{info?.damageClass ? <MoveClassIcon damageClass={info.damageClass} /> : '—'}</td></tr>;
          })}</tbody></table></div> : <p className="detail-muted">No hay movimientos por nivel registrados.</p>}</section>
        </div>
      </>}
    </main>
  </>;
}

function App() {
  const [allPokemon, setAllPokemon] = useState([]);
  const [details, setDetails] = useState({});
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('id');
  const [filters, setFilters] = useState({ types:[], regions:[] });
  const [routeId, setRouteId] = useState(readPokemonRoute);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const detailRequests = useRef(new Map());
  const detailsRef = useRef(details);
  detailsRef.current = details;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/pokemon?limit=1025`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data) => setAllPokemon(data.results.map((pokemon, index) => ({ id: index + 1, name: pokemon.name, url: pokemon.url }))))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retryKey]);

  useEffect(() => {
    const onPopState = () => setRouteId(readPokemonRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function openPokemon(id) {
    window.history.pushState({}, '', `/pokemon/${id}`);
    setRouteId(id);
    window.scrollTo(0, 0);
  }
  function goHome() {
    if (routeId === null) { window.scrollTo(0, 0); return; }
    window.history.pushState({}, '', '/');
    setRouteId(null);
    window.scrollTo(0, 0);
  }
  function retry() { setError(false); setLoading(true); setRetryKey((key) => key + 1); }
  const loadPreview = useCallback((pokemon) => {
    if (detailsRef.current[pokemon.id] || detailRequests.current.has(pokemon.id)) return;
    const request = fetch(pokemon.url).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((detail) => {
      setDetails((current) => ({ ...current, [pokemon.id]: detail }));
      return detail;
    }).catch(() => null).finally(() => detailRequests.current.delete(pokemon.id));
    detailRequests.current.set(pokemon.id, request);
  }, []);

  const selectedPokemon = routeId === null ? null : allPokemon.find((item) => item.id === routeId) || null;
  return routeId === null
    ? <DexScreen pokemon={allPokemon} details={details} loading={loading} error={error} query={query} filters={filters} setFilters={setFilters} sort={sort} onHome={goHome} setQuery={setQuery} setSort={setSort} onOpen={openPokemon} onRetry={retry} onLoadPreview={loadPreview} />
    : <PokemonDetailPage pokemon={selectedPokemon} cachedDetail={details[routeId]} loading={loading} onBack={goHome} onOpen={openPokemon} />;
}

export default App;
