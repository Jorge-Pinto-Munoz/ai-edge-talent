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

## Acceso con código por correo (todos los roles)
- **Un solo mecanismo:** correo + código de 6 dígitos enviado a ese correo. Vence en 10 minutos, sirve una vez y tiene 5 intentos. No hay códigos personales (PIN) ni segundo paso para admin.
- **Límites:**
  - 45 s entre envíos y máximo 5 códigos por correo cada 15 minutos.
  - 30 solicitudes y 20 intentos fallidos por red (IP) cada 15 minutos.
- **Anti-enumeración:** la respuesta es la misma exista o no la cuenta. Los códigos no se guardan en claro (HMAC), no se registran en logs ni en el historial de correos, y no se muestran en la administración.
- **Primer ingreso:** activa la cuenta (de PENDIENTE a ACTIVA). Para los roles internos, esto prueba que el correo es de la persona.
- **Invitaciones** (crear cuenta, aprobar solicitud, aviso a Delivery, postulación recibida): no llevan código, solo el enlace para ingresar.
- **Cuentas de demostración** (`.invalid`, solo lectura): entran con un botón, sin código.
- **Migración:** los PIN existentes dejan de usarse y nadie queda bloqueado (todos ingresan con su correo). Los enlaces antiguos de activación abren el nuevo ingreso.

## Cuenta principal
- **Datos:** Jorge Pinto, `jorge.pintom@kibernum.com`, admin principal. Se crea de forma idempotente en `supabase/seed.sql`, sin duplicar, y la base la protege.
- **Ingreso:** con su correo y código, como las demás. El código inicial (`ADMIN_INITIAL_CODE`) ya no se usa.

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
- **Volver otro día:** la cuenta del portal se crea al registrarse y el correo se verifica con un código. La persona vuelve con "Continuar aquí": ingresa su correo, recibe un código y retoma donde quedó. El formulario guarda con su enlace personal, así que una sesión caducada no hace perder respuestas.
