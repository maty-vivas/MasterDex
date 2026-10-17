import { expect, test } from '@playwright/test';
import { installPokeApiMocks } from './helpers/pokeapi-mocks.js';

test.beforeEach(async ({ page }) => {
  await installPokeApiMocks(page);
  await page.goto('/');
  await expect(page.locator('.pokemon-row')).toHaveCount(60);
});

test('busca un Pokémon por nombre', async ({ page }) => {
  await page.getByPlaceholder('Buscar Pokémon…').fill('pikachu');

  await expect(page.getByRole('button', { name: 'Ver ficha de pikachu' })).toBeVisible();
  await expect(page.locator('.pokemon-row')).toHaveCount(1);
});

test('busca un Pokémon por número nacional', async ({ page }) => {
  await page.getByPlaceholder('Buscar Pokémon…').fill('025');

  await expect(page.getByRole('button', { name: 'Ver ficha de pikachu' })).toBeVisible();
  await expect(page.locator('.pokemon-row')).toHaveCount(1);
  await expect(page.locator('.row-number')).toHaveText('025');
});

test('filtra por región y conserva solo Pokémon de Kanto', async ({ page }) => {
  await page.getByPlaceholder('Buscar Pokémon…').fill('marill');
  await expect(page.getByRole('button', { name: 'Ver ficha de marill' })).toBeVisible();
  await page.getByRole('button', { name: /FILTRO/ }).click();
  await page.getByLabel('Kanto').check();

  await expect(page.getByText('NO SE ENCONTRARON POKÉMON.')).toBeVisible();
});

test('filtra por tipo usando los Pokémon devueltos por la API de tipos', async ({ page }) => {
  await page.getByRole('button', { name: /FILTRO/ }).click();
  await page.getByLabel('AGUA').check();

  await expect(page.locator('.pokemon-row')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Ver ficha de squirtle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver ficha de marill' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver ficha de pikachu' })).toBeHidden();
});

test('combina región y tipo para acotar los resultados', async ({ page }) => {
  await page.getByRole('button', { name: /FILTRO/ }).click();
  await page.getByLabel('Kanto').check();
  await page.getByLabel('AGUA').check();

  await expect(page.locator('.pokemon-row')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Ver ficha de squirtle' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver ficha de marill' })).toBeHidden();
});
