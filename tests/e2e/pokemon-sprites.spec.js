import { expect, test } from '@playwright/test';
import { installPokeApiMocks } from './helpers/pokeapi-mocks.js';

// Aísla la selección 2D/3D y Shiny para verificar la URL y el texto alternativo de cada recurso.
test.beforeEach(async ({ page }) => {
  await installPokeApiMocks(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ver ficha de pikachu' }).click();
  await expect(page).toHaveURL(/\/pokemon\/25$/);
  await expect(page.getByRole('heading', { name: 'Pikachu', level: 1 })).toBeVisible();
});

test('muestra el sprite 2D normal de la forma seleccionada', async ({ page }) => {
  const sprite = page.locator('.detail-page-art img');

  await expect(sprite).toHaveAttribute('src', '/fixtures/pikachu-normal-2d.svg');
  await expect(sprite).toHaveAttribute('alt', 'Sprite 2D de pikachu');
});

test('cambia al sprite 3D normal al seleccionar la vista 3D', async ({ page }) => {
  await page.getByRole('button', { name: 'Alternar vista 2D/3D' }).click();

  const sprite = page.locator('.detail-page-art img');
  await expect(sprite).toHaveAttribute('src', '/fixtures/pikachu-normal-3d.svg');
  await expect(sprite).toHaveAttribute('alt', 'Render 3D de pikachu');
});

test('activa y desactiva la versión Shiny en el modo 2D', async ({ page }) => {
  const shinyToggle = page.getByRole('button', { name: 'SHINY' });
  await shinyToggle.click();

  const sprite = page.locator('.detail-page-art img');
  await expect(shinyToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(sprite).toHaveAttribute('src', '/fixtures/pikachu-shiny-2d.svg');
  await expect(sprite).toHaveAttribute('alt', 'Shiny · Sprite 2D de pikachu');

  await shinyToggle.click();
  await expect(shinyToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(sprite).toHaveAttribute('src', '/fixtures/pikachu-normal-2d.svg');
});

test('muestra la versión Shiny también al cambiar al modo 3D', async ({ page }) => {
  await page.getByRole('button', { name: 'Alternar vista 2D/3D' }).click();
  await page.getByRole('button', { name: 'SHINY' }).click();

  const sprite = page.locator('.detail-page-art img');
  await expect(sprite).toHaveAttribute('src', '/fixtures/pikachu-shiny-3d.svg');
  await expect(sprite).toHaveAttribute('alt', 'Shiny · Render 3D de pikachu');
});
