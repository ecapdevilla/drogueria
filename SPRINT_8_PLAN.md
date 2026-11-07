# Sprint 8 — Operación multiusuario real

**Objetivo:** dejar de usar el espejo de base completa y escribir las operaciones directamente
en Supabase con RPCs transaccionales, manteniendo el modo local para demo/offline.

**Estado (2026-11-07):** bloques 1 y 2 implementados; venta real verificada. Falta ejecutar
la migración de operaciones y probar compras, ajustes, devoluciones y caja.

## 0. Estado del bloque 1

- `supabase/migrations/202611070001_create_sale_rpc.sql` con `create_sale`, `sale_to_json`,
  `idempotency_key` y `line_no`.
- `src/services/cloud-write.service.ts`.
- `VITE_DATA_MODE=cloud` en el frontend.
- POS cobra contra la RPC, muestra “Procesando…” y refresca la base desde Supabase.
- Hidratación desde Supabase al iniciar sesión en modo cloud.
- **Verificado:** migración ejecutada, venta real con RPC 200, stock 115 → 114, FEFO,
  pagos, efectivo, vueltas y movimiento `SALE` correctos.

## 0.1 Estado del bloque 2

- `supabase/migrations/202611070002_operations_rpc.sql` con `require_staff`,
  `create_purchase`, `adjust_lot`, `process_return`, `open_cash` y `close_cash`.
- Escrituras directas para productos, clientes, proveedores y gastos.
- El store usa Supabase cuando `VITE_DATA_MODE=cloud` y refresca la caché local.
- **Verificado:** migración ejecutada; `create_purchase` 200, `adjust_lot` 204, `process_return` 200,
  `open_cash`/`close_cash` 200 (diferencia 0).

---

## 1. Principios

1. **El servidor es la fuente de verdad** para stock, ventas, compras, caja y devoluciones.
2. **Toda operación crítica es una RPC transaccional**. Nunca se aceptan totales, costos o
   stock calculados solo por el cliente.
3. **RLS sigue activo**. La RPC valida rol, organización, sucursal y estado del usuario.
4. **Idempotencia**: cada operación lleva `p_idempotency_key` para evitar duplicados al
   reintentar desde la cola offline.
5. **Modo local intacto**: `VITE_DATA_MODE=local` para demo y E2E; `cloud` para Supabase.

---

## 2. RPCs a implementar

### 2.1 `create_sale`

```sql
create or replace function public.create_sale(
  p_store_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_discount numeric,
  p_customer_id uuid default null,
  p_cash_received numeric default null,
  p_idempotency_key text default null
) returns jsonb
```

Pasos:

1. Validar usuario activo, rol `admin`/`cashier`, `store_id` y organización.
2. Si `p_idempotency_key` ya existe, devolver la venta existente.
3. Bloquear productos/lotes con `for update`.
4. Asignar lotes FEFO (habilitados, con stock y sin vencer).
5. Validar stock vigente y cantidades.
6. Calcular subtotal, descuentos y total **en el servidor**.
7. Insertar `sales`, `sale_items` y `payments`.
8. Descontar `lots.quantity` y `products.stock`.
9. Insertar `movements` tipo `SALE`.
10. Devolver la venta completa con `sale_number`.

### 2.2 `create_purchase`

- Valida proveedor activo.
- Crea lote y movimiento `PURCHASE`.
- Actualiza `purchase_price` y `main_supplier_id`.
- Inserta compra, detalle y total calculado en servidor.

### 2.3 `adjust_lot`

- Valida rol `admin`/`inventory`.
- Actualiza lote y `products.stock` en una transacción.
- Inserta `movements` con `reason` y `note`.
- Bloquea el lote para evitar condiciones de carrera.

### 2.4 `process_return`

- Valida venta no devuelta y rol.
- Inserta devolución/detalle.
- Si `restock`, repone lote y stock.
- Inserta movimiento `RETURN`.
- Marca `sales.returned = true`.

---

## 3. Frontend

### 3.1 Modo de datos

```env
VITE_DATA_MODE=local   # demo/E2E
VITE_DATA_MODE=cloud   # Supabase
```

- `local`: comportamiento actual.
- `cloud`: los servicios llaman a las RPCs; el `DBShape` local queda como caché de lectura.

### 3.2 Cola offline

- Guardar operaciones pendientes en IndexedDB/localStorage:
  `{ id, type, payload, idempotencyKey, createdAt, attempts }`.
- Reintentar al recuperar conexión.
- Si el servidor rechaza por stock, marcar la operación para revisión manual.
- Nunca reintentar una operación sin idempotency key.

### 3.3 Numeración y recibos

- `sale_number` lo asigna el servidor.
- El recibo se puede reimprimir desde la venta sincronizada.
- Las ventas offline usan un identificador temporal hasta que el servidor confirme.

---

## 4. RLS y roles

| Operación | Admin | Cashier | Inventory |
| --- | --- | --- | --- |
| `create_sale` | ✅ | ✅ | ❌ |
| `create_purchase` | ✅ | ❌ | ✅ |
| `adjust_lot` | ✅ | ❌ | ✅ |
| `process_return` | ✅ | ✅ | ❌ |
| Configuración | ✅ | ❌ | ❌ |
| Analítica | ✅ | ❌ | ❌ |

- Probar con usuarios reales `cashier` e `inventory`.
- Verificar que un usuario no pueda cambiar su rol ni de sucursal.
- Verificar que un cashier no pueda borrar ventas ni modificar inventario.

---

## 5. Pruebas

1. **SQL/pgTAP** para las RPCs (si se habilita pgTAP en Supabase).
2. **E2E** con usuarios de prueba:
   - Venta con stock suficiente.
   - Venta rechazada por stock.
   - Compra y actualización de costo.
   - Ajuste de lote.
   - Devolución con y sin reposición.
3. **Pruebas de cola offline** con intercepción de red.
4. **Regresión** de los 186 tests actuales y 6 E2E.

---

## 6. Despliegue y seguridad

- Migraciones nuevas en `supabase/migrations/`.
- No tocar datos de producción sin backup.
- Variables de entorno en Vercel.
- Monitoreo de errores de RPC y de la cola.
- Feature flag para activar `cloud` por sucursal.

---

## 7. Criterios de aceptación

- Una venta creada en un equipo aparece en otro sin recargar manualmente.
- El stock se descuenta una sola vez aunque se reintente la operación.
- Un cashier no puede ejecutar compras, ajustes ni configuración.
- Un inventory no puede vender.
- La app sigue funcionando en modo local para demo/E2E.
- No hay pérdida de datos si se cae la red durante una venta.

---

## 8. Orden sugerido

1. RPC `create_sale` + pruebas + integración de POS.
2. `create_purchase` + integración de Compras.
3. `adjust_lot` + Inventario.
4. `process_return` + Devoluciones.
5. Cola offline y sincronización.
6. Usuarios de prueba y RLS.
7. Despliegue y monitoreo.

> Este documento es un plan. No se implementó en el Sprint 7.
