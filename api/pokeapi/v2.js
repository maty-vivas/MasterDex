import { createPokeApiService } from '../../server/pokeapi-service.js';
import {
  normalizeResourcePath,
  POKEAPI_BASE,
  PokeApiResourceError,
  rewriteApiUrls,
} from '../../server/pokeapi-shared.js';
import {
  ensureTursoCache,
  readTursoCachedResource,
  writeTursoCachedResource,
} from '../../server/turso-database.js';

const { getPokeApiResource } = createPokeApiService({
  readCachedResource: readTursoCachedResource,
  writeCachedResource: writeTursoCachedResource,
});

export const config = { maxDuration: 30 };
const resourcePathQueryKey = '__resourcePath';

/** Vercel Function que atiende las rutas PokéAPI redirigidas desde /api/pokeapi/v2/*. */
export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Solo se permiten solicitudes GET.' });
    return;
  }

  try {
    await ensureTursoCache();
    const incomingUrl = new URL(request.url || '/', `https://${request.headers.host || 'localhost'}`);
    const requestedPath = incomingUrl.searchParams.get(resourcePathQueryKey);
    incomingUrl.searchParams.delete(resourcePathQueryKey);
    if (!requestedPath) {
      throw new PokeApiResourceError(404, 'La ruta solicitada no existe.');
    }

    const localPath = requestedPath.startsWith('/') ? requestedPath : `/${requestedPath}`;
    const resourcePath = normalizeResourcePath(`${POKEAPI_BASE}${localPath}${incomingUrl.search}`);
    const wasCached = Boolean(await readTursoCachedResource(resourcePath));
    const payload = await getPokeApiResource(resourcePath);

    response.setHeader('cache-control', 'no-store');
    response.setHeader('x-masterdex-cache', wasCached ? 'HIT' : 'MISS');
    response.status(200).json(rewriteApiUrls(payload));
  } catch (error) {
    const status = error instanceof PokeApiResourceError ? error.status : 500;
    response.status(status).json({ error: error.message || 'No se pudo completar la solicitud.' });
  }
}
