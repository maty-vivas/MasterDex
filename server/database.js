import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configuredPath = process.env.MASTERDEX_DB_PATH || 'data/masterdex.sqlite';
export const databasePath = resolve(projectRoot, configuredPath);

// Crea el directorio de datos en el primer arranque; el archivo SQLite no va al repositorio.
mkdirSync(dirname(databasePath), { recursive: true });

export const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
`);

function createCacheTable() {
  database.exec(`
    CREATE TABLE api_cache (
      resource_path TEXT PRIMARY KEY,
      payload BLOB NOT NULL,
      cached_at TEXT NOT NULL
    ) STRICT;
  `);
}

const cacheTable = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'api_cache'").get();
if (!cacheTable) {
  createCacheTable();
} else {
  const payloadColumn = database.prepare('PRAGMA table_info(api_cache)').all().find((column) => column.name === 'payload');
  if (payloadColumn?.type.toUpperCase() !== 'BLOB') {
    // Actualiza bases previas de JSON plano a gzip sin perder los recursos ya sincronizados.
    database.exec('BEGIN IMMEDIATE;');
    let migrationCommitted = false;
    try {
      database.exec('ALTER TABLE api_cache RENAME TO api_cache_uncompressed;');
      createCacheTable();
      const previousRows = database.prepare('SELECT resource_path, payload, cached_at FROM api_cache_uncompressed').iterate();
      const insertCompressed = database.prepare('INSERT INTO api_cache (resource_path, payload, cached_at) VALUES (?, ?, ?)');
      for (const row of previousRows) {
        const json = typeof row.payload === 'string' ? row.payload : Buffer.from(row.payload).toString('utf8');
        insertCompressed.run(row.resource_path, gzipSync(Buffer.from(json)), row.cached_at);
      }
      database.exec('DROP TABLE api_cache_uncompressed; COMMIT;');
      migrationCommitted = true;
    } catch (error) {
      if (!migrationCommitted) database.exec('ROLLBACK;');
      throw error;
    }
    // Reclama el espacio liberado al reemplazar la tabla, útil en despliegues con disco persistente.
    database.exec('VACUUM;');
  }
}

const selectResource = database.prepare('SELECT payload FROM api_cache WHERE resource_path = ?');
const saveResource = database.prepare(`
  INSERT INTO api_cache (resource_path, payload, cached_at)
  VALUES (?, ?, ?)
  ON CONFLICT(resource_path) DO UPDATE SET
    payload = excluded.payload,
    cached_at = excluded.cached_at
`);
const countResources = database.prepare('SELECT COUNT(*) AS count FROM api_cache');

/** Devuelve el JSON almacenado para una ruta de PokéAPI, o null si aún no existe. */
export function readCachedResource(resourcePath) {
  const payload = selectResource.get(resourcePath)?.payload;
  return payload ? gunzipSync(payload).toString('utf8') : null;
}

/** Inserta o actualiza una respuesta; la fecha permite inspeccionar su antigüedad. */
export function writeCachedResource(resourcePath, payload) {
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload)));
  saveResource.run(resourcePath, compressed, new Date().toISOString());
}

/** La ruta de salud usa este total para informar cuántos recursos hay persistidos. */
export function getCachedResourceCount() {
  return Number(countResources.get().count);
}
