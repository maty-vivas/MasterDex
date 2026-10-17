import { database, getCachedResourceCount } from '../server/database.js';
import { getPokeApiResource, normalizeResourcePath } from '../server/pokeapi.js';

const syncConcurrency = Math.max(1, Number(process.env.MASTERDEX_SYNC_CONCURRENCY) || 3);
const onlyMissing = process.argv.includes('--only-missing');
const typeNames = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

/** Descarga una lista de recursos con concurrencia acotada y conserva el orden de entrada. */
async function loadBatch(label, resources) {
  const paths = [...new Set(resources.map(normalizeResourcePath))];
  const results = new Array(paths.length);
  const failures = [];
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < paths.length) {
      const index = nextIndex++;
      const resourcePath = paths[index];
      try {
        results[index] = await getPokeApiResource(resourcePath, { refresh: !onlyMissing, allowNetwork: true });
      } catch (error) {
        failures.push({ resourcePath, message: error.message });
      }
      completed += 1;
      if (completed % 100 === 0 || completed === paths.length) {
        console.log(`${label}: ${completed}/${paths.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(syncConcurrency, paths.length) }, worker));
  if (failures.length) {
    console.error(`${label}: ${failures.length} recursos no se pudieron sincronizar.`);
    failures.slice(0, 5).forEach(({ resourcePath, message }) => console.error(`  ${resourcePath}: ${message}`));
  }
  return { results: results.filter(Boolean), failures };
}

function linkedPaths(resources = []) {
  return resources.map((resource) => resource.url);
}

async function synchronize() {
  console.log(`Sincronización iniciada (${onlyMissing ? 'solo faltantes' : 'actualización completa'}).`);
  const catalogs = await loadBatch('Catálogos', [
    '/pokemon?limit=1025',
    '/pokemon?limit=10000',
    '/pokemon-species?limit=10000',
  ]);
  const pokemonCatalog = catalogs.results
    .filter((catalog) => catalog.results?.length && catalog.results[0].url.includes('/pokemon/'))
    .sort((left, right) => right.results.length - left.results.length)[0];
  const speciesCatalog = catalogs.results.find((catalog) => catalog.results?.length && catalog.results[0].url.includes('/pokemon-species/'));
  if (!pokemonCatalog || !speciesCatalog) throw new Error('PokéAPI no devolvió los catálogos necesarios para iniciar la sincronización.');

  // Los registros de Pokémon aportan sprites, estadísticas, habilidades y el catálogo completo de movimientos.
  const pokemonBatch = await loadBatch('Pokémon y formas', linkedPaths(pokemonCatalog.results));
  const pokemonDetails = pokemonBatch.results;
  // Las especies incluyen descripciones localizadas, variedades y enlaces a cadenas evolutivas.
  const speciesBatch = await loadBatch('Especies', linkedPaths(speciesCatalog.results));
  const speciesDetails = speciesBatch.results;

  const abilityUrls = pokemonDetails.flatMap((pokemon) => linkedPaths(pokemon.abilities?.map(({ ability }) => ability)));
  const moveUrls = pokemonDetails.flatMap((pokemon) => linkedPaths(pokemon.moves?.map(({ move }) => move)));
  const evolutionUrls = speciesDetails.map((species) => species.evolution_chain?.url).filter(Boolean);
  const related = await Promise.all([
    loadBatch('Habilidades', abilityUrls),
    loadBatch('Movimientos', moveUrls),
    loadBatch('Cadenas evolutivas', evolutionUrls),
    loadBatch('Tipos', typeNames.map((type) => `/type/${type}`)),
  ]);

  const totalFailures = catalogs.failures.length + pokemonBatch.failures.length + speciesBatch.failures.length
    + related.reduce((sum, batch) => sum + batch.failures.length, 0);
  console.log(`Sincronización finalizada: ${getCachedResourceCount()} recursos almacenados en SQLite.`);
  if (totalFailures) throw new Error(`${totalFailures} recursos quedaron pendientes; vuelve a ejecutar el comando para reintentarlos.`);
}

synchronize()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => database.close());
