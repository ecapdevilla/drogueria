import { expect, test } from '@playwright/test';
import { cargarDemo } from './helpers';

test('atajos y alta rápida de producto desde Productos', async ({ page }) => {
  await cargarDemo(page);
  await page.goto('/productos');

  const search = page.getByLabel('Buscar productos');
  await expect(search).toBeFocused();

  await page.keyboard.press('F1');
  await expect(page.getByRole('dialog', { name: 'Atajos de teclado' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.keyboard.press('Alt+n');
  const dialog = page.getByRole('dialog', { name: 'Nuevo producto' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();

  await search.fill('9999999999');
  await expect(page.getByText('no está en el catálogo')).toBeVisible();
  await page.getByRole('button', { name: 'Crear producto' }).click();

  const createDialog = page.getByRole('dialog', { name: 'Nuevo producto' });
  await expect(createDialog.getByLabel('Código de barras')).toHaveValue('9999999999');
  await createDialog.getByLabel('Nombre comercial').fill('Producto de prueba atajos');
  await createDialog.getByLabel('Categoría').fill('Pruebas');
  await createDialog.getByLabel('Costo (COP)').fill('1000');
  await createDialog.getByLabel('Precio de venta (COP)').fill('1500');
  await createDialog.getByRole('button', { name: 'Crear producto' }).click();

  await expect(page.getByText('Producto de prueba atajos')).toBeVisible();
});

test('alta rápida de producto desde una línea de compra', async ({ page }) => {
  await cargarDemo(page);
  await page.goto('/compras');
  await page.getByRole('button', { name: 'Nueva compra' }).click();

  const purchase = page.getByRole('dialog', { name: 'Nueva compra' });
  const barcode = purchase.getByLabel('Código de barras');
  await barcode.fill('8888888888');
  await barcode.press('Enter');
  await expect(purchase.getByText('No encontrado en el catálogo.')).toBeVisible();

  await purchase.getByRole('button', { name: 'Crear producto' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Crear producto para la compra' });
  await expect(createDialog.getByLabel('Código de barras')).toHaveValue('8888888888');
  await createDialog.getByLabel('Nombre comercial').fill('Producto compra rápida');
  await createDialog.getByLabel('Categoría').fill('Pruebas');
  await createDialog.getByLabel('Costo (COP)').fill('2000');
  await createDialog.getByLabel('Precio de venta (COP)').fill('3000');
  await createDialog.getByRole('button', { name: 'Crear y seleccionar' }).click();

  await expect(purchase.getByText('Producto compra rápida creado y seleccionado')).toBeVisible();
  await expect(purchase.getByLabel('Producto')).not.toHaveValue('');
});
