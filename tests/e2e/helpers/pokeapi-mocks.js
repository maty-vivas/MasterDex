const API_ROOT = '/api/pokeapi/v2';
const FIXTURE_ROOT = '/fixtures';
const SVG_IMAGE = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#43d7dc"/><circle cx="32" cy="32" r="18" fill="#172225"/></svg>';

const SPECIAL_POKEMON = [
  { id: 1, name: 'bulbasaur', types: ['grass', 'poison'] },
  { id: 7, name: 'squirtle', types: ['water'] },
  { id: 25, name: 'pikachu', types: ['electric'] },
  { id: 152, name: 'marill', types: ['water', 'fairy'] },
];
// App deriva el número nacional de la posición del resultado, como hace con la PokéAPI.
export const POKEMON = Array.from({ length: 152 }, (_, index) => {
  const id = index + 1;
  return SPECIAL_POKEMON.find((record) => record.id === id) || { id, name: `test-pokemon-${id}`, types: ['normal'] };
});

const pokemonUrl = (id) => `${API_ROOT}/pokemon/${id}/`;
const speciesUrl = (id) => `${API_ROOT}/pokemon-species/${id}/`;
const fixtureUrl = (name, variant) => `${FIXTURE_ROOT}/${name}-${variant}.svg`;

function pokemonDetail(record) {
  return {
    id: record.id,
    name: record.name,
    height: 7,
    weight: 69,
    species: { name: record.name, url: speciesUrl(record.id) },
    types: record.types.map((name, index) => ({ slot: index + 1, type: { name, url: `${API_ROOT}/type/${name}/` } })),
    abilities: [{ ability: { name: 'static', url: `${API_ROOT}/ability/9/` }, is_hidden: false }],
    stats: [
      ['hp', 60], ['attack', 70], ['defense', 65], ['special-attack', 80], ['special-defense', 75], ['speed', 90],
    ].map(([name, base_stat]) => ({ base_stat, stat: { name } })),
    moves: [],
    sprites: {
      front_default: fixtureUrl(record.name, 'normal-2d'),
      front_shiny: fixtureUrl(record.name, 'shiny-2d'),
      versions: {
        'generation-v': {
          'black-white': {
            front_default: fixtureUrl(record.name, 'normal-2d'),
            front_shiny: fixtureUrl(record.name, 'shiny-2d'),
          },
        },
        'generation-viii': {
          'sword-shield': {
            front_default: fixtureUrl(record.name, 'normal-3d'),
            front_shiny: fixtureUrl(record.name, 'shiny-3d'),
            icons: { front_default: fixtureUrl(record.name, 'icon') },
          },
        },
      },
    },
  };
}

function speciesDetail(record) {
  return {
    id: record.id,
    name: record.name,
    names: [{ name: record.name[0].toUpperCase() + record.name.slice(1), language: { name: 'es' } }],
    flavor_text_entries: [{ flavor_text: `Entrada de prueba para ${record.name}.`, language: { name: 'es' }, version: { url: `${API_ROOT}/version/1/` } }],
    varieties: [{ is_default: true, pokemon: { name: record.name, url: pokemonUrl(record.id) } }],
    evolution_chain: { url: `${API_ROOT}/evolution-chain/${record.id}/` },
    pokedex_numbers: [{ entry_number: record.id, pokedex: { name: 'national' } }],
  };
}

/** Intercepta datos y recursos visuales para que los E2E no consulten servicios externos. */
export async function installPokeApiMocks(page) {
  await page.route('**/api/pokeapi/v2/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/pokeapi\/v2\/?/, '').replace(/\/$/, '');
    const parts = path.split('/');
    let payload;

    if (path === 'pokemon') {
      payload = { count: POKEMON.length, next: null, previous: null, results: POKEMON.map(({ id, name }) => ({ name, url: pokemonUrl(id) })) };
    } else if (parts[0] === 'pokemon' && parts.length === 2) {
      const record = POKEMON.find(({ id }) => id === Number(parts[1]));
      payload = record ? pokemonDetail(record) : null;
    } else if (parts[0] === 'pokemon-species' && parts.length === 2) {
      const record = POKEMON.find(({ id }) => id === Number(parts[1]));
      payload = record ? speciesDetail(record) : null;
    } else if (parts[0] === 'type' && parts[1] === 'water') {
      payload = { pokemon: POKEMON.filter(({ id }) => [7, 152].includes(id)).map(({ id, name }) => ({ pokemon: { name, url: pokemonUrl(id) } })) };
    } else if (parts[0] === 'ability' && parts[1] === '9') {
      payload = { names: [{ name: 'Estática', language: { name: 'es' } }] };
    } else if (parts[0] === 'evolution-chain') {
      const record = POKEMON.find(({ id }) => id === Number(parts[1]));
      payload = record ? { chain: { species: { name: record.name, url: speciesUrl(record.id) }, evolution_details: [], evolves_to: [] } } : null;
    }

    if (!payload) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: `Mock sin respuesta para ${path}` }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });

  await page.route('**/fixtures/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SVG_IMAGE }));
  await page.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SVG_IMAGE }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
}
