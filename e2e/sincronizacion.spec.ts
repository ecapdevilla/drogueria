import { expect, test } from '@playwright/test';
import { cargarDemo, venderProducto } from './helpers';

test('sincroniza los datos entre pestañas abiertas', async ({ context }) => {
  const ventas = await context.newPage();
  await cargarDemo(ventas);

  const dashboard = await context.newPage();
  await dashboard.goto('/');
  await expect(dashboard.getByText('0 venta(s) registradas')).toBeVisible();

  await venderProducto(ventas);

  await expect(dashboard.getByText('1 venta(s) registradas')).toBeVisible();
  await expect(dashboard.getByText('$ 1.500').first()).toBeVisible();
});
