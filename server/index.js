import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { database, getCachedResourceCount, readCachedResource } from './database.js';
import { getPokeApiResource, LOCAL_API_BASE, normalizeResourcePath, POKEAPI_BASE, PokeApiResourceError, rewriteApiUrls } from './pokeapi.js';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = resolve(projectRoot, 'dist');
const apiPathPrefix = LOCAL_API_BASE;
const port = Number(process.env.MASTERDEX_API_PORT || process.env.PORT || 3001);
const host = process.env.MASTERDEX_HOST || '127.0.0.1';
const offlineMode = /^(1|true|yes)$/i.test(process.env.MASTERDEX_OFFLINE || '');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendJson(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extraHeaders });
  response.end(JSON.stringify(payload));
}

/** Sirve el build de Vite y mantiene rutas directas como /pokemon/6 funcionales. */
function serveFrontend(request, response, pathname) {
  if (!existsSync(resolve(distRoot, 'index.html'))) {
    sendJson(response, 503, { error: 'Primero genera el frontend con npm run build.' });
    return;
  }

  let decodedPath;
  try { decodedPath = decodeURIComponent(pathname); }
  catch { sendJson(response, 400, { error: 'La ruta solicitada no es válida.' }); return; }

  const relativePath = decodedPath.replace(/^\/+/, '');
  const requestedPath = resolve(distRoot, relativePath || 'index.html');
  const isInsideDist = requestedPath === distRoot || requestedPath.startsWith(`${distRoot}${sep}`);
  const filePath = isInsideDist && existsSync(requestedPath) && statSync(requestedPath).isFile()
    ? requestedPath
    : resolve(distRoot, 'index.html');
  const extension = extname(filePath);
  response.writeHead(200, {
    'content-type': mimeTypes[extension] || 'application/octet-stream',
    'cache-control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Solo se permiten solicitudes GET.' }, { allow: 'GET' });
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok', cachedResources: getCachedResourceCount(), offlineMode });
    return;
  }

  if (url.pathname === apiPathPrefix || url.pathname.startsWith(`${apiPathPrefix}/`)) {
    try {
      const localResource = `${url.pathname.slice(apiPathPrefix.length)}${url.search}`;
      const resourcePath = normalizeResourcePath(`${POKEAPI_BASE}${localResource}`);
      const wasCached = Boolean(readCachedResource(resourcePath));
      const payload = await getPokeApiResource(resourcePath, { allowNetwork: !offlineMode });
      sendJson(response, 200, rewriteApiUrls(payload), { 'x-masterdex-cache': wasCached ? 'HIT' : 'MISS' });
    } catch (error) {
      const status = error instanceof PokeApiResourceError ? error.status : 500;
      sendJson(response, status, { error: error.message || 'No se pudo completar la solicitud.' });
    }
    return;
  }

  serveFrontend(request, response, url.pathname);
});

server.listen(port, host, () => {
  console.log(`MasterDex API lista en http://${host}:${port} (${offlineMode ? 'solo SQLite' : 'SQLite con fallback PokéAPI'})`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
