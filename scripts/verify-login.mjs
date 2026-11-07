import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'https://drogueria-ten.vercel.app';
const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(`${url}/login`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.getByLabel('Correo electrónico').fill('estiben.capdevilla@gmail.com');
  await page.getByLabel('Contraseña').fill('clave-incorrecta-verificacion-123');
  await page.getByRole('button', { name: /ingresar/i }).click();

  const alert = await page.getByRole('alert').textContent({ timeout: 20_000 });
  const ok = alert?.includes('Correo o contraseña incorrectos') ?? false;

  console.log(
    JSON.stringify(
      {
        url,
        supabaseReachable: ok,
        alert,
      },
      null,
      2,
    ),
  );

  if (!ok) process.exitCode = 1;
} finally {
  await browser.close();
}
