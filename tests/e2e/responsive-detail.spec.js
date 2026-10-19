import { expect, test } from '@playwright/test';
import { installPokeApiMocks } from './helpers/pokeapi-mocks.js';

// Mantiene los datos deterministas mientras prueba disposición, desplazamiento e interacción responsive.
test.beforeEach(async ({ page }) => {
  await installPokeApiMocks(page);
  await page.goto('/');
  await expect(page.locator('.pokemon-row')).toHaveCount(60);
});

test('en mobile ordena los datos antes de las habilidades y permite recorrer una cadena lineal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pokemon/1');
  await expect(page.getByRole('heading', { name: 'Bulbasaur', level: 1 })).toBeVisible();

  const artwork = page.locator('.detail-page-art');
  const overview = page.locator('.detail-overview');
  const abilities = page.locator('.abilities-panel');
  await expect.poll(async () => {
    const artBox = await artwork.boundingBox();
    const overviewBox = await overview.boundingBox();
    const abilitiesBox = await abilities.boundingBox();
    return Boolean(artBox && overviewBox && abilitiesBox
      && overviewBox.y >= artBox.y + artBox.height
      && abilitiesBox.y >= overviewBox.y + overviewBox.height);
  }).toBe(true);

  const chain = page.locator('.evolution-chain-scroll');
  await expect.poll(() => chain.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await expect(chain).toHaveCSS('scrollbar-width', 'none');
  const next = page.getByRole('button', { name: 'Mostrar más evoluciones' });
  await expect(next).toBeVisible();
  await next.click();
  await expect(page.getByRole('button', { name: 'Mostrar evoluciones anteriores' })).toBeVisible();
  await expect.poll(() => chain.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
});

test('la cadena ramificada de Eevee muestra flechas para recorrer sus ocho evoluciones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pokemon/133');
  await expect(page.locator('.evolution-branch.is-eevee-split')).toBeVisible();
  await expect(page.locator('.evolution-entry')).toHaveCount(9);

  const chain = page.locator('.evolution-chain-scroll');
  await expect.poll(() => chain.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Mostrar más evoluciones' }).click();
  await expect(page.getByRole('button', { name: 'Mostrar evoluciones anteriores' })).toBeVisible();
  await expect.poll(() => chain.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
});

test('en mobile las efectividades se recorren con las flechas y sin scrollbar visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pokemon/1');
  const row = page.locator('.effectiveness-type-scroll-shell.is-scrollable').first();
  await expect(row).toBeVisible();
  const types = row.locator('.effectiveness-type-list');
  await expect(types).toHaveCSS('scrollbar-width', 'none');
  await row.getByRole('button', { name: 'Mostrar más tipos' }).click();
  await expect(row.getByRole('button', { name: 'Mostrar tipos anteriores' })).toBeVisible();
  await expect.poll(() => types.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
});

test('en mobile el selector de formas anuncia el desbordamiento y mantiene visible la forma elegida', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pokemon/718');
  const shell = page.locator('.form-options-shell.is-scrollable');
  await expect(shell).toBeVisible();
  await shell.getByRole('button', { name: 'Mostrar más formas' }).click();
  await expect(shell.getByRole('button', { name: 'Mostrar formas anteriores' })).toBeVisible();

  const mega = page.getByRole('button', { name: 'Mega Zygarde' });
  await mega.click();
  await expect(mega).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => mega.evaluate((node) => {
    const viewport = node.closest('.form-options').getBoundingClientRect();
    const item = node.getBoundingClientRect();
    return item.left >= viewport.left && item.right <= viewport.right;
  })).toBe(true);
});

test('desktop y tablet mantienen artwork y habilidades en la columna izquierda', async ({ page }) => {
  await page.goto('/pokemon/1');
  await expect(page.getByRole('heading', { name: 'Bulbasaur', level: 1 })).toBeVisible();

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport);
    const artwork = await page.locator('.detail-page-art').boundingBox();
    const overview = await page.locator('.detail-overview').boundingBox();
    const abilities = await page.locator('.abilities-panel').boundingBox();
    expect(artwork).not.toBeNull();
    expect(overview).not.toBeNull();
    expect(abilities).not.toBeNull();
    expect(overview.x).toBeGreaterThan(artwork.x + artwork.width * 0.75);
    expect(Math.abs(overview.y - artwork.y)).toBeLessThan(30);
    expect(Math.abs(abilities.x - artwork.x)).toBeLessThan(2);
    expect(abilities.y).toBeGreaterThanOrEqual(artwork.y + artwork.height);
  }
});

test('en una tablet táctil el primer toque previsualiza y el segundo abre la ficha', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await installPokeApiMocks(page);
    await page.goto('/');
    const row = page.locator('.pokemon-row').first();
    await expect(row).toBeVisible();
    await row.tap();
    await expect(page.locator('.preview-name')).toHaveText('bulbasaur');
    await expect(page).toHaveURL('/');

    await page.locator('.pokemon-row').first().tap();
    await expect(page).toHaveURL('/pokemon/1');
  } finally {
    await context.close();
  }
});
