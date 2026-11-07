# Plan de atajos y agilización de módulos

Objetivo: reducir clics y hacer más rápida la operación diaria (escaneo, alta rápida y
navegación) en todos los módulos.

## Implementado

### Global (`Shell` + `ShortcutsHelp`)

- `F1`: abrir/cerrar el panel de atajos con la lista global y la contextual.
- `Alt + 1…9` y `Alt + 0`: ir a los módulos principales.
- `Alt + R / A / C`: Reportes / Analítica / Configuración.
- `F2`: enfocar el buscador de la pantalla actual.

### Productos

- Foco inicial en el buscador.
- `F2` vuelve al buscador.
- `Alt + N` (o `N` fuera de inputs): nuevo producto.
- `Ctrl + Enter`: guardar con el modal abierto.
- Si un código no existe, banner **Crear producto** que rellena código de barras e interno.

### Inventario

- Foco inicial en el buscador de lotes.
- `F2` vuelve al buscador.
- Búsqueda por nombre, lote, código interno y **código de barras**.

### Compras

- Campo **Código de barras** por línea: Enter busca y selecciona el producto.
- Si el código no existe, **Crear producto** abre un alta rápida con el código precargado,
  crea el producto y lo selecciona en la línea.
- `Alt + N` (o `N` fuera de inputs): nueva compra.
- `Ctrl + Enter`: guardar la compra.

### Caja

- `Alt + N`: enfocar monto de apertura.
- `Alt + C`: enfocar monto de cierre.
- Enter en cada monto ejecuta la acción.

### Gastos

- Foco inicial en el buscador.
- Filtro por descripción, categoría, método y notas.
- `F2`: volver al buscador.
- `Alt + N`: nuevo gasto.
- `Alt + E`: exportar gastos CSV.
- `Ctrl + Enter`: guardar.

### Devoluciones

- Foco inicial en la selección de venta.
- `F2`: volver a la selección.
- `Ctrl + Enter`: procesar la devolución.

### Clientes y Proveedores

- Foco inicial en el buscador.
- `F2`: volver al buscador.
- `Alt + N`: nuevo registro.
- `Ctrl + Enter`: guardar.

### Reportes

- `F2`: enfocar la fecha inicial.
- `Alt + E`: exportar ventas CSV.

### Configuración

- `Alt + B`: descargar respaldo.
- `Alt + S`: abrir la confirmación de sincronización con Supabase.

### POS

- Enter escanea/agrega por código.
- `F2` busca, `F3` cobra.
- `F4` imprime el recibo visible.
- `Escape` vacía el carrito cuando no hay modal abierto.

## Pendiente / próximas mejoras

- Búsqueda por código de barras en Reportes.
- Personalización de teclas desde Configuración.
- Mostrar un indicador visual de “atajo disponible” en los botones principales.
- Extender el alta rápida de producto a otros flujos si se requiere.

## Pruebas

- `src/hooks/useHotkeys.test.ts`: modificadores, inputs y `allowInInput`.
- `e2e/atajos.spec.ts`: F1, Alt+N, alta rápida desde Productos y desde Compras.
- Regresión completa: unitarias, E2E y PWA.
