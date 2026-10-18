export const POKEAPI_ORIGIN = 'https://pokeapi.co';
export const POKEAPI_BASE = `${POKEAPI_ORIGIN}/api/v2`;
export const LOCAL_API_BASE = '/api/pokeapi/v2';

const apiPrefix = '/api/v2';

export class PokeApiResourceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'PokeApiResourceError';
    this.status = status;
  }
}

/** Valida una ruta de PokéAPI v2 y genera una clave estable para la caché. */
export function normalizeResourcePath(resource) {
  const value = String(resource);
  const sourceUrl = /^https?:\/\//i.test(value)
    ? value
    : value.startsWith(`${apiPrefix}/`)
      ? `${POKEAPI_ORIGIN}${value}`
      : `${POKEAPI_BASE}${value.startsWith('/') ? value : `/${value}`}`;
  const url = new URL(sourceUrl);
  if (url.origin !== POKEAPI_ORIGIN || !url.pathname.startsWith(`${apiPrefix}/`)) {
    throw new PokeApiResourceError(400, 'La ruta no pertenece a PokéAPI v2.');
  }

  const path = url.pathname.slice(apiPrefix.length);
  if (!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/.test(path)) {
    throw new PokeApiResourceError(400, 'La ruta de recurso no es válida.');
  }

  const sortedQuery = [...url.searchParams.entries()]
    .sort(([keyA, valueA], [keyB, valueB]) => keyA.localeCompare(keyB) || valueA.localeCompare(valueB));
  const query = new URLSearchParams(sortedQuery).toString();
  return `${path}${query ? `?${query}` : ''}`;
}

/** Reescribe los enlaces JSON de PokéAPI para que vuelvan a pasar por MasterDex. */
export function rewriteApiUrls(value) {
  if (Array.isArray(value)) return value.map(rewriteApiUrls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, rewriteApiUrls(entry)]));
  }
  if (typeof value === 'string' && value.startsWith(`${POKEAPI_BASE}/`)) {
    return `${LOCAL_API_BASE}${value.slice(POKEAPI_BASE.length)}`;
  }
  return value;
}
