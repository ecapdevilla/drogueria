# Guía de pruebas (UAT) — Droguería

**URL de producción:** https://drogueria-ten.vercel.app  
**Fecha:** 2026-11-07  
**Alcance:** prueba controlada con un usuario **administrador**.

> Esta guía es para que una persona pruebe la app y devuelva retroalimentación. No es una
> guía técnica de desarrollo.

## Antes de empezar

1. Abre **https://drogueria-ten.vercel.app** en Chrome o Edge actualizado.
2. Inicia sesión con el usuario administrador que te entregue el dueño del proyecto.
3. En **Configuración**, usa **Cargar datos demo** para tener productos, lotes y ventas de
   ejemplo. Así no se mezclan datos reales con la prueba.
4. Si vas a probar en otro equipo o navegador, usa **Configuración → Descargar de Supabase**
   para traer los datos que ya se hayan sincronizado.
5. Instala la PWA si quieres probar el modo offline: menú del navegador → **Instalar
   aplicación**.

### Importante sobre los datos

- La operación se guarda en el navegador (`localStorage`).
- El administrador sincroniza automáticamente hacia Supabase después de cada cambio.
- Si borras los datos del sitio, pierdes la copia local; puedes recuperarla desde
  **Descargar de Supabase** si ya se había sincronizado.
- Para esta prueba usa **datos demo**, no datos reales de pacientes.

## Escenarios de prueba

Marca cada uno como ✅ OK, ⚠️ con observaciones o ❌ falló.

### 1. Acceso y navegación

- [ ] La raíz redirige al login.
- [ ] Login con el usuario administrador.
- [ ] Logout desde el botón de la barra superior.
- [ ] Navegación por Dashboard, Productos, Inventario, POS, Compras, Proveedores, Caja,
      Gastos, Devoluciones, Clientes, Reportes, Analítica y Configuración.
- [ ] En móvil, el menú lateral abre y cierra correctamente.

### 2. Dashboard

- [ ] Muestra KPIs, ventas por método de pago, gastos y top productos.
- [ ] Los enlaces “Nueva venta”, “Ver reportes”, etc. funcionan.

### 3. Productos

- [ ] El foco inicia en el buscador.
- [ ] `F2` vuelve al buscador; `Alt + N` abre “Nuevo producto”.
- [ ] Crear un producto de prueba con nombre, categoría, costo, precio y stock mínimo.
- [ ] Buscar por nombre, código interno y código de barras.
- [ ] Si buscas un código que no existe, aparece **Crear producto** con el código precargado.
- [ ] Editar y desactivar/reactivar un producto.
- [ ] `Ctrl + Enter` guarda el formulario.

### 4. Inventario

- [ ] Filtros por vencimiento: todos, vencidos, ≤30 días, ≤90 días.
- [ ] Búsqueda por producto, lote, código interno y código de barras.
- [ ] Ajustar la cantidad de un lote y verificar que el stock cambia.
- [ ] Descargar un lote vencido y verificar que queda en 0/deshabilitado.
- [ ] El CSV de inventario descarga y abre correctamente.

### 5. POS

- [ ] Escanear/escribir un código de barras y presionar Enter agrega el producto.
- [ ] `F2` enfoca la búsqueda; `F3` abre el cobro.
- [ ] Aplicar descuento por línea y descuento global.
- [ ] Cobrar con pago mixto (efectivo + tarjeta).
- [ ] Ingresar efectivo recibido y verificar vueltas.
- [ ] Confirmar la venta y ver el recibo.
- [ ] `F4` imprime el recibo (si el navegador lo permite).
- [ ] `Escape` vacía el carrito cuando no hay modal abierto.
- [ ] El stock del producto disminuye.

### 6. Compras

- [ ] Crear una compra con proveedor, producto, cantidad, costo, lote y vencimiento.
- [ ] Buscar un producto por código de barras dentro de la línea de compra.
- [ ] Si el código no existe, crear el producto desde la compra y verificar que queda
      seleccionado.
- [ ] Verificar que el stock aumenta y el costo del producto se actualiza.

### 7. Proveedores y clientes

- [ ] Crear, editar, buscar y desactivar/reactivar un proveedor.
- [ ] Crear y buscar un cliente por nombre, teléfono o identificación.

### 8. Caja

- [ ] Abrir caja con un monto inicial.
- [ ] Realizar una venta en efectivo y verificar el efectivo esperado.
- [ ] Cerrar caja con el dinero contado y ver la diferencia.
- [ ] Revisar el arqueo por medio de pago y descargar el CSV.

### 9. Gastos

- [ ] Crear un gasto con categoría, descripción, monto y método.
- [ ] Buscar por descripción/categoría/método (`F2`).
- [ ] Exportar gastos CSV (`Alt + E`).

### 10. Devoluciones

- [ ] Seleccionar una venta, escribir la razón y procesar la devolución.
- [ ] Verificar la reposición de stock si está marcada.

### 11. Reportes

- [ ] Filtrar por rango de fechas.
- [ ] Verificar ventas, ticket promedio, utilidad y gastos.
- [ ] Ver utilidad por producto/categoría, top productos y pagos.
- [ ] Descargar los CSV.

### 12. Analítica

- [ ] Abrir **Analítica** y verificar los KPIs.
- [ ] Ver ventas por día, utilidad por producto/categoría, medios de pago, clientes e
      inventario.
- [ ] Probar **Sincronizar ahora** y la fecha de última sincronización.
- [ ] Descargar los CSV de analítica.

### 13. Configuración y respaldos

- [ ] Descargar respaldo JSON.
- [ ] Verificar que el recordatorio de respaldo desaparece.
- [ ] Probar **Descargar de Supabase** en otro navegador/equipo.
- [ ] Probar **Subir datos a Supabase** (solo administrador).
- [ ] No reinicies datos si no tienes respaldo.

### 14. PWA y offline

- [ ] Instalar la aplicación desde el navegador.
- [ ] Abrir la app instalada.
- [ ] Recargar sin conexión y verificar que abre el shell.
- [ ] Volver a conectar y seguir operando.

### 15. Atajos de teclado

- [ ] `F1` muestra la ayuda de atajos.
- [ ] `Alt + 1…9` navega entre módulos.
- [ ] `Alt + R/A/C` abre Reportes/Analítica/Configuración.
- [ ] `Alt + N` crea en Productos, Compras, Gastos, Clientes y Proveedores.
- [ ] `Ctrl + Enter` guarda en los formularios.
- [ ] En POS: Enter agrega, `F2` busca, `F3` cobra, `F4` imprime, Escape vacía carrito.

## Limitaciones conocidas (no son fallos de esta prueba)

- La sincronización automática es solo para el **administrador**.
- Los usuarios `cashier` e `inventory` aún no sincronizan sus cambios locales; eso llega en
  el Sprint 8.
- No hay WhatsApp ni IA todavía.
- No hay multi-sucursal.
- Si dos administradores editan a la vez, gana la última escritura.
- Los correos de confirmación/recuperación de Supabase requieren que el dueño configure el
  Site URL y las Redirect URLs en Supabase.

## Qué reportar

Usa la plantilla [`UAT_FEEDBACK.md`](./UAT_FEEDBACK.md). Para cada hallazgo incluye:

- Módulo y paso exacto.
- Qué esperabas que pasara.
- Qué pasó realmente.
- Navegador, dispositivo y si estabas en la app instalada o en el navegador.
- Captura de pantalla si es posible.
- Severidad: bloqueante / alta / media / baja.

## Al terminar

- Cierra sesión o deja la app en el Dashboard.
- No borres los datos si quieres que el equipo revise algo.
- Envía la plantilla de feedback al dueño del proyecto.
