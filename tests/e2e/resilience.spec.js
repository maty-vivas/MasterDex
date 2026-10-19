import { expect, test } from '@playwright/test';
import { installPokeApiMocks } from './helpers/pokeapi-mocks.js';

// Simula una caída temporal de la API y comprueba que el usuario puede recuperar la lista.
test('muestra un error de carga y permite reintentar la Pokédex', async ({ page }) => {
  // React Strict Mode inicia la carga dos veces en desarrollo; fallan ambas antes del reintento explícito.
  await installPokeApiMocks(page, { failListRequests: 2 });

  await page.goto('/');
  await expect(page.getByText('NO SE PUDO CONECTAR CON LA POKÉDEX')).toBeVisible();
  await page.getByRole('button', { name: 'REINTENTAR' }).click();
  await expect(page.locator('.pokemon-row')).toHaveCount(60);
});
