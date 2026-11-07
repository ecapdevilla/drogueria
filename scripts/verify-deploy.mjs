import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'https://drogueria-ten.vercel.app';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];

page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  const redirectedToLogin = await page
    .waitForSelector('input[type=email]', { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href')
    .catch(() => null);

  const manifestResponse = await page.request.get(`${url}/manifest.webmanifest`);
  const manifest = manifestResponse.ok() ? await manifestResponse.json() : null;

  let serviceWorker = 'no registrado';
  try {
    serviceWorker = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.scriptURL ?? 'sin activo';
    });
  } catch {
    serviceWorker = 'sin service worker';
  }

  await page.goto(`${url}/analitica`, { waitUntil: 'networkidle', timeout: 60_000 });
  const protectedRouteRedirects = page.url().includes('/login');

  const result = {
    url,
    finalUrl: page.url(),
    title: await page.title(),
    redirectedToLogin,
    protectedRouteRedirects,
    manifestHref,
    manifestName: manifest?.name ?? null,
    manifestIcons: manifest?.icons?.length ?? 0,
    serviceWorker,
    consoleErrors: errors.slice(0, 10),
  };

  console.log(JSON.stringify(result, null, 2));
  if (!redirectedToLogin || !protectedRouteRedirects || !manifestResponse.ok()) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
