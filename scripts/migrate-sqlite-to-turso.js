import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Copia la caché local ya comprimida; requiere las credenciales de Turso en el entorno del proceso.
const databasePath = resolve(process.cwd(), process.env.MASTERDEX_DB_PATH || 'data/masterdex.sqlite');
const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const batchSize = 20;

if (!databaseUrl || !authToken || databaseUrl === '[SENSITIVE]' || authToken === '[SENSITIVE]') {
  throw new Error('Faltan credenciales válidas de Turso. Vercel puede escribir [SENSITIVE] en .env.local; reemplaza TURSO_DATABASE_URL y TURSO_AUTH_TOKEN localmente.');
}
if (!existsSync(databasePath)) {
  throw new Error(`No se encontró la base SQLite local: ${databasePath}`);
}

const source = new DatabaseSync(databasePath, { readOnly: true });
const target = createClient({ url: databaseUrl, authToken });

async function migrate() {
  // La tabla comparte el formato que espera la función serverless de producción.
  await target.execute(`
    CREATE TABLE IF NOT EXISTS api_cache (
      resource_path TEXT PRIMARY KEY,
      payload BLOB NOT NULL,
      cached_at TEXT NOT NULL
    )
  `);

  const rows = source.prepare('SELECT resource_path, payload, cached_at FROM api_cache').iterate();
  let batch = [];
  let copied = 0;

  // El upsert hace que una segunda ejecución actualice datos existentes sin duplicarlos.
  for (const row of rows) {
    batch.push({
      sql: `
        INSERT INTO api_cache (resource_path, payload, cached_at)
        VALUES (?, ?, ?)
        ON CONFLICT(resource_path) DO UPDATE SET
          payload = excluded.payload,
          cached_at = excluded.cached_at
      `,
      args: [row.resource_path, Buffer.from(row.payload), row.cached_at],
    });

    // Los lotes acotan el uso de memoria y el tamaño de cada transacción remota.
    if (batch.length >= batchSize) {
      await target.batch(batch, 'write');
      copied += batch.length;
      batch = [];
      console.log(`Recursos copiados: ${copied}`);
    }
  }

  if (batch.length) {
    await target.batch(batch, 'write');
    copied += batch.length;
  }

  const count = await target.execute('SELECT COUNT(*) AS count FROM api_cache');
  console.log(`Migración finalizada. Recursos locales procesados: ${copied}. Recursos en Turso: ${Number(count.rows[0]?.count || 0)}.`);
}

migrate()
  .catch((error) => {
    console.error(`No se pudo completar la migración: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    source.close();
    target.close();
  });
