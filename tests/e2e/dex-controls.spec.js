import { expect, test } from '@playwright/test';
import { installPokeApiMocks } from './helpers/pokeapi-mocks.js';

test.beforeEach(async ({ page }) => {
  await installPokeApiMocks(page);
  await page.goto('/');
  await expect(page.locator('.pokemon-row')).toHaveCount(60);
});

test('alterna número y orden alfabético, y mantiene abierto el menú de orden', async ({ page }) => {
  const sortMenu = page.locator('#pokemon-sort-menu');
  const sortTrigger = page.getByRole('button', { name: 'Ordenar Pokémon' });
  await sortTrigger.click();
  await page.getByRole('button', { name: /N.º POKÉDEX/ }).click();
  await expect(sortMenu).toBeVisible();
  await expect(page.locator('.sort-option.selected small')).toHaveText('DESCENDENTE');
  await expect(page.locator('.sort-option.selected b')).toHaveClass(/descending/);
  await expect(page.locator('.row-number').first()).toHaveText('1025');

  await page.getByRole('button', { name: /ALFABÉTICO/ }).click();
  await expect(page.locator('.sort-option.selected small')).toHaveText('ASCENDENTE');
  await expect(page.locator('.row-name').first()).toHaveText('bulbasaur');
  await page.getByRole('button', { name: /ALFABÉTICO/ }).click();
  await expect(page.locator('.sort-option.selected small')).toHaveText('DESCENDENTE');
  await expect(page.locator('.row-name').first()).toHaveText('zygarde');
});

test('combina varias regiones como alternativas y permite limpiar los filtros', async ({ page }) => {
  await page.getByRole('button', { name: /FILTRO/ }).click();
  await page.getByLabel('Kanto').check();
  await page.getByLabel('Johto').check();
  await expect(page.locator('.pagination-row')).toContainText('DE 251');

  await page.getByRole('button', { name: 'LIMPIAR' }).click();
  await expect(page.getByLabel('Kanto')).not.toBeChecked();
  await expect(page.getByLabel('Johto')).not.toBeChecked();
  await expect(page.locator('.pagination-row')).toContainText('DE 1025');
});

test('combina varios tipos como alternativas', async ({ page }) => {
  await page.getByRole('button', { name: /FILTRO/ }).click();
  await page.getByLabel('AGUA').check();
  await page.getByLabel('ELÉCTRICO').check();

  await expect(page.locator('.pokemon-row')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Ver ficha de pikachu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver ficha de squirtle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver ficha de marill' })).toBeVisible();
});

test('los menús de filtro y orden se cierran con Escape y al hacer clic afuera', async ({ page }) => {
  await page.getByRole('button', { name: /FILTRO/ }).click();
  await expect(page.locator('#pokemon-filter-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#pokemon-filter-menu')).toBeHidden();

  await page.getByRole('button', { name: 'Ordenar Pokémon' }).click();
  await expect(page.locator('#pokemon-sort-menu')).toBeVisible();
  await page.locator('.preview-panel').click({ position: { x: 20, y: 300 } });
  await expect(page.locator('#pokemon-sort-menu')).toBeHidden();
});

test('en móvil se ven los filtros en columnas y la fila se puede abrir con teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /FILTRO/ }).click();
  await expect(page.locator('#pokemon-filter-menu')).toBeVisible();
  const regionColumns = await page.locator('.filter-group:not(.type-filter-group) .filter-options').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
  const typeColumns = await page.locator('.type-filter-group .filter-options').evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
  expect(regionColumns).toBe(3);
  expect(typeColumns).toBe(3);

  await page.keyboard.press('Escape');
  const firstRow = page.locator('.pokemon-row').first();
  await firstRow.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pokemon\/1$/);
});
