# Control de accesos, cuenta principal y continuidad del Assessment

## Roles internos solo por Administración
- **Roles internos:** Líder de producto (admin), Delivery, Hub AI, AI Coach, Profesor y Business Partner. Solo los crea o asigna un admin, desde Usuarios y accesos o al aprobar una solicitud.
- **"Crear cuenta" (público):** solo permite pedir acceso como Profesional o Business Partner. Es una solicitud: no crea la cuenta ni da permisos.
- **Defensa en el servidor:** `requestAccount` rechaza cualquier rol interno. `createUser`, `changeRole` y `decideAccessRequest` exigen sesión de admin.
- **Defensa en la base** (migración `20261025000000_control_accesos.sql`):
  - Una cuenta de Auth que nace con un rol interno queda **PENDIENTE** y sin permisos (`current_role`, `is_staff`, `is_admin`, `is_wave_staff`) hasta que la persona demuestra que el correo es suyo: código temporal y creación de su código personal.
  - Las solicitudes públicas no aceptan roles internos (restricción `access_requests_requested_role_check`).
  - `profiles` y `role_grants` solo los modifica un admin (RLS existente).
- **Cuenta principal y último admin:** el trigger `guard_admin_accounts` impide degradar, pausar o eliminar la cuenta principal y dejar la plataforma sin ningún admin activo. Aplica también con la llave de servicio. La marca de principal no se puede tocar con una sesión de usuario.

## Cuenta principal
- **Datos:** Jorge Pinto, `jorge.pintom@kibernum.com`, admin principal. Se crea de forma idempotente en `supabase/seed.sql`, que se re-ejecuta en cada despliegue sin duplicar.
- **Código inicial:** viene del secreto `ADMIN_INITIAL_CODE` y nunca está en el repositorio.
  - Se aplica una sola vez (`app_settings.principal_initialized`).
  - Se guarda como hash scrypt.
  - Exige cambiarlo en el primer ingreso.
  - Después del cambio pide el segundo factor por correo, como todo admin.
- **Sin el secreto:** ingresa con "Olvidé mi código" (código a su correo).

## Assessment: borradores y envío
- **Borrador:**
  - Se guarda en la base de forma automática, 1,2 s después de dejar de escribir, al salir de un campo, al ocultar la pestaña y al volver la conexión.
  - Mientras no se guarda, queda una copia en el dispositivo, que se recupera al volver.
  - Es "En progreso": no se evalúa ni avanza de etapa.
- **Envío:**
  - Valida las obligatorias, pero conserva lo escrito.
  - Pide confirmación.
  - Se aplica una sola vez (`submitted_at` condicional): doble clic, dos pestañas o un reintento no duplican correos, eventos ni evaluaciones.
- **Estados:**
  - No iniciado: registrado, sin confirmar condiciones.
  - En progreso: borrador.
  - Completado: enviado.
  - Se muestran al candidato, al admin (ficha y listado) y al Delivery.
- **Volver otro día:** la cuenta del portal se crea al registrarse. La persona vuelve con su enlace personal o ingresando con su correo ("Olvidé mi código" le envía un código). El formulario usa su enlace personal, así que una sesión caducada no hace perder respuestas.
