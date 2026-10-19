/** Conecta el servicio compartido de PokéAPI con la caché SQLite del servidor local. */
import { readCachedResource, writeCachedResource } from './database.js';
import { createPokeApiService } from './pokeapi-service.js';
import {
  LOCAL_API_BASE,
  normalizeResourcePath,
  POKEAPI_BASE,
  POKEAPI_ORIGIN,
  PokeApiResourceError,
  rewriteApiUrls,
} from './pokeapi-shared.js';

export {
  LOCAL_API_BASE,
  normalizeResourcePath,
  POKEAPI_BASE,
  POKEAPI_ORIGIN,
  PokeApiResourceError,
  rewriteApiUrls,
};

const { getPokeApiResource } = createPokeApiService({ readCachedResource, writeCachedResource });

export { getPokeApiResource };
