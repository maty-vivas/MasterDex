const API_ROOT = '/api/pokeapi/v2';
const FIXTURE_ROOT = '/fixtures';
const SVG_IMAGE = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#43d7dc"/><circle cx="32" cy="32" r="18" fill="#172225"/></svg>';

const SPECIAL_POKEMON = [
  { id: 1, name: 'bulbasaur', types: ['grass', 'poison'] },
  { id: 2, name: 'ivysaur', types: ['grass', 'poison'] },
  { id: 3, name: 'venusaur', types: ['grass', 'poison'] },
  { id: 6, name: 'charizard', types: ['fire', 'flying'] },
  { id: 7, name: 'squirtle', types: ['water'] },
  { id: 25, name: 'pikachu', types: ['electric'] },
  { id: 133, name: 'eevee', types: ['normal'] },
  { id: 152, name: 'marill', types: ['water', 'fairy'] },
  { id: 718, name: 'zygarde', types: ['dragon', 'ground'] },
];
// Formas de prueba con recursos ausentes para verificar que la ficha no inventa fallbacks.
const FORM_POKEMON = [
  { id: 10025, name: 'pikachu-gmax', types: ['electric'], no2d: true, noShiny3d: true },
  { id: 10118, name: 'zygarde-10-power-construct', types: ['dragon', 'ground'] },
  { id: 10119, name: 'zygarde-10', types: ['dragon', 'ground'] },
  { id: 10120, name: 'zygarde-50-power-construct', types: ['dragon', 'ground'] },
  { id: 10121, name: 'zygarde-50', types: ['dragon', 'ground'] },
  { id: 10122, name: 'zygarde-complete', types: ['dragon', 'ground'] },
  { id: 10123, name: 'zygarde-mega', types: ['dragon', 'ground'] },
];
// App deriva el número nacional de la posición del resultado, como hace con la PokéAPI.
export const POKEMON = Array.from({ length: 1025 }, (_, index) => {
  const id = index + 1;
  return SPECIAL_POKEMON.find((record) => record.id === id) || { id, name: `test-pokemon-${id}`, types: ['normal'] };
});

const ALL_RECORDS = [...POKEMON, ...FORM_POKEMON];
const pokemonUrl = (id) => `${API_ROOT}/pokemon/${id}/`;
const speciesUrl = (id) => `${API_ROOT}/pokemon-species/${id}/`;
const fixtureUrl = (name, variant) => `${FIXTURE_ROOT}/${name}-${variant}.svg`;

function pokemonDetail(record) {
  const has2d = !record.no2d;
  const abilities = [{ ability: { name: 'static', url: `${API_ROOT}/ability/9/` }, is_hidden: false }];
  if (record.id === 25) abilities.push({ ability: { name: 'lightning-rod', url: `${API_ROOT}/ability/31/` }, is_hidden: true });
  const moves = record.id === 25 ? [{
    move: { name: 'thunder-shock', url: `${API_ROOT}/move/84/` },
    version_group_details: [{ move_learn_method: { name: 'level-up' }, level_learned_at: 1, version_group: { url: `${API_ROOT}/version-group/20/` } }],
  }] : [];
  const detail = {
    id: record.id,
    name: record.name,
    height: record.id === 25 ? 4 : 7,
    weight: record.id === 25 ? 60 : 69,
    species: { name: record.name.split('-')[0], url: speciesUrl(record.id > 10000 ? (record.id === 10025 ? 25 : 718) : record.id) },
    types: record.types.map((name, index) => ({ slot: index + 1, type: { name, url: `${API_ROOT}/type/${name}/` } })),
    abilities,
    stats: [['hp', 60], ['attack', 70], ['defense', 65], ['special-attack', 80], ['special-defense', 75], ['speed', 90]].map(([name, base_stat]) => ({ base_stat, stat: { name } })),
    moves,
    sprites: {
      front_default: has2d ? fixtureUrl(record.name, 'normal-2d') : null,
      front_shiny: has2d && !record.noShiny2d ? fixtureUrl(record.name, 'shiny-2d') : null,
      versions: {
        'generation-v': { 'black-white': { front_default: has2d ? fixtureUrl(record.name, 'normal-2d') : null, front_shiny: has2d && !record.noShiny2d ? fixtureUrl(record.name, 'shiny-2d') : null } },
        'generation-viii': { 'sword-shield': {
          front_default: fixtureUrl(record.name, 'normal-3d'),
          front_shiny: record.noShiny3d ? null : fixtureUrl(record.name, 'shiny-3d'),
          icons: { front_default: fixtureUrl(record.name, 'icon') },
        } },
      },
    },
  };
  return detail;
}

function speciesDetail(record) {
  let varieties = [{ is_default: true, pokemon: { name: record.name, url: pokemonUrl(record.id) } }];
  if (record.id === 25) varieties.push({ is_default: false, pokemon: { name: 'pikachu-gmax', url: pokemonUrl(10025) } });
  if (record.id === 718) varieties = [
    varieties[0],
    ...FORM_POKEMON.filter(({ id }) => id !== 10025).map((form) => ({ is_default: false, pokemon: { name: form.name, url: pokemonUrl(form.id) } })),
  ];
  const englishOnly = record.id === 1025;
  return {
    id: record.id,
    name: record.name,
    names: englishOnly ? [] : [{ name: record.name[0].toUpperCase() + record.name.slice(1), language: { name: 'es' } }],
    flavor_text_entries: englishOnly
      ? [{ flavor_text: 'A sample entry written in English.', language: { name: 'en' }, version: { url: `${API_ROOT}/version/1/` } }]
      : [{ flavor_text: `Entrada de prueba para ${record.name}.`, language: { name: 'es' }, version: { url: `${API_ROOT}/version/1/` } }],
    egg_groups: record.id === 25 ? [{ name: 'field' }, { name: 'fairy' }] : [{ name: 'monster' }],
    habitat: record.id === 152 ? null : { name: record.id === 25 ? 'forest' : 'cave' },
    varieties,
    evolution_chain: { url: `${API_ROOT}/evolution-chain/${record.id === 2 || record.id === 3 ? 1 : record.id}/` },
    pokedex_numbers: [{ entry_number: record.id > 10000 ? (record.id === 10025 ? 25 : 718) : record.id, pokedex: { name: 'national' } }],
  };
}

function evolutionChain(id) {
  if (Number(id) === 1) return { chain: {
    species: { name: 'bulbasaur', url: speciesUrl(1) },
    evolves_to: [{ species: { name: 'ivysaur', url: speciesUrl(2) }, evolution_details: [{ min_level: 16 }], evolves_to: [{ species: { name: 'venusaur', url: speciesUrl(3) }, evolution_details: [{ min_level: 32 }], evolves_to: [] }] }],
  } };
  if (Number(id) === 133) return { chain: {
    species: { name: 'eevee', url: speciesUrl(133) },
    evolves_to: [
      [134, 'vaporeon'], [135, 'jolteon'], [136, 'flareon'], [196, 'espeon'],
      [197, 'umbreon'], [470, 'leafeon'], [471, 'glaceon'], [700, 'sylveon'],
    ].map(([speciesId, name]) => ({
      species: { name, url: speciesUrl(speciesId) },
      evolution_details: [],
      evolves_to: [],
    })),
  } };
  const record = ALL_RECORDS.find((pokemon) => pokemon.id === Number(id));
  return record ? { chain: { species: { name: record.name, url: speciesUrl(record.id) }, evolution_details: [], evolves_to: [] } } : null;
}

/** Intercepta datos y recursos visuales para que los E2E no consulten servicios externos. */
export async function installPokeApiMocks(page, { failListRequests = 0 } = {}) {
  let listFailuresRemaining = failListRequests;
  await page.route('**/api/pokeapi/v2/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/pokeapi\/v2\/?/, '').replace(/\/$/, '');
    const parts = path.split('/');
    let payload;

    if (path === 'pokemon') {
      if (listFailuresRemaining > 0) {
        listFailuresRemaining -= 1;
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture de error temporal' }) });
        return;
      }
      payload = { count: POKEMON.length, next: null, previous: null, results: POKEMON.map(({ id, name }) => ({ name, url: pokemonUrl(id) })) };
    } else if (parts[0] === 'pokemon' && parts.length === 2) {
      const record = ALL_RECORDS.find(({ id }) => id === Number(parts[1]));
      payload = record ? pokemonDetail(record) : null;
    } else if (parts[0] === 'pokemon-species' && parts.length === 2) {
      const record = ALL_RECORDS.find(({ id }) => id === Number(parts[1]));
      payload = record ? speciesDetail(record.id > 10000 ? ALL_RECORDS.find((item) => item.id === (record.id === 10025 ? 25 : 718)) : record) : null;
    } else if (parts[0] === 'type' && parts[1] === 'water') {
      payload = { pokemon: POKEMON.filter(({ id }) => [7, 152].includes(id)).map(({ id, name }) => ({ pokemon: { name, url: pokemonUrl(id) } })) };
    } else if (parts[0] === 'type' && parts[1] === 'electric') {
      payload = { pokemon: [{ pokemon: { name: 'pikachu', url: pokemonUrl(25) } }] };
    } else if (parts[0] === 'ability' && parts[1] === '9') {
      payload = { names: [{ name: 'Estática', language: { name: 'es' } }], effect_entries: [{ short_effect: 'Raises the Pokémon’s Speed when hit by an Electric-type move.', effect: 'Raises the Pokémon’s Speed when hit by an Electric-type move.', language: { name: 'en' } }] };
    } else if (parts[0] === 'ability' && parts[1] === '31') {
      payload = { names: [{ name: 'Pararrayos', language: { name: 'es' } }], effect_entries: [{ short_effect: 'Draws in Electric-type moves.', effect: 'Draws in Electric-type moves and raises Special Attack.', language: { name: 'en' } }] };
    } else if (parts[0] === 'move' && parts[1] === '84') {
      payload = { names: [{ name: 'Impactrueno', language: { name: 'es' } }], type: { name: 'electric' }, damage_class: { name: 'special' } };
    } else if (parts[0] === 'evolution-chain') {
      payload = evolutionChain(parts[1]);
    }

    if (!payload) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: `Mock sin respuesta para ${path}` }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });

  await page.route('https://translate.googleapis.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([[['Texto traducido de prueba.']]]),
  }));
  await page.route('**/fixtures/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SVG_IMAGE }));
  await page.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SVG_IMAGE }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
}
