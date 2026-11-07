import { expect, Page } from '@playwright/test';

/** Deja el navegador con datos demo y sin datos previos. */
export async function cargarDemo(page: Page) {
  await page.goto('/configuracion');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole('button', { name: 'Cargar datos demo' }).click();
  await expect(page.getByText('Datos de demo cargados')).toBeVisible();

  const products = await page.evaluate(() => {
    const raw = localStorage.getItem('drogueria_db_v1');
    return raw ? (JSON.parse(raw) as { products: unknown[] }).products.length : 0;
  });
  expect(products).toBe(5);
}

/** Vende una unidad del código de barras indicado y cierra el recibo. */
export async function venderProducto(page: Page, barcode = '7701234567890') {
  await page.goto('/pos');

  const search = page.getByLabel('Buscar productos para vender');
  await search.fill(barcode);
  await search.press('Enter');

  await expect(page.getByRole('button', { name: /Cobrar/ })).toBeEnabled();
  await page.getByRole('button', { name: /Cobrar/ }).click();

  const cobro = page.getByRole('dialog', { name: 'Cobrar venta' });
  await expect(cobro).toBeVisible();
  await cobro.getByRole('button', { name: 'Confirmar cobro' }).click();

  const recibo = page.getByRole('dialog', { name: 'Venta registrada' });
  await expect(recibo).toBeVisible();
  await recibo.getByRole('button', { name: 'Nueva venta' }).click();
}
