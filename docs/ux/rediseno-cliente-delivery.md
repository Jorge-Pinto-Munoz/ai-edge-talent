# Rediseño Cliente · Delivery · Admin (octubre 2026)

## Auditoría (antes)

| Área | Problema | Severidad |
|---|---|---|
| Cliente | Bloques de distinto tamaño y sin narrativa; AI CERT explicado en un bloque largo; certificaciones con alturas dispares | Alta |
| Certificaciones | Catálogo plano de 25 tarjetas; descripciones que alargan unas tarjetas; "3 en uso" sin contexto | Media |
| Delivery | Página pública escrita para el participante ("si eres seleccionado/a…"); playbook abierto a cualquiera | Alta |
| Acceso | Delivery entraba igual que cualquier persona; sin registro de ingresos | Alta |
| Consistencia | Estados, KPIs y listas con estilos distintos en cada vista | Media |

## Dirección

Cada perfil tiene su experiencia y su puerta:

- **Cliente (público):** valor → cómo funciona → explorar el talento por rol → evidencia real → qué recibe → nominar → preguntas.
- **Delivery (privado, código de 4 dígitos):** inicio operativo con el recorrido de etapas y "tu gestión" por etapa, alertas reales, playbook consultable y RACI.
- **Admin:** lo anterior más accesos por rol y el registro de ingresos del equipo.

## Arquitectura de información

```
/                      Profesional
/clientes              Cliente · valor, etapas, explorar talento, evidencia, qué recibe, nominar
/certificaciones       Explorador completo (rol → certificaciones → detalle) + talento que desarrollamos
/equipo/ingresar       Ingreso del equipo (correo → código de 4 dígitos)
/equipo                Acompañamiento (privado): KPIs, journey visual, gestión por etapa
/equipo/playbook       Playbook de acompañamiento (privado)
/responsabilidades     RACI (privado)
/admin/accesos         Roles + registro de ingresos (solo admin)
```

## Decisiones

- **Selector de roles en vez de fotos de personas.** No hay fotografía real por especialidad y los avatares genéricos restan credibilidad. Las tarjetas de rol con ícono, conteo y multi-selección son más claras, funcionan igual al tacto y en teclado, y escalan si se agregan roles.
- **Tarjetas uniformes con subgrid** y detalle en panel lateral (drawer).
- **Cifras solo reales** (mínimo 5 personas) y estados vacíos explicados.
- **Contenido de Delivery** construido desde las reglas canónicas del playbook y del ciclo; donde el programa no define un plazo se dice "según el calendario de la Wave".

## Seguridad del acceso de equipo

- Código de 4 números, solo su hash (HMAC con secreto del servidor), vence en 10 min, 5 intentos, máximo 3 códigos cada 15 min y espera de 45 s entre envíos.
- El rol (Delivery o admin) se valida al pedir y al canjear el código; el dominio (`STAFF_EMAIL_DOMAINS`) filtra pero nunca otorga permisos.
- La sesión se abre en el servidor (Supabase Auth) y cada página del área valida el rol en el servidor.
- Auditoría: ingreso, último acceso, término, duración aproximada y secciones consultadas; solo admin; 180 días; informado en pantalla.
- Requiere `RESEND_API_KEY` y `RESEND_FROM` para enviar el código. Sin ellos, en producción se ofrece el ingreso por enlace.
