# Despliegue en Vercel

## Requisitos

- Cuenta de Vercel.
- Repositorio en GitHub/GitLab/Bitbucket con este proyecto.
- Proyecto Supabase configurado (ver `supabase/README.md`).
- Variables de entorno listas.

## Estado actual del despliegue

- **Producción:** https://drogueria-ten.vercel.app
- **Proyecto Vercel:** `estiben-capdevilla/drogueria`
- **Variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_ENABLED=true`
  y `VITE_CLOUD_AUTO_SYNC=true` en Production, Preview y Development.
- **Verificado:** login, conexión con Supabase Auth, rutas SPA, manifest, service worker y
  0 errores de consola.
- **Pendiente:** configurar `Site URL` y `Redirect URLs` en Supabase Auth para correos de
  confirmación/recuperación (el login por contraseña ya funciona).

## Estado actual del repositorio

- Repo: `https://github.com/ecapdevilla/drogueria`
- Rama de producción: **`fase-3-supabase`** (rama por defecto en GitHub).
- `master` también está sincronizado con el mismo commit.
- Último commit de despliegue: `7065e5e`.
- `.nvmrc` fija **Node 20**.
- `vercel.json`, `.vercelignore`, manifest y service worker ya están en el repo.

## 1. Importar el proyecto

1. Entra a Vercel → **Add New → Project**.
2. Importa el repositorio.
3. Vercel detecta **Vite** automáticamente.
4. Verifica:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
   - Node.js Version: **20** (el repo incluye `.nvmrc`)
   - Production Branch: **`fase-3-supabase`** (rama por defecto del repo).

`vercel.json` ya configura:
- Rewrites de SPA para que rutas como `/analitica` funcionen al recargar.
- `Cache-Control: no-cache` para `sw.js` y `manifest.webmanifest`.
- Cache inmutable para los assets con hash.

## 2. Variables de entorno

En **Project Settings → Environment Variables**, agrega para Production, Preview y
Development:

```env
VITE_SUPABASE_URL=https://uprtvwsmxtrdjnwimiux.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-public-key
VITE_AUTH_ENABLED=true
VITE_CLOUD_AUTO_SYNC=true
```

No agregues `service_role`, contraseñas de base de datos ni tokens privados.

## 3. Configurar Supabase Auth

En Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://drogueria-ten.vercel.app`
- **Redirect URLs:**
  - `https://drogueria-ten.vercel.app/**`
  - `https://*.vercel.app/**` (previews)
  - `http://localhost:5173/**` (desarrollo)

Si desactivas los registros públicos, crea los usuarios desde el panel de Supabase.

## 3.1 Despliegue con Vercel CLI (opcional)

Si prefieres hacerlo desde terminal:

```powershell
npx vercel login
npx vercel link
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel env add VITE_AUTH_ENABLED production
npx vercel env add VITE_CLOUD_AUTO_SYNC production
npx vercel --prod
```

Repite los `env add` para `preview` y `development` si quieres que las previews también
tengan login y Supabase. La CLI debe estar autenticada; si no, usa el panel web.

## 4. Desplegar

1. Clic en **Deploy**.
2. Espera el build.
3. Abre la URL de producción.
4. Inicia sesión con el administrador.
5. Verifica:
   - Dashboard carga sin errores.
   - `/analitica` carga las vistas.
   - **Configuración → Sincronización con Supabase** funciona.
   - La PWA se puede instalar y recargar offline.

## 6. Verificación automatizada

El repo incluye dos scripts para comprobar un despliegue:

```powershell
node scripts/verify-deploy.mjs https://drogueria-ten.vercel.app
node scripts/verify-login.mjs https://drogueria-ten.vercel.app
```

El primero revisa redirección al login, rewrite de SPA, manifest y service worker.
El segundo comprueba que el formulario realmente llega a Supabase Auth.

## 7. Después del despliegue

- Prueba una venta y espera la sincronización automática.
- Revisa `v_sales_daily` y `v_product_performance` en Supabase.
- Crea un usuario `cashier` de prueba y valida que no vea Configuración ni pueda
  escribir inventario.
- Revisa los logs de Vercel y la consola del navegador.

## Solución de problemas

- **404 al recargar rutas:** revisa `vercel.json` y que el rewrite esté activo.
- **Login falla:** confirma `VITE_AUTH_ENABLED=true`, la `anon key` y las Redirect URLs.
- **Analítica vacía:** ejecuta la migración `003` y usa **Sincronizar ahora**.
- **PWA con caché vieja:** sube la constante `CACHE` de `public/sw.js` y vuelve a desplegar.
- **Error de RLS:** revisa que el perfil tenga `organization_id`, `store_id` y rol activo.

## Nota

No se realizó ningún despliegue desde este entorno. La configuración queda lista para que
la ejecute el propietario de la cuenta de Vercel.
