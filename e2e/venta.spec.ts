import { expect, test } from '@playwright/test';
import { cargarDemo, venderProducto } from './helpers';

test('registra una venta en efectivo y la refleja en reportes', async ({ page }) => {
  await cargarDemo(page);
  await venderProducto(page);

  await page.goto('/reportes');
  await expect(page.getByText('1 venta en el periodo')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Utilidad por producto' })).toBeVisible();
  await expect(page.getByText('Acetaminofén 500mg').first()).toBeVisible();
});
