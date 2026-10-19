import { getTursoCachedResourceCount } from '../server/turso-database.js';

/** Informa si la función de producción puede consultar la caché compartida de Turso. */
export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Solo se permiten solicitudes GET.' });
    return;
  }

  try {
    const cachedResources = await getTursoCachedResourceCount();
    response.status(200).json({ status: 'ok', cachedResources, database: 'turso' });
  } catch (error) {
    response.status(500).json({ status: 'error', error: error.message || 'No se pudo consultar Turso.' });
  }
}
