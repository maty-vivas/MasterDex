import { useCallback, useEffect, useRef, useState } from 'react';
import { ARTWORK, MOVE_INFO_CACHE, STAT_LABELS } from '../data/constants.js';
import Brand from '../components/Brand.jsx';
import MoveClassIcon from '../components/MoveClassIcon.jsx';
import SparkleIcon from '../components/SparkleIcon.jsx';
import TypeBadge from '../components/TypeBadge.jsx';
import EvolutionBranch from '../components/EvolutionBranch.jsx';
import StatIcon from '../components/StatIcon.jsx';
import TypeEffectiveness from '../components/TypeEffectiveness.jsx';
import abilityInfoIcon from '../assets/ability-info.svg';
import { abilityDescription, eggGroupLabel, formLabel, habitatLabel, hasGenerationFiveSprite, humanizeSlug, latestGenerationSprite, latestLevelMoves, latestPokemonIcon, latestSpriteGenerationLabel, padId, pokemonImage, spanishFlavorText, translateTextToSpanish } from '../utils/pokemon.js';

/** Ficha de especie: coordina sus datos remotos y presenta formas, arte y estadísticas. */
export default function PokemonDetailPage({ pokemon, cachedDetail, loading, viewMode, setViewMode, onBack, onOpen }) {
  // Datos de PokéAPI que alimentan secciones distintas de la ficha.
  const [detail, setDetail] = useState(cachedDetail || null);
  const [species, setSpecies] = useState(null);
  const [evolution, setEvolution] = useState(null);
  const [forms, setForms] = useState([]);
  const [abilityDetails, setAbilityDetails] = useState({});
  const [abilityTranslations, setAbilityTranslations] = useState({});
  const [moveDetails, setMoveDetails] = useState({});

  // La forma y la variante Shiny son locales; el modo 2D/3D se conserva en el estado global.
  const [selectedForm, setSelectedForm] = useState(null);
  const [expandedAbility, setExpandedAbility] = useState(null);
  const [isShiny, setIsShiny] = useState(false);
  const [imageLoad, setImageLoad] = useState({ src: '', status: 'idle' });
  const [error, setError] = useState(false);
  const [descriptionData, setDescriptionData] = useState({ text: 'Una especie registrada en la Pokédex nacional.', translated: false, loading: false });
  const [descriptionTranslation, setDescriptionTranslation] = useState(null);
  const [showOriginalDescription, setShowOriginalDescription] = useState(false);
  const descriptionTranslationController = useRef(null);
  const abilityTranslationControllers = useRef(new Map());
  const abilityPopoverRef = useRef(null);

  // Cierra la descripción flotante al interactuar fuera de su tarjeta o pulsar Escape.
  useEffect(() => {
    if (!expandedAbility) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!abilityPopoverRef.current?.contains(event.target)) setExpandedAbility(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setExpandedAbility(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [expandedAbility]);

  // Al cambiar de especie, carga su registro y especie; luego obtiene en paralelo
  // las variedades y la cadena evolutiva para que un fallo individual no bloquee toda la ficha.
  useEffect(() => {
    if (!pokemon) return undefined;
    const controller = new AbortController();
    abilityTranslationControllers.current.forEach((translationController) => translationController.abort());
    abilityTranslationControllers.current.clear();
    setDetail(cachedDetail || null); setSpecies(null); setEvolution(null); setForms([]); setAbilityDetails({}); setAbilityTranslations({}); setMoveDetails({}); setSelectedForm(null); setExpandedAbility(null); setError(false);
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
      // Conserva las formas que sí cargaron y garantiza que la forma habitual esté disponible.
      const loadedForms = varietyResults.filter((result) => result.status === 'fulfilled').map((result) => result.value);
      if (!loadedForms.some((form) => form.is_default)) loadedForms.unshift({ is_default: true, pokemon: { name: data.name }, data });
      setForms(loadedForms);
      setEvolution(chainData?.chain || null);

      // Agrupa habilidades de todas las formas por slug para traducir cada una una sola vez.
      const abilities = [...new Map(loadedForms.flatMap((form) => form.data.abilities || []).map((item) => [item.ability.name, item.ability])).values()];
      const abilityResults = await Promise.allSettled(abilities.map(async (ability) => {
        const response = await fetch(ability.url, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const abilityData = await response.json();
        const localized = abilityData.names.find((name) => name.language.name === 'es') || abilityData.names.find((name) => name.language.name === 'es-419');
        return [ability.name, { name:localized?.name || humanizeSlug(ability.name), ...abilityDescription(abilityData) }];
      }));
      if (!controller.signal.aborted) setAbilityDetails(Object.fromEntries(abilityResults.filter((result) => result.status === 'fulfilled').map((result) => result.value)));
    }).catch((reason) => { if (reason.name !== 'AbortError') setError(true); });
    return () => {
      controller.abort();
      abilityTranslationControllers.current.forEach((translationController) => translationController.abort());
      abilityTranslationControllers.current.clear();
    };
  }, [pokemon, cachedDetail]);

  // Recalcula la descripción al cambiar de especie y cancela cualquier traducción anterior.
  useEffect(() => {
    descriptionTranslationController.current?.abort();
    const source = spanishFlavorText(species);
    setDescriptionData(source);
    setDescriptionTranslation(null);
    setShowOriginalDescription(false);
    return () => descriptionTranslationController.current?.abort();
  }, [species]);

  // La traducción solo se solicita al pulsar el botón; el helper reutiliza la caché local.
  const requestDescriptionTranslation = useCallback(async () => {
    if (!descriptionData.hasEnglishFallback || descriptionTranslation?.loading) return;
    const controller = new AbortController();
    descriptionTranslationController.current = controller;
    setDescriptionTranslation({ loading: true, text: '' });
    try {
      const text = await translateTextToSpanish(descriptionData.englishText, controller.signal);
      if (controller.signal.aborted) return;
      setDescriptionTranslation({ loading: false, text, error: false });
    } catch {
      if (!controller.signal.aborted) setDescriptionTranslation({ loading: false, text: '', error: true });
    }
  }, [descriptionData, descriptionTranslation]);

  // Traduce una habilidad solo al solicitarlo; guarda el resultado por texto en localStorage.
  const requestAbilityTranslation = useCallback(async (abilityName, text) => {
    const current = abilityTranslations[abilityName];
    if (current?.text || current?.loading) return;
    const controller = new AbortController();
    abilityTranslationControllers.current.set(abilityName, controller);
    setAbilityTranslations((previous) => ({ ...previous, [abilityName]: { ...previous[abilityName], loading: true, error: false } }));
    try {
      const translatedText = await translateTextToSpanish(text, controller.signal);
      if (controller.signal.aborted) return;
      setAbilityTranslations((previous) => ({ ...previous, [abilityName]: { loading: false, error: false, text: translatedText, showOriginal: false } }));
    } catch {
      if (!controller.signal.aborted) setAbilityTranslations((previous) => ({ ...previous, [abilityName]: { ...previous[abilityName], loading: false, error: true } }));
    } finally {
      if (abilityTranslationControllers.current.get(abilityName) === controller) abilityTranslationControllers.current.delete(abilityName);
    }
  }, [abilityTranslations]);

  // Completa los movimientos con nombre español, tipo y clase; seis workers limitan solicitudes simultáneas.
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

  // Resuelve la forma activa y de ella derivan imagen, tipos, habilidades y medidas.
  const activeForm = forms.find((form) => form.pokemon.name === selectedForm) || forms.find((form) => form.is_default);
  const selectedData = activeForm?.data || detail;
  const displayImage = pokemonImage(selectedData, viewMode, isShiny);
  const imageLoadStatus = imageLoad.src === displayImage ? imageLoad.status : displayImage ? 'loading' : 'missing';
  const imageLoadFailed = imageLoadStatus === 'error';
  // Zygarde trae variantes redundantes de Power Construct; se ocultan y ordenan solo en la pestaña.
  const visibleForms = species?.name === 'zygarde'
    ? forms
      .filter((form) => !form.pokemon.name.endsWith('-power-construct'))
      .sort((a, b) => {
        const order = (form) => form.is_default ? 0 : form.pokemon.name.includes('-10') ? 1 : form.pokemon.name.includes('complete') ? 2 : form.pokemon.name.includes('mega') ? 3 : 4;
        return order(a) - order(b);
      })
    : forms;
  useEffect(() => setIsShiny(false), [pokemon?.id, selectedForm]);
  const dexNumber = species?.pokedex_numbers?.find((entry) => entry.pokedex.name === 'national')?.entry_number || species?.id || pokemon?.id || 0;
  const moves = latestLevelMoves(detail);
  const description = descriptionData;
  const selectedAbilities = selectedData?.abilities || detail?.abilities || [];

  return <>
    <header className="topbar detail-topbar"><Brand onHome={onBack} /></header>
    <main className="detail-screen">
      <button type="button" className="back-button" onClick={onBack}><span aria-hidden="true">←</span> VOLVER A LA POKÉDEX</button>
      {loading && !pokemon && <div className="loading-state detail-loading"><span className="loader" /><span>CARGANDO POKÉDEX…</span></div>}
      {!loading && !pokemon && <div className="error-state detail-error">NO SE ENCONTRÓ ESA ESPECIE.</div>}
      {pokemon && !detail && !error && <div className="loading-state detail-loading"><span className="loader" /><span>CARGANDO FICHA…</span></div>}
      {error && <div className="error-state detail-error">NO SE PUDO CARGAR LA FICHA. INTÉNTALO DE NUEVO.</div>}
      {pokemon && detail && <>
        {/* Selector superior de formas: las miniaturas priorizan icono y usan sprite como respaldo. */}
        {visibleForms.length > 1 && <nav className="detail-form-selector" aria-label="Formas y variantes">
          <h2 className="detail-section-title">FORMAS Y VARIANTES</h2>
          <div className="form-options" role="group" aria-label="Seleccionar forma del Pokémon">{visibleForms.map((form) => {
            const icon = latestPokemonIcon(form.data) || pokemonImage(form.data, '2d') || latestGenerationSprite(form.data)?.url;
            return <button key={form.pokemon.name} className={`form-option${activeForm?.pokemon.name === form.pokemon.name ? ' selected' : ''}`} onClick={() => setSelectedForm(form.pokemon.name)} aria-pressed={activeForm?.pokemon.name === form.pokemon.name}>
              <img loading="lazy" src={icon} alt="" /><span>{formLabel(form, species?.name || pokemon.name)}</span>
            </button>;
          })}</div>
        </nav>}
        {/* Zona principal: imagen 2D/3D y Shiny a la izquierda; datos descriptivos a la derecha. */}
        <section className="detail-hero" aria-labelledby="detail-name">
          <div className="detail-visual-column">
            <div className={`detail-page-art${viewMode === '2d' ? ' is-pixel-art' : ' is-3d-sprite'}`}>
              <span className="detail-art-grid" />
              <button type="button" className="detail-view-toggle" data-mode={viewMode} aria-label="Alternar vista 2D/3D" aria-pressed={viewMode === '3d'} onClick={() => setViewMode((current) => current === '2d' ? '3d' : '2d')}>
                <span className={viewMode === '2d' ? 'is-active' : ''}>2D</span>
                <span className={viewMode === '3d' ? 'is-active' : ''}>3D</span>
              </button>
              {displayImage && !imageLoadFailed ? <>
                <img key={displayImage} className={`detail-sprite${imageLoadStatus === 'loaded' ? ' is-loaded' : ''}`} src={displayImage} alt={`${isShiny ? 'Shiny · ' : ''}${viewMode === '3d' ? 'Render 3D' : 'Sprite 2D'} de ${selectedData?.name || pokemon.name}`} onLoad={() => setImageLoad({ src: displayImage, status: 'loaded' })} onError={() => setImageLoad({ src: displayImage, status: 'error' })} />
                {imageLoadStatus === 'loading' && <span className="visual-resource-loader" role="status"><i className="loading-pokeball" aria-hidden="true" />CARGANDO {viewMode === '3d' ? 'SPRITE 3D' : 'SPRITE 2D'}…</span>}
              </> : <span className="detail-image-missing">{isShiny ? `SHINY ${viewMode === '3d' ? '3D' : '2D'} NO DISPONIBLE` : viewMode === '3d' ? 'RENDER 3D NO DISPONIBLE' : 'SPRITE 2D NO DISPONIBLE'}</span>}
              <span className="detail-art-number">N.º {padId(dexNumber)} / POKÉDEX NACIONAL</span>
              <button type="button" className={`shiny-toggle${isShiny ? ' is-active' : ''}`} aria-pressed={isShiny} onClick={() => setIsShiny((current) => !current)}><SparkleIcon /><span>SHINY</span></button>
              {(viewMode === '3d' || (displayImage && !imageLoadFailed)) && <span className="detail-art-note">{viewMode === '3d' ? `SPRITE 3D${isShiny ? ' SHINY' : ''} · GENERACIÓN ${latestSpriteGenerationLabel(selectedData, isShiny)}` : `SPRITE 2D${isShiny ? ' SHINY' : ''} · ${hasGenerationFiveSprite(selectedData, isShiny) ? 'GENERACIÓN V' : 'DISPONIBLE'}`}</span>}
            </div>
            <section className="detail-info-panel abilities-panel"><h2 className="detail-section-title">HABILIDADES</h2><div className="ability-list">{selectedAbilities.map(({ ability, is_hidden }) => {
              const isExpanded = expandedAbility === ability.name;
              const abilityInfo = abilityDetails[ability.name] || {};
              const abilityTranslation = abilityTranslations[ability.name];
              const abilityShowsTranslation = Boolean(abilityTranslation?.text && !abilityTranslation.showOriginal);
              const descriptionId = `ability-description-${ability.name}`;
              return <div ref={isExpanded ? abilityPopoverRef : null} className={`ability-card${is_hidden ? ' is-hidden' : ''}${isExpanded ? ' is-open' : ''}`} key={ability.name}>
                <button type="button" className={`ability-entry${is_hidden ? ' is-hidden' : ''}`} aria-expanded={isExpanded} aria-controls={isExpanded ? descriptionId : undefined} aria-describedby={isExpanded ? descriptionId : undefined} onClick={() => setExpandedAbility(isExpanded ? null : ability.name)}>
                  <strong>{abilityInfo.name || humanizeSlug(ability.name)}</strong>
                  <span className="ability-kind">{is_hidden ? 'HABILIDAD OCULTA' : 'HABILIDAD'}</span>
                </button>
                {isExpanded && <div className="ability-description" id={descriptionId} role="tooltip" aria-label={`Descripción de ${abilityInfo.name || humanizeSlug(ability.name)}`}>
                  <strong className="ability-description-heading"><img className="ability-info-icon" src={abilityInfoIcon} alt="" />Descripción</strong>
                  {abilityInfo.text ? <>
                    <p>{abilityShowsTranslation ? abilityTranslation.text : abilityInfo.text}</p>
                    {abilityInfo.language === 'en' && <div className="ability-description-controls">
                      {abilityShowsTranslation
                        ? <><span className="description-translation-note">TRADUCIDO DEL INGLÉS</span><button className="description-translation-toggle" onClick={() => setAbilityTranslations((previous) => ({ ...previous, [ability.name]: { ...previous[ability.name], showOriginal: true } }))}>MOSTRAR ORIGINAL</button></>
                        : <><span className="description-translation-note">TEXTO ORIGINAL EN INGLÉS</span><button className="description-translate-button" onClick={() => abilityTranslation?.text
                          ? setAbilityTranslations((previous) => ({ ...previous, [ability.name]: { ...previous[ability.name], showOriginal: false } }))
                          : requestAbilityTranslation(ability.name, abilityInfo.text)} disabled={abilityTranslation?.loading}>
                          <SparkleIcon className="description-translate-sparkle" />{abilityTranslation?.loading ? 'TRADUCIENDO…' : 'MOSTRAR TRADUCCIÓN'}
                        </button></>}
                      {abilityTranslation?.error && <span className="description-translation-error" role="status">No se pudo traducir. Inténtalo de nuevo.</span>}
                    </div>}
                  </> : <p>Descripción no disponible.</p>}
                </div>}
              </div>;
            })}</div></section>
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
            {species && <div className="species-ecology" aria-label="Grupo huevo y hábitat">
              <p><span>GRUPO HUEVO</span><strong>{species.egg_groups?.length ? species.egg_groups.map(({ name }) => eggGroupLabel(name)).join(' · ') : 'No especificado'}</strong></p>
              <p><span>HÁBITAT</span><strong>{species.habitat?.name ? habitatLabel(species.habitat.name) : 'No especificado'}</strong></p>
            </div>}
            <div className="physical-facts">
              <div><span>ALTURA</span><strong>{(selectedData.height / 10).toFixed(1)} m</strong></div>
              <div><span>PESO</span><strong>{(selectedData.weight / 10).toFixed(1)} kg</strong></div>
            </div>
            <h2 className="detail-section-title stats-title">CARACTERÍSTICAS BASE</h2>
            <div className="detail-stats" role="table" aria-label="Características base">{Object.entries(STAT_LABELS).map(([key, label]) => {
              const value = selectedData.stats.find((stat) => stat.stat.name === key)?.base_stat ?? 0;
              const tier = value < 20 ? 'extreme-low' : value < 50 ? 'low' : value < 90 ? 'mid' : value < 150 ? 'high' : 'standout';
              return <div className={`stat-row stat-${key} stat-tier-${tier}`} key={key} role="row"><span className="stat-label"><i><StatIcon stat={key} /></i>{label}</span><strong>{value}</strong><div className="stat-track"><i style={{ width: `${Math.min(value / 255 * 100, 100)}%` }} /></div></div>;
            })}</div>
          </div>
        </section>
        {/* Bloques complementarios que se mantienen bajo el panel principal en escritorio y móvil. */}
        <div className="detail-sections-grid">
          <section className="detail-info-panel"><h2 className="detail-section-title">CADENA EVOLUTIVA</h2>{evolution ? <div className="evolution-chain-scroll"><EvolutionBranch node={evolution} selectedId={species?.id || pokemon.id} onOpen={onOpen} /></div> : <p className="detail-muted">Sin datos evolutivos disponibles.</p>}</section>
          <div className="detail-analysis-grid">
            <TypeEffectiveness types={selectedData?.types || detail.types} />
            <section className="detail-info-panel moves-panel"><div className="moves-heading"><h2 className="detail-section-title">MOVIMIENTOS POR NIVEL</h2><span>{moves.length} MOV.</span></div>{moves.length ? <div className="level-moves"><table className="move-table"><thead><tr><th>NIVEL</th><th>MOVIMIENTO</th><th>TIPO</th><th>CLASE</th></tr></thead><tbody>{moves.map((move) => {
            const info = moveDetails[move.name] || MOVE_INFO_CACHE.get(move.name);
            return <tr key={move.name}><td>{move.level === 0 ? '—' : move.level}</td><td>{info?.name || humanizeSlug(move.name)}</td><td>{info?.type ? <TypeBadge type={info.type} /> : '—'}</td><td>{info?.damageClass ? <MoveClassIcon damageClass={info.damageClass} /> : '—'}</td></tr>;
          })}</tbody></table></div> : <p className="detail-muted">No hay movimientos por nivel registrados.</p>}</section>
          </div>
        </div>
      </>}
    </main>
  </>;
}
