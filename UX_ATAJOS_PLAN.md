# Plan de atajos y agilización de módulos

Objetivo: reducir clics y hacer más rápida la operación diaria (escaneo, alta rápida y
navegación) en todos los módulos, con foco inicial en el buscador y atajos de teclado.

## Implementado en esta iteración

- **Atajos globales** (`src/hooks/useHotkeys.ts` + `src/components/ShortcutsHelp.tsx`):
  - `F1`: abrir/cerrar el panel de ayuda de atajos.
  - `Alt + 1…9` y `Alt + 0`: ir a los módulos (1 Dashboard … 9 Devoluciones, 0 Clientes).
  - `F2`: enfocar el buscador de la pantalla actual (donde existe).
- **Productos**:
  - El foco inicia en el buscador.
  - `F2` vuelve al buscador.
  - `N` abre “Nuevo producto”.
  - `Ctrl + Enter` guarda el producto con el modal abierto.
  - Si la búsqueda no coincide con ningún código, aparece “no está en el catálogo” con un
    botón **Crear producto** que rellena el código de barras/código interno.
- **Inventario**:
  - El foco inicia en el buscador de lotes.
  - `F2` vuelve al buscador.
- **Compras**:
  - Cada línea tiene un campo **Código de barras**: escanea o escribe y presiona Enter para
    seleccionar el producto automáticamente.
  - `N` abre “Nueva compra” (con el modal cerrado).
  - `Ctrl + Enter` guarda la compra con el modal abierto.
- **POS** (ya existente): `Enter` escanea, `F2` busca, `F3` cobra.

## Pendiente (siguientes iteraciones)

### 1. Productos libres en compras

Hoy el campo de código de barras solo selecciona productos **ya existentes**. Falta poder
comprar un producto que aún no está guardado. Dos opciones:

- **A) Alta rápida desde Compras:** si el código no existe, abrir un modal de “crear
  producto” prellenado con el código y dejar continuar la compra.
- **B) Línea libre:** permitir ítems sin `productId` (solo nombre + costo + lote + vencimiento),
  y crear el producto/lote al guardar.

**Decisión pendiente con el usuario.** Recomendación: A (mantiene el catálogo íntegro).

### 2. Atajos en el resto de módulos

| Módulo | Atajos propuestos |
| --- | --- |
| POS | `F4` imprimir recibo · `Escape` limpiar carrito (ya parcial) |
| Caja | `N` abrir caja · `C` cerrar caja · `F2` foco |
| Gastos | `N` nuevo gasto · `Ctrl+Enter` guardar · `F2` foco |
| Devoluciones | `F2` foco · `Ctrl+Enter` procesar |
| Clientes | `N` nuevo cliente · `F2` foco |
| Proveedores | `N` nuevo proveedor · `F2` foco |
| Reportes | `F2` foco en fechas · exportaciones con `Ctrl+E` |
| Configuración | `B` respaldo · `S` sincronizar |

### 3. Navegación

- Añadir `Alt + R` (reportes), `Alt + A` (analítica) y `Alt + C` (configuración).
- Permitir personalizar teclas en Configuración (opcional, más adelante).

### 4. Foco inicial por defecto

- En todo módulo con buscador, el foco inicia en el buscador.
- En modales de formulario, el foco inicia en el primer campo (ya lo hace el `Modal`).

## Cómo implementar

- Usa `useHotkeys([...], deps)` en cada página; las teclas de una letra se ignoran al
  escribir en inputs (marcar `allowInInput` para `F1`/`F2`/`Ctrl+Enter`).
- Registra los atajos contextuales en `ShortcutsHelp` para documentarlos al usuario.
- Añade una prueba por atajo con `renderHook`/`userEvent` si la lógica lo amerita.

## Pruebas

- `src/hooks/useHotkeys.test.ts` cubre el comportamiento del hook.
- Smoke test en navegador de autofoco, `N`, banner de producto inexistente, búsqueda por
  código en compras y panel `F1`.
