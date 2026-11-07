# Droguería · Gestión farmacéutica

SPA para la operación de una droguería: productos, inventario, POS, compras, proveedores,
caja, gastos, devoluciones, clientes, reportes, analítica y configuración.

## Stack

- React 18 + TypeScript + Vite 5
- Zustand + React Router 6
- Tailwind CSS
- Zod + React Hook Form
- Supabase (Auth + PostgreSQL + RLS) para la Fase 3
- Vitest + Testing Library + Playwright
- PWA con manifest y service worker

## Ejecutar en local

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Completa `.env.local` con:

```env
VITE_SUPABASE_URL=https://uprtvwsmxtrdjnwimiux.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_AUTH_ENABLED=true
VITE_CLOUD_AUTO_SYNC=true
```

Si dejas `VITE_AUTH_ENABLED=false`, la app funciona en **modo local/demo** con
`localStorage` y no pide login. Es útil para desarrollo y pruebas E2E.

## Base de datos y Supabase

La guía completa está en [`supabase/README.md`](./supabase/README.md):

1. Ejecutar `supabase/migrations/202611060001_initial_schema.sql`.
2. Ejecutar `supabase/migrations/202611060002_rls.sql`.
3. Ejecutar `supabase/migrations/202611060003_analytics_views.sql`.
4. Ejecutar `supabase/seed.sql`.
5. Crear el usuario administrador en Auth y ejecutar `public.bootstrap_admin('correo')`.

La `anon key` es pública y segura **solo con RLS activo**. Nunca uses la `service_role`
key en el frontend ni la subas al repositorio.

## Scripts

```powershell
npm run dev            # desarrollo
npm run build          # build de producción
npm run preview        # previsualizar build
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm run test           # pruebas unitarias/componentes
npm run test:e2e       # E2E funcionales (Chromium)
npm run test:e2e:pwa   # E2E de PWA/offline
npm run format         # Prettier
```

## Despliegue en Vercel

La guía está en [`DEPLOY_VERCEL.md`](./DEPLOY_VERCEL.md). Resumen:

- Framework: **Vite**.
- Build: `npm run build`.
- Output: `dist`.
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_AUTH_ENABLED=true`, `VITE_CLOUD_AUTO_SYNC=true`.
- Configura la URL de Vercel en Supabase Auth (Site URL y Redirect URLs).
- `vercel.json` ya incluye rewrites de SPA y cabeceras para el service worker.

## Estado actual

- Fase 0, Fase 1 y Fase 2 completas.
- Fase 3 en curso: Sprint 6 completo (auth/roles/RLS) y Sprint 7 en curso
  (datos, analítica y sincronización).
- WhatsApp y pagos de Meta quedan fuera de alcance por ahora.
