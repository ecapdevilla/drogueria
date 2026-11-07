# Supabase · Fase 3

Proyecto: **drogueria**  
URL: `https://uprtvwsmxtrdjnwimiux.supabase.co`

## 1. Ejecutar el esquema

En **Supabase → SQL Editor**, ejecuta en este orden:

1. `migrations/202611060001_initial_schema.sql`
2. `migrations/202611060002_rls.sql`
3. `migrations/202611060003_analytics_views.sql`
4. `seed.sql`

El paso 2 activa **Row Level Security** en todas las tablas. Sin RLS, la `anon key`
no debe usarse en el frontend.

## 2. Configurar Auth

En **Authentication → Providers → Email**:

- Habilita Email.
- Desactiva **Allow new users to sign up** si solo el administrador creará usuarios.
- Configura **Site URL** con la URL de Vercel (o `http://localhost:5173` en desarrollo).
- Agrega `http://localhost:5173` y la URL de Vercel en **Redirect URLs**.

Crea el primer usuario desde **Authentication → Users → Add user** (email + contraseña).
El trigger `handle_new_user` le creará un perfil con rol `cashier`.

Luego promuévelo a administrador desde el SQL Editor:

```sql
select public.bootstrap_admin('tu-correo@dominio.com');
```

La función solo permite promover al primer administrador y no es ejecutable por
usuarios autenticados normales.

## 3. Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```env
VITE_SUPABASE_URL=https://uprtvwsmxtrdjnwimiux.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_AUTH_ENABLED=true
```

La `anon key` está en **Project Settings → API**. Es pública y segura **solo si RLS
está activo**. Nunca uses la `service_role` key en el frontend ni la compartas por chat.

## 4. Roles

| Rol | Acceso |
| --- | --- |
| `admin` | Todo, incluida Configuración y auditoría |
| `cashier` | Ventas, caja, gastos, devoluciones, clientes y reportes |
| `inventory` | Productos, inventario, compras, proveedores y reportes |

El frontend bloquea rutas por rol y Supabase vuelve a validar con RLS. Nunca confíes
solo en el guard del frontend.

## 5. Estado del Sprint 6

Completado y verificado:

- Migraciones, RLS y seed ejecutados en el proyecto real.
- Administrador `estiben.capdevilla@gmail.com` con rol `admin`.
- Cliente de Supabase, login, store de sesión, guarda de rutas y navegación por rol.
- Login real y RLS verificados (anónimo recibe `[]`; admin ve su organización, sucursal y
  productos de su tienda).

## 6. Sprint 7

Vistas de analítica incluidas en `migrations/202611060003_analytics_views.sql`. Después de
ejecutarlas:

1. Entra a **Configuración → Sincronización con Supabase**.
2. Usa **Subir datos a Supabase** (solo administrador).
3. Abre **Analítica** para ver ventas, utilidad, pagos, clientes e inventario.

La sincronización es manual en esta fase; las escrituras operativas directas llegan en el
Sprint 8.
