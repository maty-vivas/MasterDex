import { readCachedResource, writeCachedResource } from './database.js';

export const POKEAPI_ORIGIN = 'https://pokeapi.co';
export const POKEAPI_BASE = `${POKEAPI_ORIGIN}/api/v2`;
export const LOCAL_API_BASE = '/api/pokeapi/v2';

const apiPrefix = '/api/v2';
const maximumConcurrentRequests = Math.max(1, Number(process.env.MASTERDEX_UPSTREAM_CONCURRENCY) || 6);
const requestQueue = [];
const inFlight = new Map();
let activeRequests = 0;

export class PokeApiResourceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'PokeApiResourceError';
    this.status = status;
  }
}

/** Acepta rutas internas o URLs de PokéAPI y genera una clave estable para SQLite. */
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

/** Cambia solo los enlaces de recursos de PokéAPI; las URLs de imágenes quedan intactas. */
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

async function acquireRequestSlot() {
  if (activeRequests >= maximumConcurrentRequests) {
    await new Promise((resolve) => requestQueue.push(resolve));
  }
  activeRequests += 1;
}

function releaseRequestSlot() {
  activeRequests -= 1;
  requestQueue.shift()?.();
}

async function fetchAndPersist(resourcePath) {
  await acquireRequestSlot();
  try {
    const response = await fetch(`${POKEAPI_BASE}${resourcePath}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      throw new PokeApiResourceError(response.status, `PokéAPI respondió con HTTP ${response.status}.`);
    }

    const payload = await response.json();
    writeCachedResource(resourcePath, payload);
    return payload;
  } catch (error) {
    if (error instanceof PokeApiResourceError) throw error;
    throw new PokeApiResourceError(502, 'No se pudo obtener el recurso y todavía no está en la base local.');
  } finally {
    releaseRequestSlot();
  }
}

/** Lee primero SQLite, comparte solicitudes simultáneas iguales y persiste los fallbacks remotos. */
export async function getPokeApiResource(resource, { refresh = false, allowNetwork = true } = {}) {
  const resourcePath = normalizeResourcePath(resource);
  const cached = readCachedResource(resourcePath);
  if (cached && !refresh) return JSON.parse(cached);
  if (!allowNetwork) {
    throw new PokeApiResourceError(503, 'El recurso no está sincronizado y el modo sin conexión está activo.');
  }
  if (inFlight.has(resourcePath)) return inFlight.get(resourcePath);

  const request = fetchAndPersist(resourcePath).finally(() => inFlight.delete(resourcePath));
  inFlight.set(resourcePath, request);
  return request;
}
