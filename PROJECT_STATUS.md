# Droguería Pharmacy Management Application - Project Documentation

> 📌 **Para retomar el trabajo entre sesiones:** lee [`AGENTS.md`](./AGENTS.md) y
> [`HANDOFF.md`](./HANDOFF.md). Ahí está el estado actual, las decisiones y los pendientes.

## Current Status ✅

**Application Status:** Fase 2 completa + Fase 3 en curso (Supabase, auth y analítica)
- TypeScript compilation: PASS (`npm run typecheck`)
- Lint: PASS (`npm run lint`)
- Tests: PASS (190/190, `npm run test`)
- E2E: PASS (5/5) + PWA (1/1)
- Vite build: PASS (`npm run build`)
- Lighthouse: 100 accesibilidad / 100 best practices / 100 SEO
- Runtime: `npm run dev` (por defecto http://localhost:5173)

> El estado detallado y las decisiones viven en [`HANDOFF.md`](./HANDOFF.md). Este archivo
> conserva el historial de Fase 0 y Fase 1; al final se resume la Fase 2/3.

**Parts Completed (of 10):**
1. ✅ Sidebar.tsx - Fixed duplicate route `/productos` → `/clientes`, fixed all HTML entities/emojis
2. ✅ App.tsx - Verified routing is correct, no duplicate routes
3. ✅ Customers.tsx - Fixed `-firstname` → `Customers` title
4. ✅ Products.tsx - Fixed `Ccancelar` typo, fixed store destructuring, fixed encoding
5. ✅ All pages encoding cleanup - Fixed typos: `Crocessar`→`Procesar`, `Cxportar`→`Exportar`, `Crimar`→`Eliminar`, `Cc`→`C` prefixes throughout
6. ✅ Purchases.tsx - Fixed multiple typos, column headers
7. ✅ Reports.tsx - Fixed unknown type issues
8. ✅ Settings.tsx - Fixed multiple encoding/typos
9. ✅ Cash.tsx - Fixed `Ccerrar` → `Cerrar`
10. ✅ TypeScript fixes across all files - 30+ type errors fixed

## Files Modified (Total: ~40+ files)

### Route/Navigation Fixes:
- `src/components/layout/Sidebar.tsx` - Core fix: line 14 route change + all encoding
- `src/App.tsx` - Route verification (no changes needed, was already correct)

### Encoding/Typo Fixes:
- All HTML entities (`&Iacute;`, `&Oacute;`, etc.) replaced with proper UTF-8 characters
- Multiple `C` prefix typos fixed across: Reports.tsx, Settings.tsx, Returns.tsx, Purchases.tsx, Expenses.tsx
- Emoji replacements for all nav icons in Sidebar.tsx

### TypeScript Type Fixes:
- Fixed import paths (Sidebar.tsx, Topbar.tsx)
- Added ReactNode imports to Badge.tsx, Table.tsx
- Fixed all component/page imports (Button, Input, Modal in 8+ files)
- Fixed Products.tsx store destructuring (was using wrong property names)
- Fixed useAppStore buildSale type (Partial<DBShape> → DBShape)
- Fixed purchase.service.ts variable declaration order
- Added missing types to schema.ts: Product, Lot, Expense, Purchase, Customer, Sale, Return, Movement, Supplier
- Fixed ReportService grossProfit calculation
- Fixed ReturnService lot.createdAt field
- Fixed SeedService lot.createdAt field
- Fixed ExpenseService paymentMethod enum
- Fixed CustomerService createdAt field
- Fixed Reports.tsx map total/value types
- Fixed 15+ implicit any, undefined type errors

### Key Files Completely Rewritten:
- `src/types/schema.ts` - Complete type definitions for all DB types
- `src/types/index.ts` - Exported type re-exports
- `src/store/useAppStore.ts` - Fixed buildSale return type

## Architecture Overview

**Tech Stack:**
- React 18 + TypeScript
- React Router DOM 6
- Zustand (state management)
- Tailwind CSS + PostCSS
- Vite build tool

**Data Flow:**
- In-memory SQLite-like database (DBShape type in code)
- No external database currently
- Persistence via StorageService (localStorage JSON)
- Demo seed data loads on app start

**Key Components:**
- `Sidebar.tsx` - Navigation menu with 12 routes
- `Shell.tsx` - Layout wrapper (Sidebar + Topbar + children)
- `Topbar.tsx` - Top toolbar with cash session status
- `Products.tsx`, `Customers.tsx`, `Reports.tsx`, etc. - Page components
- UI components: Button, Input, Table, Modal, EmptyState, Badge, ConfirmDialog, Toast

**Routes:**
```
/ - Dashboard
/productos - Products (inventory)
/inventario - Inventory (lots management)
/pos - Point of Sale
/compras - Purchases (from suppliers)
/caja - Cash management
/gastos - Expenses
/devoluciones - Returns/Returns
/clientes - Customers (THIS IS THE FIXED ROUTE)
/reportes - Reports
/configuracion - Settings
```

> **Actualización:** la migración real se hizo con **Supabase** (PostgreSQL + Auth + RLS),
> no con `pg` directo ni Prisma. Ver `supabase/README.md` y `HANDOFF.md`. El análisis
> histórico de PostgreSQL se conserva abajo como referencia.

## PostgreSQL Migration Analysis 🐘

### Current Data Storage
- **Type**: In-memory DBShape interface + JSON localStorage persistence
- **Database**: None (pure client-side)
- **Persistence**: `StorageService.load/save()` → localStorage
- **Schema**: Defined in `src/types/schema.ts` as TypeScript interfaces

### Migration Complexity: MODERATE

**What Would Need to Change:**

1. **Add PostgreSQL dependency**
   - Install `pg` or use an ORM like Prisma/TypeORM
   - Add connection configuration

2. **Modify StorageService**
   - Replace localStorage methods with PostgreSQL queries
   - Keep API surface similar for minimal component changes

3. **Update Type Definitions**
   - Current: `src/types/schema.ts` TypeScript interfaces
   - New: Could keep TypeScript types but map to PostgreSQL schema
   - Or switch to Prisma schema `.prisma` format

4. **Create Database Tables** (example):
   - `products` - id, internalCode, barcode, commercialName, category, purchasePrice, salePrice, stock, minStock, active, createdAt
   - `customers` - id, name, phone, identification, createdAt
   - `sales` - id, items (JSON), subtotal, discount, total, paymentMethod, customerId, createdAt, returned
   - `purchases` - id, supplierId, invoiceRef, total, items (JSON), date, createdAt
   - `expenses` - id, category, description, amount, paymentMethod, date, createdAt
   - `lots` - id, productId, code, quantity, purchaseCost, expiryDate, enabled, createdAt
   - `returns` - id, saleId, reason, restock, items (JSON), createdAt

5. **API Layer**
   - Create service functions that wrap PostgreSQL operations
   - Maintain same function signatures for minimal component changes
   - Or refactor with Prisma client

**Recommended Approach:**

**Option A: Direct pg migration (lower abstraction)**
- Install: `npm install pg`
- Create `src/services/postgres.service.ts` 
- Modify `StorageService` to use real DB
- Keep all existing types and components unchanged (except import paths)
- **Pros**: Fastest migration, minimal code changes
- **Cons**: Raw SQL, less type safety than Prisma

**Option B: Prisma ORM (recommended for type safety)**
- Install: `npm install prisma @prisma/client`
- Run: `npx prisma init`
- Define `prisma/schema.prisma` matching current DBShape
- Run: `npx prisma migrate dev --name init`
- Update StorageService to use `prisma.$queryRaw` etc.
- **Pros**: Excellent TypeScript type safety, migrations, query builder
- **Cons**: More setup time, learning Prisma DSL

**Option C: Keep current + add PostgreSQL as optional backend**
- Maintain current localStorage implementation
- Add separate PostgreSQL service for production deployment
- Use feature flag to switch between local and remote DB
- **Pros**: Zero downtime migration, can test both
- **Cons**: Dual code paths, more complex

### Migration Roadmap (if choosing Option A):

**Phase 1**: Set up PostgreSQL connection
```bash
npm install pg
```
Create `src/services/postgres.service.ts` with client setup.

**Phase 2**: Migrate StorageService
- `load()` → SELECT FROM all tables
- `save()` → INSERT/UPDATE all tables  
- `seedDemo()` → INSERT seed data
- `resetDemo()` → DELETE all data, re-seed

**Phase 3**: Update types if needed
- Keep TypeScript interfaces for compile-time safety
- Map interface fields to PostgreSQL column types

**Phase 4**: Test with app
- Run `npm run dev`
- Verify all routes work with real DB
- Test seed demo functionality

**Phase 5**: Deploy
- Set environment variables for DB connection
- Update `StorageService` conditional logic

### Component Impact Assessment

**Low Impact** (components likely need NO changes):
- All page components (Products, Customers, Reports, etc.)
- UI components (Button, Input, Table, Modal, etc.)
- Store (useAppStore) - if StorageService API stays same
- Routing (App.tsx, Sidebar.tsx)

**Medium Impact** (minor changes):
- `src/services/StorageService.ts` - core service rewrite
- `src/types/schema.ts` - may add `| null` fields for optional DB columns
- `src/utils/csv.ts` - if CSV export needs DB data format changes

**High Impact** (would need changes):
- None really, if StorageService API is preserved

### Recommendation

**For now**: Keep the current implementation as-is. It works perfectly, typechecks, and builds. 

**Later**: If you need a real database:
1. Start with **Option A (pg)** for fastest migration
2. Or use **Prisma** if you want long-term type safety and migrations
3. The current codebase structure makes migration relatively painless since all data operations go through the Service layer

**Bottom line**: The application is functionally complete without PostgreSQL. Migration is possible but adds complexity that isn't needed for the current scope.

---

# Project Progress Tracker

**Last Updated:** 2026-11-06

**Completed Tasks:**
- [x] Tarea 1: Fix Sidebar duplicate route `/productos` → `/clientes`
- [x] Tarea 2: Fix App.tsx routing (was already correct)
- [x] Tarea 3: Fix Customers.tsx title `-firstname` → `Customers`
- [x] Tarea 4: Fix Products.tsx `Ccancelar` typo + type fixes
- [x] Tarea 5: Systematic encoding cleanup across all files
- [x] Tarea 6: Fix Purchases.tsx typos and headers
- [x] Tarea 7: Fix Returns.tsx typos
- [x] Tarea 8: Fix Expenses.tsx typo
- [x] Tarea 9: Fix Reports.tsx and Settings.tsx encoding
- [x] Tarea 10: TypeScript fixes across 30+ files, build passes

**Current Status:** ✅ READY TO RUN
- `npm run dev` works
- `npm run build` succeeds  
- `npx tsc --noEmit` passes
- Application functional at http://localhost:5173

**Next Steps (Optional):**
1. Run app locally: `cd "C:\Users\BS-TECNOLOGI02\Downloads\ejemplo drogeuria" && npm run dev`
2. (Optional) Migrate to PostgreSQL later if needed
3. No immediate blockers - application is complete

---

# Fase 1 — Robustez, validación y rediseño ✅

**Fecha:** 2026-11-06

## Completado

- **Validación central con Zod** en `src/domain/schemas.ts` para productos, compras, ventas, gastos, clientes, devoluciones y caja. Todas las acciones del store validan antes de escribir.
- **Formularios con React Hook Form + `zodResolver`** en Productos, Gastos, Clientes y Compras (con `useFieldArray`).
- **Mensajes de validación en español** y sin errores crudos de Zod, incluidos los casos de campos vacíos o ausentes.
- **`forwardRef`** en `Input`, `Select`, `Textarea` y `Checkbox` para que React Hook Form registre correctamente los campos.
- **Error Boundary** global (`src/components/ErrorBoundary.tsx`) envuelto en `main.tsx`.
- **Pruebas automatizadas** con Vitest + Testing Library: **73 pruebas en 12 archivos** (servicios, esquemas, utilidades y formulario de productos).
- **Calidad de código**: ESLint, Prettier, scripts npm y CI con GitHub Actions (`.github/workflows/ci.yml`).
- **Rediseño visual**: paleta índigo (`brand`), tipografías Inter + Plus Jakarta Sans, tarjetas `rounded-2xl`, sidebar oscuro responsive, topbar con modal de caja, KPIs, gráficos, tablas y estados vacíos renovados.
- **Accesibilidad y responsive**: etiquetas asociadas, `aria-invalid`, `aria-describedby`, `role="alert"`, foco visible en modales y navegación móvil.

## Verificación

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ Sin errores |
| `npm run lint` | ✅ Sin errores ni warnings |
| `npm run test` | ✅ 73/73 pruebas |
| `npm run build` | ✅ Build de producción generado |
| Smoke test en navegador | ✅ 11 rutas, alta/edición/eliminación, venta POS, validaciones y restauración de demo |

## Archivos clave de Fase 1

- `src/domain/schemas.ts`, `src/domain/validation.ts`
- `src/components/ErrorBoundary.tsx`
- `src/components/ui/{Input,Select,Textarea,Checkbox,Table,Modal,Toast,Badge,Button,DataTable,EmptyState,ConfirmDialog}.tsx`
- `src/pages/{Dashboard,Products,Inventory,POS,Purchases,Cash,Expenses,Returns,Customers,Reports,Settings}.tsx`
- `src/store/useAppStore.ts`
- `vitest.config.ts`, `src/test/setup.ts`, `src/test/fixtures.ts`
- `.eslintrc.cjs`, `.prettierrc`, `.github/workflows/ci.yml`

---

---

# Fase 2 — Operación real sin backend ✅

Completados y verificados los cinco sprints:

1. Proveedores y compras.
2. Inventario con vencimientos y ajustes trazables.
3. POS con lector de código de barras, descuentos, pagos mixtos y recibo de 80 mm.
4. Reportes por rango, utilidad por producto/categoría, ticket promedio, CSV y arqueo.
5. Durabilidad: migraciones, respaldos validados, PWA offline, E2E y sincronización entre
   pestañas.

# Fase 3 — Supabase, usuarios y analítica 🚧

## Sprint 6 — Auth y roles ✅

- Proyecto Supabase `drogueria`.
- Esquema relacional, RLS y seed ejecutados.
- Login real con administrador, roles `admin`, `cashier` e `inventory`.
- Guardas de ruta y navegación filtrada por rol.

## Sprint 7 — Datos y analítica ✅

- Vistas SQL: ventas diarias, utilidad por producto/categoría, medios de pago, clientes,
  inventario y caja.
- Migración/sincronización local → Supabase (manual y automática para admin).
- Descarga desde Supabase para hidratar un equipo nuevo.
- Pantalla `/analitica` con KPIs, tablas, filtros y exportaciones CSV.
- Lighthouse 100/100/100 y configuración de Vercel lista.

## Pendiente

- Sprint 8: escrituras operativas directas a Supabase (RPC transaccionales) y multiusuario.
- Probar RLS con usuarios `cashier` e `inventory`.
- Despliegue real en Vercel y revisión de `npm audit`.
- WhatsApp/IA quedan fuera de alcance por ahora.

Ver [`INFORME_AUTONOMO.md`](./INFORME_AUTONOMO.md) para el detalle de la última sesión.

---

*Document generated as part of project maintenance. Fase 0, Fase 1 y Fase 2 completadas;
Fase 3 en curso.*