# Pruebas de punta a punta contra un "Supabase local"

Levantan los mismos componentes que usa Supabase (GoTrue, PostgREST y Storage) sobre un Postgres local, con
un proxy que imita al gateway (rutas `/auth/v1`, `/rest/v1`, `/storage/v1` y CORS). Las contraseñas de estos
archivos son solo locales (`e2epass`) y las claves JWT se generan en cada ejecución con `keys.mjs`.

Pasos (resumen):
1. Postgres 16 local: `psql -f stack/roles.sql`, crear la base `aet_e2e` y `psql -d aet_e2e -f stack/dbsetup.sql`.
2. Generar secreto y claves: `openssl rand -hex 24 > jwt_secret && node stack/keys.mjs $(cat jwt_secret) > keys.env`.
3. Contenedores (red host): `supabase/gotrue:v2.177.0` (con `GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated`),
   `supabase/storage-api:v1.25.7` (backend `file`) y `postgrest/postgrest:v12.2.3`.
4. Aplicar `supabase/migrations/*.sql` en orden y `supabase/seed.sql`. Dar a `service_role` privilegios sobre el
   esquema `storage` (Supabase ya lo trae).
5. `node stack/proxy.mjs` (puerto 54321) y compilar la app con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`.
6. Ejecutar `01-postulacion.mjs`, `02-admision-admin.mjs` y `03-journey.mjs` (Playwright).

Los scripts asumen rutas del ambiente donde se escribieron (sesiones en `../stack/session-*.json`); ajústalas al reutilizarlos.
