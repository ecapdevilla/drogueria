import { expect, test } from '@playwright/test';

test('la PWA se registra y responde offline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBe('/manifest.webmanifest');

  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).name).toContain('Droguería');

  await page.waitForFunction(async () => {
    await navigator.serviceWorker.ready;
    return navigator.serviceWorker.controller !== null;
  });

  // La navegación profunda también debe funcionar desde el shell cacheado.
  await page.goto('/reportes');
  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible();

  // Simula pérdida de red: el service worker debe servir el shell desde caché.
  await page.route('**/*', route => route.abort('failed'));
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible();
  await page.unroute('**/*');
});
