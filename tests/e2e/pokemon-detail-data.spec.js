import { expect, test } from '@playwright/test';
import { installPokeApiMocks } from './helpers/pokeapi-mocks.js';

// Verifica contenido localizado de ficha, formas, traducciones, evoluciones y navegación.
test.beforeEach(async ({ page }) => {
  await installPokeApiMocks(page);
  await page.goto('/');
  await expect(page.locator('.pokemon-row')).toHaveCount(60);
});

test('muestra los grupos huevo y hábitat en español y mantiene estadísticas y movimientos', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver ficha de pikachu' }).click();

  await expect(page.locator('.species-ecology')).toContainText('GRUPO HUEVO');
  await expect(page.locator('.species-ecology')).toContainText('Campo · Hada');
  await expect(page.locator('.species-ecology')).toContainText('Bosque');
  await expect(page.locator('.stat-hp strong')).toHaveText('60');
  await expect(page.getByRole('cell', { name: 'Impactrueno' })).toBeVisible();
});

test('indica hábitat no especificado y permite volver desde la ficha', async ({ page }) => {
  await page.getByPlaceholder('Buscar Pokémon…').fill('marill');
  await page.getByRole('button', { name: 'Ver ficha de marill' }).click();
  await expect(page.locator('.species-ecology')).toContainText('No especificado');

  await page.getByRole('button', { name: /VOLVER A LA POKÉDEX/ }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByPlaceholder('Buscar Pokémon…')).toBeVisible();
});

test('cambia a Gigamax y respeta recursos 2D y Shiny ausentes', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver ficha de pikachu' }).click();
  await page.getByRole('button', { name: 'Gigamax' }).click();
  await expect(page.locator('.detail-current-form')).toHaveText('Gigamax');
  await expect(page.locator('.detail-image-missing')).toHaveText('SPRITE 2D NO DISPONIBLE');

  await page.getByRole('button', { name: 'Alternar vista 2D/3D' }).click();
  await expect(page.locator('.detail-page-art img')).toHaveAttribute('src', '/fixtures/pikachu-gmax-normal-3d.svg');
  await page.getByRole('button', { name: 'SHINY' }).click();
  await expect(page.locator('.detail-image-missing')).toHaveText('SHINY 3D NO DISPONIBLE');
  await page.getByRole('button', { name: 'Alternar vista 2D/3D' }).click();
  await expect(page.locator('.detail-image-missing')).toHaveText('SHINY 2D NO DISPONIBLE');
});

test('oculta variantes duplicadas de Zygarde y presenta las formas únicas', async ({ page }) => {
  await page.goto('/pokemon/718');
  const forms = page.getByRole('group', { name: 'Seleccionar forma del Pokémon' });
  await expect(forms.getByRole('button')).toHaveCount(5);
  await expect(forms.getByRole('button', { name: 'Forma habitual' })).toBeVisible();
  await expect(forms.getByRole('button', { name: 'Zygarde 10' })).toBeVisible();
  await expect(forms.getByRole('button', { name: 'Zygarde 50' })).toBeVisible();
  await expect(forms.getByRole('button', { name: 'Mega Zygarde' })).toBeVisible();
  await expect(forms.getByRole('button', { name: /Power Construct/i })).toHaveCount(0);
});

test('traduce una descripción, permite volver al original y reutiliza la traducción', async ({ page }) => {
  let translationCalls = 0;
  await page.route('https://translate.googleapis.com/**', async (route) => {
    translationCalls += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([[['Entrada traducida.']]]) });
  });
  await page.getByPlaceholder('Buscar Pokémon…').fill('test-pokemon-1025');
  await page.getByRole('button', { name: 'Ver ficha de test-pokemon-1025' }).click();
  await expect(page.getByText('A sample entry written in English.')).toBeVisible();
  await page.getByRole('button', { name: 'MOSTRAR TRADUCCIÓN' }).click();
  await expect(page.getByText('Entrada traducida.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'MOSTRAR ORIGINAL' })).toBeVisible();

  await page.getByRole('button', { name: 'MOSTRAR ORIGINAL' }).click();
  await expect(page.getByText('A sample entry written in English.')).toBeVisible();
  await page.getByRole('button', { name: 'MOSTRAR TRADUCCIÓN' }).click();
  await expect(page.getByText('Entrada traducida.')).toBeVisible();
  expect(translationCalls).toBe(1);
});

test('muestra la descripción de habilidad, traduce y cierra el popover', async ({ page }) => {
  let translationCalls = 0;
  await page.route('https://translate.googleapis.com/**', async (route) => {
    translationCalls += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([[['Aumenta la Velocidad al recibir un movimiento eléctrico.']]]) });
  });
  await page.getByRole('button', { name: 'Ver ficha de pikachu' }).click();
  const ability = page.getByRole('button', { name: /Estática/ });
  await ability.click();
  const popover = page.getByRole('tooltip', { name: 'Descripción de Estática' });
  await expect(popover).toContainText('Raises the Pokémon’s Speed');
  await expect(popover).toContainText('TEXTO ORIGINAL EN INGLÉS');
  await popover.getByRole('button', { name: 'MOSTRAR TRADUCCIÓN' }).click();
  await expect(popover).toContainText('Aumenta la Velocidad al recibir un movimiento eléctrico.');
  await popover.getByRole('button', { name: 'MOSTRAR ORIGINAL' }).click();
  await expect(popover).toContainText('Raises the Pokémon’s Speed');
  expect(translationCalls).toBe(1);

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
});

test('abre una evolución y sincroniza la ficha con atrás y adelante del navegador', async ({ page }) => {
  await page.getByRole('button', { name: 'Ver ficha de bulbasaur' }).click();
  await page.getByRole('button', { name: 'Abrir ficha de ivysaur' }).click();
  await expect(page).toHaveURL('/pokemon/2');
  await expect(page.getByRole('heading', { name: 'Ivysaur', level: 1 })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('/pokemon/1');
  await page.goBack();
  await expect(page).toHaveURL('/');
  await page.goForward();
  await expect(page).toHaveURL('/pokemon/1');
  await page.goForward();
  await expect(page).toHaveURL('/pokemon/2');
  await expect(page.getByRole('heading', { name: 'Ivysaur', level: 1 })).toBeVisible();
});
