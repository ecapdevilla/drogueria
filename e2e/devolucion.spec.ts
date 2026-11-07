import { expect, test } from '@playwright/test';
import { cargarDemo, venderProducto } from './helpers';

test('procesa la devolución de una venta y repone el stock', async ({ page }) => {
  await cargarDemo(page);
  await venderProducto(page);

  await page.goto('/devoluciones');
  await page.getByLabel('Venta', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Razón de la devolución').fill('Producto defectuoso');
  await page.getByRole('button', { name: 'Procesar devolución' }).click();

  await expect(page.getByText('Devolución registrada')).toBeVisible();
  await expect(page.getByText('Producto defectuoso')).toBeVisible();
  await expect(page.getByText('Sin ventas pendientes')).toBeVisible();
});
