import { expect, test } from '@playwright/test';
import { cargarDemo } from './helpers';

test('registra una compra y crea el lote en inventario', async ({ page }) => {
  await cargarDemo(page);

  await page.goto('/compras');
  await page.getByRole('button', { name: 'Nueva compra' }).click();

  const dialog = page.getByRole('dialog', { name: 'Nueva compra' });
  await expect(dialog).toBeVisible();

  await dialog
    .getByLabel('Proveedor')
    .selectOption({ label: 'Droguería Distribuciones Andinas SAS' });
  await dialog.getByLabel('Referencia de factura (opcional)').fill('FAC-E2E');
  await dialog.getByLabel('Producto').selectOption({ label: 'Acetaminofén 500mg' });
  await dialog.getByLabel('Cantidad').fill('3');
  await dialog.getByLabel('Costo unit.').fill('900');
  await dialog.getByLabel('Lote').fill('L-E2E');
  await dialog.getByLabel('Vencimiento').fill('2030-12-31');
  await dialog.getByRole('button', { name: 'Registrar compra' }).click();

  await expect(page.getByText('Compra registrada')).toBeVisible();
  await expect(page.getByText('FAC-E2E')).toBeVisible();
  await expect(page.getByText('$ 2.700')).toBeVisible();

  await page.goto('/inventario');
  await expect(page.getByText('L-E2E')).toBeVisible();
});
