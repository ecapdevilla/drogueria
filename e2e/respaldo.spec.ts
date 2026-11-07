import { expect, test } from '@playwright/test';
import { cargarDemo } from './helpers';

test('restaura un respaldo después de validarlo y confirmar', async ({ page }) => {
  await cargarDemo(page);

  const db = await page.evaluate(() => {
    const raw = localStorage.getItem('drogueria_db_v1');
    return raw ? JSON.parse(raw) : null;
  });
  if (!db) throw new Error('No se pudo leer la base demo');

  db.products[0].commercialName = 'Producto restaurado';
  const json = JSON.stringify({ ...db, exportedAt: new Date().toISOString() });

  await page.getByLabel('Archivo de respaldo').setInputFiles({
    name: 'respaldo.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });

  const dialog = page.getByRole('dialog', { name: 'Restaurar respaldo' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Restaurar datos' }).click();

  await expect(page.getByText('Base de datos restaurada correctamente')).toBeVisible();
  await page.goto('/productos');
  await expect(page.getByText('Producto restaurado')).toBeVisible();
});
