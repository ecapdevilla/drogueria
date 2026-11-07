# HANDOFF — Estado del proyecto entre sesiones

> **Memoria compartida.** Si abres una sesión nueva, lee esto antes que nada.
> Última actualización: **2026-11-06**.

## 1. Qué estamos construyendo

App de gestión para una **droguería/farmacia**: productos, inventario, punto de venta,
compras, proveedores, caja, gastos, devoluciones, clientes, reportes y configuración.

- **SPA sin backend.** Persistencia en `localStorage` (clave `drogueria_db_v1`).
- **12 rutas** definidas en `src/App.tsx`.
- **Idioma de la UI y los mensajes:** español.
- **Ubicación:** `C:\Users\BS-TECNOLOGI02\Downloads\ejemplo drogeuria`

### Stack
React 18 · TypeScript 5 · Vite 5 · Zustand 4 · React Router 6 · Tailwind 3 ·
Zod 4 · React Hook Form 7 · Vitest 2 + Testing Library.

---

## 2. Estado actual

| Área | Estado |
| --- | --- |
| Fase 0 (funcionalidad base) | ✅ Completa |
| Fase 1 (robustez + validación + tests + rediseño) | ✅ Completa y verificada |
| Fase 2 · Sprint 1 (Proveedores y compras) | ✅ Completo y verificado |
| Fase 2 · Sprint 2 (Inventario: vencimientos y ajustes) | ✅ Completo y verificado |
| Fase 2 · Sprint 3 (POS de mostrador) | ✅ Completo y verificado |
| Fase 2 · Sprint 4 (Reportes que sirven para decidir) | ✅ Completo y verificado |
| **Fase 2 · Sprint 5 (Durabilidad y PWA)** | ✅ **Completo y verificado** |
| **Fase 3 · Sprint 6 (Supabase, auth y roles)** | ✅ **Completo y verificado** |
| **Fase 3 · Sprint 7 (Datos y analítica)** | 🚧 **En curso** |

### Verificación de la última sesión (2026-11-06)

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ Sin errores |
| `npm run lint` | ✅ Sin errores ni warnings |
| `npm run test` | ✅ **185/185 pruebas en 23 archivos** |
| `npm run build` | ✅ Build de producción generado (incluye manifest, iconos y `sw.js`) |
| `npm run test:e2e` | ✅ **5/5** (venta, compra, devolución, respaldo y sincronización entre pestañas) |
| `npm run test:e2e:pwa` | ✅ **1/1** (manifest, service worker y recarga offline sobre el build) |
| Supabase | ✅ Migraciones y seed ejecutados; login real con `estiben.capdevilla@gmail.com` (rol `admin`), organización/sucursal visibles y RLS bloqueando anónimos |
| Smoke test navegador | ✅ Respaldo descargado (JSON v2 con `settings.lastBackupAt`), recordatorio desaparece, migración real v1→v2 en `localStorage` y demo restaurada |

---

## 3. Cómo ejecutar

```powershell
cd "C:\Users\BS-TECNOLOGI02\Downloads\ejemplo drogeuria"
npm install          # solo la primera vez
npm run dev          # http://localhost:5173
```

Scripts disponibles: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`,
`format:check`, `test`, `test:watch`, `test:coverage`.

---

## 4. Arquitectura y mapa de archivos

```
src/
├─ domain/
│  ├─ schemas.ts        ← Fuente de verdad de la validación (Zod)
│  └─ validation.ts     ← Helper getErrorMessage()
├─ store/
│  └─ useAppStore.ts    ← Zustand: db, toasts, acciones, persistencia
├─ services/            ← Lógica de negocio pura (testeable)
│  ├─ product, sale, purchase, cash, expense,
│  ├─ customer, return, report, seed, storage
│  ├─ inventory       ← FEFO, semáforo de vencimientos y ajustes trazables
│  └─ supplier        ← CRUD de proveedores (desactivación lógica)
├─ pages/               ← 12 pantallas
│  ├─ Dashboard, Products, Inventory, POS, Purchases,
│  ├─ Suppliers, Cash, Expenses, Returns, Customers,
│  └─ Reports, Settings
├─ components/
│  ├─ layout/           ← Shell, Sidebar, Topbar, PageHeader
│  ├─ ui/               ← Button, Input, Select, Textarea, Checkbox,
│  │                       Modal, DataTable, Table, Badge, Toast,
│  │                       EmptyState, ConfirmDialog
│  ├─ charts/           ← KPI, MiniBarChart
│  ├─ pos/              ← PaymentModal (pagos mixtos), SaleReceipt (80 mm)
│  └─ ErrorBoundary.tsx ← Captura global de errores
├─ types/               ← index.ts (dominio), schema.ts (DBShape, emptyDB)
├─ hooks/               ← useProducts, useSales, useToast
├─ utils/               ← money (COP), date, csv, id, payments
└─ test/                ← setup.ts, fixtures.ts
```

**Flujo de datos:** página → `useAppStore` (valida con Zod) → servicio puro → nuevo `db`
→ `set()` → `save()` en `localStorage` → toast.

---

## 5. Decisiones tomadas (no las reviertas sin motivo)

1. **Zod v4** con esquemas que exponen tipos de entrada/salida compatibles con RHF.
2. **`forwardRef` obligatorio** en `Input`, `Select`, `Textarea` y `Checkbox`.
   Sin esto, React Hook Form no registra los campos y los formularios fallan en silencio.
3. **Mensajes en español** con formato `El campo "nombre" es obligatorio`.
   Los números muestran mensajes amigables para valores inválidos o ausentes.
4. **`any` permitido en el store**; la regla `no-explicit-any` está desactivada en ESLint.
5. **Paleta `brand` (índigo)** + Inter/Plus Jakarta Sans; sidebar oscuro responsive;
   modal de caja en la topbar (se eliminó el uso de `prompt()`).
6. **No se aplicó `npm audit fix`** para no cambiar versiones sin confirmación.
7. **Proveedores se desactivan, no se borran** (desactivación lógica). `Supplier.active`
   es opcional: `undefined` significa activo, para compatibilidad con datos anteriores.
8. **Al registrar una compra** se actualiza el `purchasePrice` del producto con el último
   costo y se asigna el proveedor como `mainSupplierId`. Las compras rechazan proveedores
   inexistentes o inactivos.
9. **No se venden lotes vencidos.** FEFO filtra por `enabled`, existencias y vencimiento;
   el POS muestra el stock vigente y deshabilita productos que solo tienen unidades vencidas.
10. **Todo ajuste de inventario es trazable.** `adjustLot` actualiza lote y stock del producto
    y crea un `Movement` `ADJUSTMENT`/`EXPIRED` con `reason` y `note`. No se edita el stock
    directamente desde la UI.
11. **El stock del producto debe cuadrar con sus lotes.** Cualquier diferencia se corrige
    con un ajuste, no borrando o creando lotes a mano.
12. **Descuentos en dos niveles.** `SaleItem.discount` es el descuento de la línea y
    `Sale.discount` el descuento global; ambos se restan del total, de la utilidad y de los
    reportes. El descuento global nunca supera lo que queda después de las líneas.
13. **Pagos mixtos.** `Sale.payments` guarda el desglose (`PaymentSplit[]`); `Sale.paymentMethod`
    queda como método principal (el de mayor monto) para compatibilidad. Las ventas antiguas
    sin `payments` se interpretan con `paymentMethod` y el total.
14. **Caja con pagos mixtos.** `expectedCash` suma únicamente la porción `CASH` de cada venta
    (`saleCashAmount`), no el total cuando hay parte en tarjeta o transferencia.
15. **Recibo térmico de 80 mm.** `SaleReceipt` se imprime con `@media print` (`size: 80mm auto`);
    el efectivo recibido y las vueltas solo se guardan cuando hay parte en efectivo.
16. **Reportes por rango de fechas.** `ReportRange { from?, to? }` acepta `YYYY-MM-DD` o ISO.
    Los límites sin hora se interpretan en **hora local** (el `to` incluye todo el día).
    Sin rango, los reportes analizan todo el historial.
17. **Utilidad con descuento global.** El descuento global se reparte proporcionalmente entre
    las líneas de cada venta para calcular la utilidad por producto y por categoría, de modo
    que la suma cuadre con la utilidad bruta. `topProducts` ordena por **ingresos netos**.
18. **Arqueo de caja por medio de pago.** `cashAudit` desglosa ventas y gastos por método y
    calcula el efectivo esperado con la porción `CASH`. `expectedCash` (y el arqueo) acotan
    los movimientos entre `openedAt` y `closedAt`, para auditar sesiones cerradas.
19. **Fechas sin hora en la UI.** Usa `formatDateOnly('YYYY-MM-DD')` para no mostrar el día
    anterior en zonas horarias UTC negativas; `formatDate` sigue siendo para fechas ISO.
20. **Esquema v2 y migraciones reales.** `SCHEMA_VERSION = 2`; la v2 añade
    `db.settings` (`backupReminderDays` y `lastBackupAt`). `migrate()` aplica migraciones
    incrementales, rechaza versiones más recientes y valida el resultado con `dbSchema`.
    Los datos de v1 se migran automáticamente al cargar.
21. **Respaldos validados antes de restaurar.** `parseBackup()` valida el JSON con Zod sin
    guardar; la UI pide confirmación y solo entonces reemplaza la base. Si el almacenamiento
    está corrupto, se conserva una copia en `drogueria_db_recovery_<fecha>`.
22. **Recordatorio de respaldo.** `backupStatus()` marca pendiente si nunca se descargó o si
    pasaron `backupReminderDays` (7 por defecto). Descargar un respaldo actualiza
    `settings.lastBackupAt` y oculta el aviso.
23. **PWA.** `public/manifest.webmanifest`, iconos y `public/sw.js`; el service worker se
    registra solo en producción. Precarga el index y los assets con hash, sirve navegación
    con red primero y assets con caché primero. Sube `CACHE` al cambiar el shell.
24. **Sincronización entre pestañas.** `main.tsx` escucha el evento `storage` y recarga la
    base cuando otra pestaña guarda. `StorageService.load` solo reescribe si la migración o
    normalización cambió el JSON, para evitar escrituras y eventos innecesarios.

---

## 6. Estado de Git

- Rama: **`master`**, un solo commit inicial (`6e0b964`).
- **Fase 0 + Fase 1 + Sprints 1, 2, 3, 4 y 5 de Fase 2 están SIN COMMIT.**
- El directorio padre (`Downloads`) **no** es un repo; el repo está dentro del proyecto.
- Los archivos `deepseek_*.ts(x)` de la raíz están fuera del build y del lint.

> Si el usuario pide commitear, propone mensajes por fase/sprint, por ejemplo:
> `feat(fase-2): proveedores y compras completas`

---

## 7. Roadmap de Fase 2 (Track A) y próximos pasos

**Alcance aprobado:** Fase 2 = operación real sin backend, sprint a sprint.
Backend/usuarios se dejan para Fase 3.

### ✅ Sprint 1 — Proveedores y compras completas
- Página `/proveedores` con crear, editar, buscar, activar y desactivar.
- `supplier.service.ts` + esquema Zod + pruebas de servicio y de página.
- Selector de compras alimentado por proveedores activos de la base real.
- Aviso con enlace a Proveedores cuando no hay proveedores activos.
- Compras actualizan stock, lote, movimiento, `purchasePrice` y `mainSupplierId`.
- Datos demo con NIT, contacto, teléfono, correo y dirección.

### ✅ Sprint 2 — Inventario real: vencimientos y ajustes
- Semáforo de vencimientos: vencido / ≤30 días / ≤90 días / vigente, con KPIs,
  búsqueda, filtros por estado y exportación CSV.
- Ajustes con motivo (conteo, daño, vencimiento, otro): actualizan lote y stock y crean
  un movimiento `ADJUSTMENT`/`EXPIRED` con `reason` y `note`.
- Descarga rápida de lotes vencidos: cantidad 0, lote deshabilitado y movimiento `EXPIRED`.
- POS bloquea unidades vencidas, muestra el stock vigente y avisa de unidades vencidas.
- Seed demo con lotes vencidos y próximos a vencer para probar el semáforo.
- **Criterio cumplido:** el ajuste cambia el stock, deja movimiento trazable y el reporte
  de movimientos incluye motivo y nota.

### ✅ Sprint 3 — POS de mostrador
- Lector de código de barras: Enter agrega por código de barras o código interno exacto.
- Atajos: **F2** enfoca la búsqueda, **F3** abre el cobro.
- Descuento por línea y descuento global, con límites y vista previa del ahorro.
- `PaymentModal` con pagos mixtos, efectivo recibido, cálculo de vueltas y validación Zod
  de que los pagos suman el total.
- `SaleReceipt` imprimible de 80 mm con desglose de descuentos, pagos, efectivo y vueltas.
- Reportes y CSV con descuentos por línea, descuentos globales y desglose de pagos.
- **Criterio cumplido:** una venta con pago mixto descuenta stock, guarda el desglose de
  pagos, calcula vueltas, imprime el recibo y la caja suma solo la parte en efectivo.

### ✅ Sprint 4 — Reportes que sirven para decidir
- `report.service.ts`: `ReportRange`, `rangeMatcher`, `filterSalesByRange`,
  `filterMovementsByRange`, `averageTicket`, `productPerformance`, `categoryPerformance`
  y `topProducts` por ingresos netos.
- El descuento global se reparte proporcionalmente entre las líneas para la utilidad.
- Página `/reportes`: filtro Desde/Hasta, ticket promedio, utilidad por producto/categoría,
  top productos, pagos, gastos y 5 exportaciones CSV (ventas, utilidad, categorías, pagos,
  movimientos).
- `cash.service.ts`: `cashAudit` desglosa ventas/gastos por medio de pago,
  `cashAuditToCSV` exporta el arqueo y `expectedCash` acota por `closedAt`.
- Página `/caja`: sección de arqueo con selector de sesión, tabla por método, resumen de
  efectivo esperado/contado/diferencia y exportación CSV.
- `formatDateOnly` evita que las fechas de los filtros se muestren un día antes en zonas
  UTC negativas.
- **Criterio cumplido:** se puede filtrar un periodo, ver utilidad por producto/categoría,
  exportar CSV y auditar una caja por medio de pago.

### ✅ Sprint 5 — Durabilidad y PWA
- **Esquema v2 con migraciones reales:** `migrate()` aplica la migración v1→v2 que añade
  `settings`, rechaza versiones futuras y valida con `dbSchema` (Zod).
- **Respaldo validado:** `parseBackup()` valida el JSON antes de restaurar; la UI muestra un
  diálogo de confirmación con el resumen del respaldo. Si la carga falla, la copia corrupta
  se conserva para recuperación manual.
- **Recordatorio de respaldo:** aviso en Configuración cuando nunca se descargó o pasaron
  los días configurados; el botón actualiza `settings.lastBackupAt`.
- **PWA:** manifest, iconos 192/512/maskable, service worker con precarga de assets y
  recarga offline; se registra solo en producción.
- **E2E con Playwright:** venta, compra, devolución y PWA offline en Chromium; job nuevo en
  CI con `npx playwright install --with-deps chromium`.
- **Criterio cumplido:** los datos v1 migran solos, el respaldo se valida y confirma, la app
  se instala/abre offline y los tres flujos críticos pasan E2E.

### Fase 2 completa ✅
Los cinco sprints de la Fase 2 (Track A, sin backend) están cerrados.

---

## 7.1 Fase 3 — Backend, usuarios y analítica (en curso)

**Decisiones tomadas:**

- **Supabase** (PostgreSQL + Auth + RLS), proyecto **`drogueria`**:
  `https://uprtvwsmxtrdjnwimiux.supabase.co`.
- **Una sola sucursal** por ahora. El esquema ya incluye `organization_id` y `store_id`
  para no bloquear multi-sucursal en el futuro.
- **WhatsApp y pagos de Meta quedan fuera de alcance por ahora.** Se retomarán cuando
  el usuario lo decida.
- **IA (DeepSeek/Claude) tampoco se implementa aún.** Primero datos, permisos y analítica.
- El frontend sigue funcionando en **modo local** (`VITE_AUTH_ENABLED=false`) hasta que
  el esquema esté ejecutado y el login real esté probado.
- La **`anon key`** es la única clave pública que puede ir al frontend. La `service_role`,
  contraseñas y tokens de Meta nunca se comparten por chat ni se suben al repo.

### ✅ Sprint 6 — Fundaciones Supabase

- [x] Esquema SQL: `supabase/migrations/202611060001_initial_schema.sql`.
- [x] RLS y permisos por rol: `supabase/migrations/202611060002_rls.sql`.
- [x] Datos iniciales: `supabase/seed.sql`.
- [x] Cliente Supabase (`src/lib/supabase.ts`), tipos y permisos (`src/auth/`).
- [x] Login, store de autenticación (`useAuthStore`) y guarda de rutas (`RequireAuth`).
- [x] Filtrado de navegación por rol y cierre de sesión en la barra superior.
- [x] Migraciones y seed ejecutados en el proyecto real.
- [x] Usuario `estiben.capdevilla@gmail.com` creado y promovido a `admin`.
- [x] `.env.local` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_AUTH_ENABLED=true`.
- [x] Login real verificado: perfil `admin`, organización y sucursal visibles.
- [x] RLS verificado con anónimo: `profiles`, `organizations`, `stores` y `products` devuelven `[]`.
- [ ] Probar RLS con un usuario `cashier` y otro `inventory` (se hará con datos reales en Sprint 7).

### 🚧 Sprint 7 — Datos y analítica

- [x] Vistas SQL de analítica en `supabase/migrations/202611060003_analytics_views.sql`:
  `v_sales_daily`, `v_product_performance`, `v_category_performance`, `v_payment_mix`,
  `v_customer_summary`, `v_inventory_risk` y `v_cash_summary`.
- [x] Servicio de migración local → Supabase (`cloud-migration.service.ts`) con mapeo de
  todas las entidades y generación de pagos para ventas antiguas.
- [x] Botón **“Subir datos a Supabase”** en Configuración (solo admin) con confirmación,
  conteos y manejo de errores.
- [x] Pantalla **Analítica** (`/analitica`) con filtro de fechas, KPIs, ventas por día,
  utilidad por producto/categoría, medios de pago, mejores clientes y riesgo de inventario.
- [ ] Ejecutar `202611060003_analytics_views.sql` en Supabase.
- [ ] Probar la sincronización con datos demo/ventas y verificar las vistas con la sesión admin.
- [ ] Probar RLS de `cashier` e `inventory`.
- [ ] Conectar las escrituras operativas directamente a Supabase (Sprint 8).

### Siguientes sprints

- **Sprint 7:** migración de datos locales a Supabase y vistas/dashboards de analítica.
- **Sprint 8:** WhatsApp manual con enlaces `wa.me` (sin costos de API).
- **Sprint 9:** WhatsApp Cloud API + IA opcional (DeepSeek/Claude).
- **Sprint 10:** cierre, E2E completos y despliegue en Vercel.

### Inmediato
- [x] Ejecutar `supabase/migrations/001` y `002` + `seed.sql`.
- [x] Crear el usuario admin y ejecutar `public.bootstrap_admin('correo')`.
- [x] Configurar `.env.local` con la `anon key` y probar el login real.
- [ ] Ejecutar `supabase/migrations/202611060003_analytics_views.sql`.
- [ ] Cargar datos demo/ventas y usar **Configuración → Subir datos a Supabase**.
- [ ] Verificar la pantalla **Analítica** con la sesión admin.
- [ ] Probar RLS con usuarios `cashier` e `inventory`.
- [ ] Revisar `npm audit` y decidir si actualizar dependencias.
- [ ] Decidir si se hace commit (por sprint o todo junto).
- [ ] Definir cuenta/dominio de Vercel para el despliegue.

**Antes de empezar un sprint:** confirmar alcance con el usuario y anotarlo aquí.

---

## 8. Cómo retomar en una sesión nueva

1. Lee `AGENTS.md` y este `HANDOFF.md`.
2. Ejecuta `git status` para ver qué cambió desde la última vez.
3. Corre `npm run typecheck && npm run lint && npm run test` para confirmar la base.
4. Revisa la sección **7.1 Fase 3**: el **Sprint 6 está completo** y el **Sprint 7 en curso**.
5. El siguiente paso es ejecutar la migración `202611060003_analytics_views.sql` y sincronizar
   datos desde Configuración.
6. Recuerda que `.env.local` no se commitea y contiene la `anon key`.

---

## 9. Bitácora

### 2026-11-06 — Fase 3 · Sprint 7 en curso (datos y analítica)
- Vistas SQL de analítica con `security_invoker` para respetar RLS.
- Servicio de migración local → Supabase con mapeo de productos, lotes, clientes, ventas,
  pagos, compras, caja, gastos, devoluciones y movimientos.
- Configuración: botón **Subir datos a Supabase** (solo administrador) con confirmación,
  conteos y errores; no borra los datos locales.
- Nueva pantalla **Analítica** con filtro de fechas y tablas de ventas, utilidad, pagos,
  clientes e inventario.
- Los E2E se aislaron en modo local (`VITE_AUTH_ENABLED=false`) para no depender de Supabase.
- Pruebas: **185/185 en 23 archivos**, **5/5 E2E** y **1/1 PWA**.
- Pendiente: ejecutar la migración `003`, sincronizar datos y verificar las vistas y el RLS
  de `cashier`/`inventory`. Sin commit.

### 2026-11-06 — Fase 3 · Sprint 6 completado
- Migraciones, RLS y seed ejecutados en el proyecto Supabase **drogueria**.
- Usuario `estiben.capdevilla@gmail.com` creado y promovido a `admin` con
  `bootstrap_admin`.
- Login real verificado: sesión, perfil, organización y sucursal cargados; la barra
  superior muestra el rol **Administrador** y el cierre de sesión.
- RLS verificado:
  - Anónimo: `profiles`, `organizations`, `stores` y `products` devuelven `[]`.
  - Autenticado admin: ve su perfil, la organización, la sucursal y los productos de su
    tienda.
- `.env.local` configurado con `VITE_AUTH_ENABLED=true` (archivo ignorado por Git).
- Pruebas: **182/182 en 22 archivos**, **5/5 E2E** y **1/1 PWA**.
- Pendiente: probar RLS con usuarios `cashier`/`inventory` y migrar los datos locales
  (Sprint 7). Sin commit.

### 2026-11-06 — Fase 3 · Sprint 6 iniciado (Supabase)
- Proyecto Supabase **drogueria** creado por el usuario:
  `https://uprtvwsmxtrdjnwimiux.supabase.co`.
- Esquema relacional completo en `supabase/migrations/`:
  organizaciones, sucursales, perfiles, productos, lotes, movimientos, clientes,
  ventas, detalle, pagos, compras, caja, gastos, devoluciones, auditoría y settings.
- RLS con roles `admin`, `cashier` e `inventory`; helpers de sesión y protección de
  campos del perfil para evitar autoascensos.
- Seed con organización y sucursal principal.
- Frontend: cliente Supabase, tipos, permisos por rol, login con RHF + Zod, store de
  autenticación, guarda de rutas y navegación filtrada por rol.
- El modo local sigue siendo el predeterminado (`VITE_AUTH_ENABLED=false`), así que
  Fase 0–2 no se rompió.
- Pruebas: **182/182 en 22 archivos** + **5/5 E2E** + **1/1 PWA**.
- Pendiente: ejecutar el SQL en Supabase, crear el admin y probar el login real con la
  `anon key`. Sin commit.

### 2026-11-06 — Endurecimiento posterior al Sprint 5
- **Sincronización entre pestañas:** `main.tsx` escucha `storage` y llama a `load()`, de modo
  que una venta o un gasto registrado en otra pestaña se refleja sin recargar.
- `StorageService.load` compara el JSON migrado con el almacenado y solo reescribe si cambió,
  evitando escrituras y eventos `storage` en bucle.
- **E2E nuevos:** restauración real de un respaldo (subida de archivo, confirmación y
  verificación en Productos) y sincronización de una venta entre dos pestañas.
- Pruebas: **173/173 en 20 archivos** + **5/5 E2E** funcionales + **1/1 E2E PWA**.
- Sin commit, según indicación del usuario.

### 2026-11-06 — Fase 2 · Sprint 5 completado
- `SCHEMA_VERSION` sube a **2**: nueva configuración `db.settings` con
  `backupReminderDays` y `lastBackupAt`.
- `storage.service.ts`: migraciones incrementales (`migrate`), validación con Zod
  (`dbSchema`), `parseBackup`, `backupStatus`, cuarentena de datos corruptos y guardado del
  resultado migrado.
- **Configuración** renovada: recordatorio de respaldo, último respaldo, restauración con
  confirmación y resumen, reinicio con confirmación y descarga que registra la fecha.
- **PWA:** `manifest.webmanifest`, iconos 192/512/maskable, `sw.js` con precarga de assets y
  offline; registro condicionado a producción; metadatos en `index.html`.
- **E2E:** Playwright con venta, compra, devolución y PWA offline; scripts
  `test:e2e` / `test:e2e:pwa` y job de CI con Chromium.
- Pruebas: **171/171 en 20 archivos** (nuevas `Settings.test.tsx`, migraciones, validación
  de respaldos, recordatorio y cuarentena) + **4 E2E** en Chromium.
- Smoke test real: respaldo JSON v2 descargado con `lastBackupAt`, aviso oculto, migración
  v1→v2 verificada en `localStorage` y demo restaurada.

### 2026-11-06 — Fase 2 · Sprint 4 completado
- `report.service.ts` ampliado con rango de fechas local, ticket promedio, desempeño por
  producto/categoría, top productos por ingresos netos y exportadores CSV.
- El descuento global se reparte de forma proporcional entre las líneas; la utilidad por
  producto y categoría cuadra con la utilidad bruta del periodo.
- Página **Reportes** renovada: filtro Desde/Hasta con validación, KPIs (incluido ticket
  promedio), tablas de utilidad/top productos y exportaciones de ventas, utilidad,
  categorías, pagos y movimientos.
- `cash.service.ts`: `cashAudit` + `cashAuditToCSV`; `expectedCash` ahora acota los
  movimientos por `closedAt`, lo que permite auditar sesiones cerradas.
- Página **Caja**: sección “Arqueo por medio de pago” con selector de sesión, desglose
  Ventas/Gastos/Neto, resumen de efectivo esperado, contado, diferencia y CSV.
- `formatDateOnly` corrige el desfase de un día al mostrar fechas `YYYY-MM-DD` en zonas
  UTC negativas.
- Pruebas: **158/158 en 19 archivos** (nuevas `Reports.test.tsx`, `Cash.test.tsx`, casos de
  rango, ticket promedio, utilidad por producto/categoría, descuento global proporcional,
  arqueo por método, corte por cierre y CSV).
- Smoke test real con 4 ventas, 2 gastos y una caja abierta: filtro 4→3 ventas, alerta de
  rango inválido, utilidad por producto/categoría, ticket promedio 4.925, CSV de utilidad,
  arqueo con efectivo esperado 56.200, CSV de arqueo, 12 rutas sin errores y demo restaurada.

### 2026-11-06 — Fase 2 · Sprint 3 completado
- POS de mostrador con lector de código de barras: Enter agrega el producto por código de
  barras o código interno exacto; F2 enfoca la búsqueda y F3 abre el cobro.
- Descuento por línea (`SaleItem.discount`) y descuento global (`Sale.discount`) con límites,
  vista previa del ahorro y reflejo en total, utilidad, reportes y CSV.
- `PaymentModal` con RHF + Zod: pagos mixtos (`PaymentSplit[]`), efectivo recibido, cálculo de
  vueltas y validación de que los pagos suman exactamente el total.
- `Sale.paymentMethod` queda como método principal (mayor monto); `Sale.payments` guarda el
  desglose. Ventas antiguas sin `payments` siguen funcionando vía `salePayments`.
- `SaleReceipt` imprimible de 80 mm (`@media print`) con productos, descuentos, pagos,
  efectivo recibido y vueltas.
- Caja: `expectedCash` suma solo la porción `CASH` de los pagos mixtos.
- Reportes: `salesByPayment` divide el total por método y `grossProfit` descuenta líneas y global.
- Pruebas: **137/137 en 17 archivos** (nuevas `POS.test.tsx`, casos de pagos/descuentos en
  ventas, caja, reportes y esquemas).
- Smoke test real: demo cargada, escaneo `7701234567890`, cantidad 2, descuento de línea 200,
  descuento global 100, F3, pago mixto 1.000 efectivo + 1.700 tarjeta, efectivo 5.000,
  vueltas 4.000, recibo visible, stock 120→118, 12 rutas sin errores y demo restaurada.

### 2026-11-06 — Fase 2 · Sprint 2 completado
- Inventario renovado: KPIs de lotes activos, ≤30 días, ≤90 días y vencidos; filtros por
  estado, búsqueda y exportación CSV con días restantes.
- `inventory.service.ts`: `expiryStatus`, `daysUntilExpiry`, `availableStock`,
  `expiredStock`, `isLotExpired` y `adjustLot`.
- Ajustes con motivo `COUNT` / `DAMAGE` / `EXPIRED` / `OTHER`, nota opcional y vista previa
  del cambio; crean `Movement` con `reason` y `note` y mantienen stock/lote sincronizados.
- Descarga rápida de lotes vencidos (cantidad 0 + lote deshabilitado + movimiento `EXPIRED`).
- `sale.service.ts` y POS: FEFO omite vencidos, se bloquea la venta si solo hay stock vencido
  y se muestran las unidades vencidas.
- `adjustmentSchema` en Zod; acción `adjustLot` en el store con validación y persistencia.
- Seed demo: P004 vencido, P003/P005 ≤30 días, P002 ≤90 días y P001 vigente.
- Pruebas: **117/117 en 16 archivos** (nuevas `Inventory.test.tsx` y casos de inventario,
  ventas y esquema).
- Smoke test real: filtros, descarga de L-P004 (25→0, stock 25→0, movimiento EXPIRED),
  conteo de L-P001 (120→118, movimiento ADJUSTMENT -2) y POS con Crema dental bloqueada
  mostrando “0 uds. / 25 vencidas”. Demo restaurada al final.

### 2026-11-06 — Fase 2 · Sprint 1 completado
- Nueva página **Proveedores** (`/proveedores`): alta, edición, búsqueda por nombre/NIT/
  contacto/teléfono/correo, activación y desactivación con confirmación.
- Nuevo `supplier.service.ts` con `addSupplier`, `updateSupplier`, `setSupplierActive`,
  `searchSuppliers` y `activeSuppliers`; `isSupplierActive` trata `undefined` como activo.
- Esquema `supplierSchema` / `supplierPatchSchema` con validación de correo y opcionales.
- Store: acciones `addSupplier`, `updateSupplier`, `setSupplierActive`, `searchSuppliers`,
  `activeSuppliers`, todas validadas y persistidas con toast.
- Compras: selector de proveedores activos, aviso con enlace cuando no hay ninguno.
- Al comprar: actualización de `purchasePrice` y `mainSupplierId`; validación de proveedor
  existente/activo y producto existente.
- Datos demo de proveedores ampliados (NIT, contacto, teléfono, correo, dirección).
- Pruebas: **96/96 en 15 archivos** (nuevas: `supplier.service.test.ts`,
  `purchase.service.test.ts`, `Suppliers.test.tsx` y casos de esquema).
- Smoke test real: crear/editar/desactivar/reactivar proveedor y registrar compra
  (stock 120→123, costo 800→950, proveedor principal asignado, lote y movimiento creados).
- Documentación actualizada (`HANDOFF.md`, `AGENTS.md`).

### 2026-11-06 — Fase 1 completada
- Validación Zod central en toda la app; store valida antes de escribir.
- Formularios RHF + Zod en Productos, Gastos, Clientes y Compras (`useFieldArray`).
- `forwardRef` en los controles base (causa real de fallos de registro en RHF).
- Error Boundary global.
- Mensajes de validación en español, sin errores crudos de Zod.
- 73 pruebas en 12 archivos (servicios, esquemas, utilidades y formulario de productos).
- ESLint + Prettier + CI (`.github/workflows/ci.yml`).
- Rediseño visual completo (índigo, tipografías, sidebar oscuro, topbar con modal de caja).
- Smoke test en navegador de las 11 rutas y flujos clave.

### 2026-11-05 — Fase 0
- Corrección de rutas, codificación, typos y errores de TypeScript en todas las páginas.
- App compilando y ejecutando con datos demo.

---

## 10. Notas conocidas

- El build muestra **avisos internos de comentarios de Zod**; no afectan la app.
- `npm audit` reporta vulnerabilidades pendientes (no se tocaron).
- `tsconfig.json` solo incluye `src`; los `deepseek_*` de la raíz quedan fuera.
- Datos demo se restauran desde **Configuración → Cargar demo**.
- `Supplier.active` es opcional: los datos antiguos sin ese campo se consideran activos.
  El esquema ya va por la **v2**; las bases v1 se migran solas al cargar (añaden `settings`).
- Las compras rechazan proveedores inactivos; si se desactiva un proveedor, sus compras
  históricas y productos asociados se conservan.
- `Product.stock` incluye unidades de lotes vencidos hasta que se descargan con un ajuste.
  Por eso el POS usa el stock vigente (lotes habilitados y sin vencer) y no `Product.stock`.
- Un lote descargado por vencimiento queda en `quantity: 0` y `enabled: false`; las compras
  históricas y los movimientos se conservan.
- Los movimientos de ajuste guardan `reason` (`COUNT`, `DAMAGE`, `EXPIRED`, `OTHER`) y `note`;
  el CSV de movimientos incluye ambas columnas.
- `Sale.payments`, `cashReceived`, `change` y `SaleItem.discount` son opcionales: los datos
  anteriores siguen siendo válidos y se interpretan con `paymentMethod` y el total.
- El recibo usa `window.print()` y `@media print`; en pantalla se muestra dentro del modal de
  venta registrada. No es factura electrónica.
- En pagos mixtos, `Sale.paymentMethod` es el método de mayor monto (en empate, el primero);
  para la caja y los reportes siempre usa `salePayments` / `saleCashAmount`.
- Los filtros de reportes con fechas `YYYY-MM-DD` usan límites en hora local: `desde` incluye
  desde las 00:00 y `hasta` hasta las 23:59:59.999. Para mostrar esas fechas usa
  `formatDateOnly`; `formatDate` es para fechas ISO con hora.
- El arqueo de una sesión cerrada solo considera movimientos entre `openedAt` y `closedAt`;
  los movimientos posteriores pertenecen a otra sesión y no alteran su diferencia.
- `topProducts` se ordena por ingresos netos (después de descuentos), no por unidades.
- El respaldo incluye `exportedAt` y la base completa validada. Restaurar reemplaza **todo**;
  no fusiona datos. La UI pide confirmación antes de aplicar.
- Si `localStorage` no se puede leer o validar, la app arranca vacía y guarda el contenido
  original en `drogueria_db_recovery_<fecha>` para recuperación manual.
- El service worker solo se registra en producción (`import.meta.env.PROD`), para no
  interferir con el HMR de Vite. Si cambias el shell, sube la constante `CACHE` de `sw.js`.
- Playwright usa el puerto **4173** para los E2E funcionales y **4174** para la PWA con
  `vite preview`. Los navegadores se instalan con `npx playwright install chromium`.
- Varias pestañas abiertas comparten `localStorage` y se sincronizan al guardar. Si dos
  pestañas escriben exactamente al mismo tiempo, gana la última escritura; no hay bloqueo
  distribuido (el backend de Fase 3 resolverá eso).
- **Supabase:** las migraciones están en `supabase/migrations/` y el seed en
  `supabase/seed.sql`. Se ejecutan manualmente en el SQL Editor la primera vez.
- **Modo local vs Supabase:** con `VITE_AUTH_ENABLED=false` (predeterminado) la app usa
  `localStorage` y no pide login. Con `true` exige sesión, perfil activo y rol.
- **Claves:** solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` pueden estar en el
  frontend. La `service_role` key se usa únicamente en servidor (Vercel Functions) y nunca
  se sube al repo ni se comparte por chat.
- **Migración de datos:** el Sprint 7 conectará los servicios actuales a Supabase; hasta
  entonces el modo local sigue siendo la fuente de verdad para la operación.
- **WhatsApp:** fuera de alcance en esta fase; no se instalaron dependencias de Meta.
- **Analítica:** las vistas SQL están en `supabase/migrations/202611060003_analytics_views.sql`
  y usan `security_invoker` para respetar RLS. La pantalla `/analitica` consulta esas vistas;
  si no están ejecutadas, muestra un error explicativo.
- **Sincronización local → Supabase:** el botón de Configuración sube los datos locales
  (upsert) y reemplaza los hijos de ventas/compras/devoluciones. Es una migración/sincronización
  manual, no el flujo operativo definitivo. Las escrituras directas llegan en el Sprint 8.
- **Bundle:** `@supabase/supabase-js` elevó el chunk principal por encima de 500 kB
  (~205 kB gzip). Funciona, pero conviene code-splitting en una fase de optimización.
