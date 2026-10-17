import { ROMAN_GENERATIONS, TYPE_NAMES } from '../data/constants.js';

/** Formatea el número nacional con tres dígitos para filas, fichas y evoluciones. */
export function padId(id) { return String(id).padStart(3, '0'); }

/** Devuelve una etiqueta española conocida o conserva el valor como respaldo. */
export function typeLabel(type) { return TYPE_NAMES[type] || type.toUpperCase(); }

/** Lee una ruta interna directa, por ejemplo /pokemon/25, al iniciar la aplicación. */
export function readPokemonRoute() {
  const match = window.location.pathname.match(/^\/pokemon\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

/** Elige iconos de lista en el orden visual acordado y permite pedir un candidato alternativo tras un error. */
export function latestPokemonIcon(pokemon, candidateIndex) {
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

/** Busca un sprite 3D disponible: primero juegos de Gen VI–VIII y luego las fuentes recientes de Gen IX. */
export function latestGenerationSprite(pokemon, shiny = false) {
  const spriteKey = shiny ? 'front_shiny' : 'front_default';
  const generations = Object.entries(pokemon?.sprites?.versions || {})
    .map(([name, games]) => ({ name, games, number: ROMAN_GENERATIONS[name.replace('generation-', '')] || 0 }))
    .filter(({ number }) => number >= 6 && number <= 8)
    .sort((a, b) => b.number - a.number);
  // Algunos juegos guardan el sprite en rutas distintas; recorre los juegos de una generación hasta hallar uno.
  const findFrontSprite = ({ name: generation, games }) => {
    const image = Object.entries(games || {})
      .filter(([key]) => key !== 'icons')
      .map(([, game]) => game?.[spriteKey])
      .find(Boolean);
    if (image) return { url: image, generation };
    return null;
  };
  // Mantiene la preferencia por las generaciones anteriores cuando existen sus renders.
  for (const version of generations) {
    const sprite = findFrontSprite(version);
    if (sprite) return sprite;
  }

  const generationNine = pokemon?.sprites?.versions?.['generation-ix'];
  const legendsZaSprite = generationNine?.['legends-za']?.[spriteKey];
  if (legendsZaSprite) return { url: legendsZaSprite, generation: 'generation-ix' };

  const scarletVioletSprite = generationNine?.['scarlet-violet']?.[spriteKey];
  if (scarletVioletSprite) return { url: scarletVioletSprite, generation: 'generation-ix' };

  // Las formas recientes pueden carecer de recurso en VI–VIII y Scarlet/Violet; otros juegos IX quedan al final.
  const fallback = findFrontSprite({ name: 'generation-ix', games: generationNine });
  if (fallback) return fallback;

  return null;
}

/** Resuelve el recurso del modo elegido; nunca reutiliza una imagen 3D para cubrir un 2D ausente. */
export function pokemonImage(pokemon, mode, shiny = false) {
  const sprites = pokemon?.sprites;
  if (!sprites) return '';
  if (mode === '3d') return latestGenerationSprite(pokemon, shiny)?.url || '';
  const genFive = sprites.versions?.['generation-v']?.['black-white'];
  if (shiny) return genFive?.front_shiny || sprites.front_shiny || '';
  if (genFive?.front_default) return genFive.front_default;
  return sprites.front_default || '';
}

/** Informa si el recurso 2D mostrado viene de Blanco/Negro para rotular correctamente la ficha. */
export function hasGenerationFiveSprite(pokemon, shiny = false) {
  const sprite = pokemon?.sprites?.versions?.['generation-v']?.['black-white'];
  return Boolean(shiny ? sprite?.front_shiny : sprite?.front_default);
}

/** Convierte el nombre de generación de la API en la etiqueta corta que se muestra bajo el sprite. */
export function latestSpriteGenerationLabel(pokemon, shiny = false) {
  return latestGenerationSprite(pokemon, shiny)?.generation?.replace('generation-', '').toUpperCase() || '3D';
}

/** Selecciona la entrada descriptiva más reciente dentro de los idiomas solicitados. */
export function getLatestFlavorText(species, languages) {
  const entries = (species?.flavor_text_entries || []).filter((entry) => languages.includes(entry.language.name));
  if (!entries.length) return null;
  const versionNumber = (entry) => Number(entry.version?.url?.match(/\/(\d+)\/?$/)?.[1] || 0);
  const latestVersion = Math.max(...entries.map(versionNumber));
  const latestEntries = entries.filter((entry) => versionNumber(entry) === latestVersion);
  const chosen = latestEntries.find((entry) => entry.language.name === languages[0]) || latestEntries[0];
  return chosen.flavor_text.replace(/[\n\f]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Prefiere español; si no existe, conserva el texto inglés y marca que puede traducirse bajo demanda. */
export function spanishFlavorText(species) {
  const spanish = getLatestFlavorText(species, ['es', 'es-419']);
  if (spanish) return { text: spanish, translated: false, loading: false };
  const english = getLatestFlavorText(species, ['en']);
  return english
    ? { text: english, translated: false, loading: false, hasEnglishFallback: true, englishText: english }
    : { text: 'Una especie registrada en la Pokédex nacional.', translated: false, loading: false };
}

/** Devuelve una explicación localizada de una habilidad, con texto inglés como respaldo explícito. */
export function abilityDescription(ability) {
  const effectEntries = ability?.effect_entries || [];
  for (const language of ['es', 'es-419']) {
    const localizedEffect = effectEntries.find((entry) => entry.language.name === language);
    if (localizedEffect?.effect) return { text: cleanFlavorText(localizedEffect.effect), language };
  }

  const flavorEntries = ability?.flavor_text_entries || [];
  for (const language of ['es', 'es-419']) {
    const localizedEntries = flavorEntries.filter((entry) => entry.language.name === language);
    if (!localizedEntries.length) continue;
    const versionNumber = (entry) => Number(entry.version_group?.url?.match(/\/(\d+)\/?$/)?.[1] || 0);
    const latestVersion = Math.max(...localizedEntries.map(versionNumber));
    const latestEntry = localizedEntries.find((entry) => versionNumber(entry) === latestVersion);
    if (latestEntry?.flavor_text) return { text: cleanFlavorText(latestEntry.flavor_text), language };
  }

  const englishEffect = (ability?.effect_entries || []).find((entry) => entry.language.name === 'en');
  if (englishEffect?.short_effect || englishEffect?.effect) {
    return { text: cleanFlavorText(englishEffect.short_effect || englishEffect.effect), language: 'en' };
  }
  const englishFlavor = flavorEntries.find((entry) => entry.language.name === 'en');
  return englishFlavor?.flavor_text
    ? { text: cleanFlavorText(englishFlavor.flavor_text), language: 'en' }
    : { text: '', language: null };
}

function cleanFlavorText(text) {
  return text.replace(/[\n\f]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Traduce al español solo bajo demanda y reutiliza la caché local para cualquier texto descriptivo. */
export async function translateTextToSpanish(text, signal) {
  const cacheKey = `masterdex-translation-es:${text}`;
  const legacyCacheKey = `masterdex-flavor-es:${text}`;
  let cached = null;
  try { cached = localStorage.getItem(cacheKey) || localStorage.getItem(legacyCacheKey); } catch { /* Storage may be disabled by the browser. */ }
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

/** Conserva el nombre histórico usado por las descripciones de especie. */
export function translateFlavorText(text, signal) { return translateTextToSpanish(text, signal); }

/** Filtra los movimientos aprendidos por nivel para el grupo de versiones más reciente disponible. */
export function latestLevelMoves(pokemon) {
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

/** Convierte slugs de PokéAPI (por ejemplo, "solar-power") en etiquetas legibles. */
export function humanizeSlug(value) { return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

// Traduce localmente los identificadores de grupos huevo que devuelve el recurso de especie.
const EGG_GROUP_LABELS = {
  monster:'Monstruo', water1:'Agua 1', bug:'Bicho', flying:'Volador', field:'Campo', fairy:'Hada', grass:'Planta',
  'human-like':'Humanoide', water3:'Agua 3', mineral:'Mineral', amorphous:'Amorfo', water2:'Agua 2', ditto:'Ditto',
  dragon:'Dragón', undiscovered:'No descubierto',
};
const HABITAT_LABELS = {
  cave:'Cueva', forest:'Bosque', grassland:'Pradera', mountain:'Montaña', rare:'Raro',
  'rough-terrain':'Terreno accidentado', sea:'Mar', urban:'Urbano', 'waters-edge':'Orilla del agua',
};

/** Devuelve las etiquetas en español conocidas de los grupos huevo y hábitats de PokéAPI. */
export function eggGroupLabel(group) { return EGG_GROUP_LABELS[group] || humanizeSlug(group); }
export function habitatLabel(habitat) { return HABITAT_LABELS[habitat] || humanizeSlug(habitat); }

/** Construye nombres de formas sin repetir tokens que ya aparecen en el nombre base. */
export function formLabel(form, speciesName) {
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

/** Resume los requisitos evolutivos disponibles en PokéAPI para mostrarlos entre dos etapas. */
export function evolutionRequirement(child) {
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
