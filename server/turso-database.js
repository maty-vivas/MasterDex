import { createClient } from '@libsql/client';
import { gunzipSync, gzipSync } from 'node:zlib';

let client;
let schemaReady;

// Reutiliza la conexión durante la vida de la instancia serverless y valida sus secretos al primer uso.
function getClient() {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error('Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en el entorno de ejecución.');
  }

  client = createClient({ url, authToken });
  return client;
}

/** Crea la tabla de caché una sola vez por instancia serverless. */
export async function ensureTursoCache() {
  if (!schemaReady) {
    // Todas las solicitudes de una instancia esperan la misma creación de tabla; un fallo permite reintentar.
    schemaReady = getClient().execute(`
      CREATE TABLE IF NOT EXISTS api_cache (
        resource_path TEXT PRIMARY KEY,
        payload BLOB NOT NULL,
        cached_at TEXT NOT NULL
      )
    `).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  await schemaReady;
}

/** Devuelve el JSON gzip almacenado como texto para compartir el servicio local. */
export async function readTursoCachedResource(resourcePath) {
  await ensureTursoCache();
  const result = await getClient().execute({
    sql: 'SELECT payload FROM api_cache WHERE resource_path = ?',
    args: [resourcePath],
  });
  const payload = result.rows[0]?.payload;
  if (!payload) return null;
  return gunzipSync(Buffer.from(payload)).toString('utf8');
}

/** Escribe una respuesta comprimida con el mismo formato que la SQLite local. */
export async function writeTursoCachedResource(resourcePath, payload) {
  await ensureTursoCache();
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload)));
  await getClient().execute({
    sql: `
      INSERT INTO api_cache (resource_path, payload, cached_at)
      VALUES (?, ?, ?)
      ON CONFLICT(resource_path) DO UPDATE SET
        payload = excluded.payload,
        cached_at = excluded.cached_at
    `,
    args: [resourcePath, compressed, new Date().toISOString()],
  });
}

export async function getTursoCachedResourceCount() {
  await ensureTursoCache();
  const result = await getClient().execute('SELECT COUNT(*) AS count FROM api_cache');
  return Number(result.rows[0]?.count || 0);
}
