import { normalizeResourcePath, POKEAPI_BASE, PokeApiResourceError } from './pokeapi-shared.js';

/** Crea el servicio de PokéAPI sobre una capa de caché, local o remota. */
export function createPokeApiService({
  readCachedResource,
  writeCachedResource,
  maximumConcurrentRequests = Math.max(1, Number(process.env.MASTERDEX_UPSTREAM_CONCURRENCY) || 6),
}) {
  const requestQueue = [];
  const inFlight = new Map();
  let activeRequests = 0;

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
      await writeCachedResource(resourcePath, payload);
      return payload;
    } catch (error) {
      if (error instanceof PokeApiResourceError) throw error;
      throw new PokeApiResourceError(502, 'No se pudo obtener el recurso y todavía no está en la caché.');
    } finally {
      releaseRequestSlot();
    }
  }

  async function getPokeApiResource(resource, { refresh = false, allowNetwork = true } = {}) {
    const resourcePath = normalizeResourcePath(resource);
    const cached = await readCachedResource(resourcePath);
    if (cached && !refresh) return JSON.parse(cached);
    if (!allowNetwork) {
      throw new PokeApiResourceError(503, 'El recurso no está sincronizado y el modo sin conexión está activo.');
    }
    if (inFlight.has(resourcePath)) return inFlight.get(resourcePath);

    const request = fetchAndPersist(resourcePath).finally(() => inFlight.delete(resourcePath));
    inFlight.set(resourcePath, request);
    return request;
  }

  return { getPokeApiResource };
}
