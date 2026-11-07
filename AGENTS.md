# AGENTS.md — Instrucciones para agentes de IA

> **Lee esto primero.** Este archivo se carga automáticamente en cada sesión.
> Antes de tocar código, lee también [`HANDOFF.md`](./HANDOFF.md): ahí está el estado
> real del proyecto, las decisiones tomadas y por dónde vamos.

## Qué es este proyecto

SPA de gestión para una droguería/farmacia. **Sin backend**: todo vive en el navegador
y se persiste en `localStorage` bajo la clave `drogueria_db_v1`.

- **Stack:** React 18 · TypeScript · Vite 5 · Zustand · React Router 6 · Tailwind CSS.
- **Validación:** Zod v4 + React Hook Form (`@hookform/resolvers`).
- **Tests:** Vitest + Testing Library (jsdom).
- **Idioma:** la UI, los mensajes de validación y la documentación van **en español**.

## Reglas de trabajo

1. **No rompas lo que ya funciona.** Fase 0 y Fase 1 están completas y verificadas.
2. **Valida antes de escribir.** Toda acción del store pasa por un esquema de
   `src/domain/schemas.ts`. No escribas en `db` sin validar.
3. **Formularios con React Hook Form + `zodResolver`.** Los controles de
   `src/components/ui/` deben reenviar `ref` (`forwardRef`); sin esto RHF no registra campos.
4. **Mensajes de validación en español**, sin errores crudos de Zod
   (nada de `Invalid input`). Formato: `El campo "nombre" es obligatorio`.
5. **Estilo visual:** paleta `brand` (índigo) definida en `tailwind.config.js`,
   tipografías Inter + Plus Jakarta Sans, tarjetas `rounded-2xl`. Mantén la coherencia.
6. **Accesibilidad:** etiquetas asociadas (`htmlFor`/`id`), `aria-invalid`,
   `aria-describedby`, `role="alert"`, foco visible en modales.
7. **No toques los archivos `deepseek_*.ts` / `deepseek_*.tsx` de la raíz.** Son
   restos ignorados por ESLint/Prettier y no entran al build. Déjalos como están.
8. **No hagas `git commit` ni `git push` sin pedírselo explícitamente al usuario.**
9. **No ejecutes `npm audit fix`** sin confirmación: puede cambiar versiones.
10. **Proveedores se desactivan, no se borran.** Al registrar una compra se actualiza el
    `purchasePrice` del producto y su `mainSupplierId`; no quites ese comportamiento.
11. **No inventes alcance de Fase 2.** Sigue el roadmap de `HANDOFF.md` y confirma cada
    sprint con el usuario.
12. **No se venden lotes vencidos.** FEFO y el POS usan stock vigente (lotes habilitados y
    sin vencer); no cambies esa regla sin confirmarlo con el usuario.
13. **Todo ajuste de inventario deja movimiento.** Usa `adjustLot` (servicio/store); no
    modifiques `Product.stock` ni `Lot.quantity` directamente desde una página.
14. **Descuentos en dos niveles.** `SaleItem.discount` es el de la línea y `Sale.discount` el
    global; ambos se restan del total, la utilidad y los reportes. No los omitas en cálculos.
15. **Pagos mixtos.** `Sale.payments` guarda el desglose; `Sale.paymentMethod` es el método
    principal (mayor monto). Usa `salePayments` / `saleCashAmount` de `src/utils/payments.ts`
    para reportes y caja; no asumas que una venta es 100 % de un solo método.
16. **Recibo de 80 mm.** `SaleReceipt` y `@media print` están calibrados para impresora térmica;
    no cambies el tamaño ni el flujo de impresión sin confirmarlo.
17. **Reportes y arqueo.** Los rangos de fechas son locales e inclusivos; el descuento global se
    reparte proporcionalmente para la utilidad por producto/categoría. Usa `cashAudit` y
    `saleCashAmount` para la caja; `expectedCash` acota por `closedAt`. No sumes `Sale.total`
    como efectivo ni ignores descuentos en los reportes.
18. **Fechas sin hora.** Para valores `YYYY-MM-DD` usa `formatDateOnly` (evita el desfase de un
    día en zonas UTC negativas); `formatDate` es para fechas ISO con hora.
19. **Esquema versionado.** `SCHEMA_VERSION` está en 2. Si cambias `DBShape`, sube la versión y
    añade una función en `MIGRATIONS` de `storage.service.ts`; no edites datos en caliente sin
    migración. La base final se valida con `src/domain/db.schema.ts`.
20. **Respaldos.** No restaures un archivo sin pasar por `parseBackup` y la confirmación de la
    UI. Descargar un respaldo debe actualizar `settings.lastBackupAt`. No borres la cuarentena
    `drogueria_db_recovery_*` automáticamente.
21. **PWA.** El service worker (`public/sw.js`) solo se registra en producción. Si cambias los
    archivos del app shell o la estrategia de caché, sube la constante `CACHE` para invalidar
    la versión anterior. No lo registres en desarrollo (rompe el HMR).
22. **Sincronización entre pestañas.** `main.tsx` escucha `storage` y recarga la base. Mantén
    `StorageService.load` idempotente: solo debe escribir si la migración normalizó el JSON,
    para no generar eventos en bucle entre pestañas.
23. **Fase 3 con Supabase.** El proyecto es `drogueria`. El esquema y las políticas RLS viven
    en `supabase/migrations/`. Si cambias tablas o permisos, crea una migración nueva; no
    edites la base directamente ni desactives RLS.
24. **Claves y secretos.** Solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` pueden estar
    en el frontend. La `service_role` key, contraseñas y tokens de Meta van en variables de
    entorno de servidor (Vercel) y nunca al repo ni al chat.
25. **Modo local y modo Supabase.** Con `VITE_AUTH_ENABLED=false` la app funciona con
    `localStorage` (Fase 0–2). Con `true` exige login, perfil activo y rol. No rompas el modo
    local mientras la migración de datos del Sprint 7 no esté completa.
26. **Roles.** El frontend filtra rutas con `src/auth/permissions.ts`, pero la seguridad real
    está en RLS. No confíes solo en las guardas de React; cualquier tabla nueva debe llevar
    políticas por organización/sucursal y rol.
27. **Analítica.** Las vistas están en `202611060003_analytics_views.sql` y deben usar
    `with (security_invoker = true)` para respetar RLS. La pantalla `/analitica` solo consulta
    vistas; no escribas datos desde ahí.
28. **Sincronización local → Supabase.** `cloud-migration.service.ts` sube la base local y
    reemplaza los hijos de ventas/compras/devoluciones. Es una herramienta de migración
    (admin), no el flujo operativo definitivo. No la ejecutes en cada render ni la uses para
    escrituras concurrentes.

## Antes de dar algo por terminado

Ejecuta y deja en verde:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

Si tocaste flujos críticos o la PWA, añade:

```powershell
npm run test:e2e
npm run test:e2e:pwa
```

Si tocaste auth/Supabase, configura `.env.local` con la `anon key` y prueba el login real
además de las pruebas sin red. No ejecutes migraciones destructivas sin confirmarlo.

Si tocaste UI o flujos, haz además un smoke test en navegador
(`npm run dev`, recorre las 12 rutas y revisa la consola).

## Mapa rápido

| Ruta | Propósito |
| --- | --- |
| `src/domain/schemas.ts` | **Fuente de verdad** de la validación de formularios |
| `src/domain/db.schema.ts` | Validación Zod de la base completa y los respaldos |
| `src/store/useAppStore.ts` | Estado global (Zustand), acciones, persistencia |
| `src/services/storage.service.ts` | Migraciones, carga/guardado, respaldos y recordatorio |
| `supabase/migrations/` · `supabase/seed.sql` | Esquema, RLS y datos iniciales de Fase 3 |
| `src/lib/supabase.ts` | Cliente público (anon key) y bandera de modo auth |
| `src/auth/` | Tipos, roles y permisos de rutas |
| `src/store/useAuthStore.ts` · `src/pages/Login.tsx` | Sesión, login y logout |
| `src/components/auth/RequireAuth.tsx` | Guarda de rutas por sesión, estado y rol |
| `src/services/cloud-migration.service.ts` | Migración/sincronización local → Supabase |
| `src/services/analytics.service.ts` · `src/pages/Analytics.tsx` | Consultas y pantalla de analítica |
| `public/manifest.webmanifest` · `public/sw.js` | PWA, iconos y caché offline |
| `src/services/` | Lógica de negocio pura (testeable) |
| `src/services/inventory.service.ts` | FEFO, vencimientos y ajustes trazables |
| `src/services/supplier.service.ts` | CRUD de proveedores (desactivación lógica) |
| `src/services/report.service.ts` | Rango de fechas, utilidad por producto/categoría, ticket promedio y CSV |
| `src/services/cash.service.ts` | Apertura/cierre de caja, `cashAudit` por medio de pago y CSV |
| `src/utils/payments.ts` | Desglose de pagos mixtos, método principal y efectivo de caja |
| `src/components/pos/` | `PaymentModal` (cobro) y `SaleReceipt` (recibo 80 mm) |
| `src/pages/` | Las 12 pantallas de la app |
| `src/components/ui/` | Componentes base reutilizables |
| `src/types/` | Tipos y esquemas del dominio |
| `src/test/` | Setup y fixtures de pruebas |
| `e2e/` · `e2e-pwa/` | Pruebas Playwright de flujos críticos y PWA offline |

## Al cerrar una sesión

Si avanzaste en algo, **actualiza `HANDOFF.md`** (sección "Estado actual" y
"Próximos pasos"). Ese archivo es la memoria compartida entre sesiones.
