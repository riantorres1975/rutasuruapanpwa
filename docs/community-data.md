# Datos comunitarios y administración

UruGo conserva `data/rutas_produccion_final.json` como respaldo. Supabase se usa para recibir reportes privados, moderarlos y, cuando se active explícitamente, servir únicamente recorridos publicados.

## 1. Crear el proyecto

1. Crea un proyecto gratuito en Supabase.
2. Copia la URL, la publishable key y la secret key desde el diálogo **Connect**.
3. Configura en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
ADMIN_EMAILS=tu-correo@ejemplo.com
REPORTER_HASH_SECRET=un-secreto-aleatorio-de-al-menos-32-bytes
ROUTE_DATA_SOURCE=static
```

La secret key y `REPORTER_HASH_SECRET` son secretos de servidor. Nunca deben llevar el prefijo `NEXT_PUBLIC_`.

## 2. Aplicar la migración

Vincula el proyecto con Supabase CLI y aplica las migraciones versionadas:

```bash
pnpm dlx supabase@2.115.0 login
pnpm dlx supabase@2.115.0 link --project-ref TU_PROJECT_REF
pnpm dlx supabase@2.115.0 db push
```

Después abre los advisors de seguridad y rendimiento desde Supabase o ejecuta las comprobaciones equivalentes de la CLI.

## 3. Configurar el acceso por correo

En **Authentication > URL Configuration** agrega:

- URL del sitio: `https://www.urugo.app`
- Redirect URL: `https://www.urugo.app/auth/callback`
- Desarrollo: `http://localhost:3000/auth/callback`

En **Authentication > Email Templates**, actualiza el enlace de las plantillas
**Confirm signup** y **Magic link** para que la sesión pueda validarse en el
servidor:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
  Entrar al panel de UruGo
</a>
```

El callback acepta este flujo con `token_hash` y conserva compatibilidad con
enlaces PKCE que entreguen un parámetro `code`.

Los correos incluidos en `ADMIN_EMAILS` pueden entrar directamente. Para autorizar a otra persona sin cambiar variables, registra su correo en minúsculas:

```sql
insert into public.admin_members (email, display_name)
values ('persona@ejemplo.com', 'Nombre');
```

## 4. Importar las rutas actuales

Con la migración aplicada y las variables locales configuradas:

```bash
pnpm db:seed-routes
```

El comando importa el estado actual y crea la revisión inicial. Es idempotente: se puede volver a ejecutar sin duplicar la versión 1.

## 5. Activar Supabase como fuente pública

Primero compara `/api/v1/routes` con `/api/rutas-polyline`. Cuando los 81 recorridos estén completos, cambia en Vercel:

```bash
ROUTE_DATA_SOURCE=supabase
```

Si Supabase no responde, el servidor vuelve automáticamente al JSON incluido en la aplicación. Los reportes y confirmaciones nunca forman parte de la respuesta pública hasta que se traduzcan en una revisión aprobada.

## Endpoints

| Endpoint | Acceso | Uso |
| --- | --- | --- |
| `POST /api/community/reports` | Público, limitado | Crea un reporte pendiente |
| `POST /api/community/confirmations` | Público, limitado | Registra una observación de una ruta |
| `GET /api/v1/routes` | Público, cacheado | Entrega recorridos aprobados y versión |
| `/admin` | Administradores | Revisa y clasifica reportes |
| `/admin/routes` | Administradores | Consulta señales y prepara revisiones |
| `/admin/routes/[id]` | Administradores | Publica y restaura versiones de una ruta |

## Publicar una corrección

1. Comprueba el reporte y márcalo como aprobado.
2. Abre **Preparar cambio de ruta** desde el reporte o entra al inventario de rutas.
3. Ajusta los metadatos o pega el recorrido como matriz de coordenadas, `LineString` o `Feature` GeoJSON.
4. Describe qué cambió y cómo se verificó antes de publicar.

La publicación se ejecuta en una transacción: bloquea la versión actual, crea una revisión inmutable y actualiza la ruta pública. Si otro administrador publicó mientras la pantalla estaba abierta, el cambio se rechaza hasta volver a cargar. Restaurar una revisión antigua nunca borra historia; crea una versión nueva con los datos anteriores.

## Seguridad operativa

- Todas las tablas tienen RLS y los roles `anon` y `authenticated` carecen de acceso directo.
- Las escrituras públicas pasan por Route Handlers con validación, límite de tamaño, mismo origen y rate limiting.
- La IP no se guarda; se transforma mediante HMAC para reconocer abuso sin conservar la dirección original.
- El contacto opcional y la bitácora de moderación son privados.
- Aprobar un reporte no publica una geometría. La publicación versionada se implementa como una acción separada para permitir revisión y rollback.
