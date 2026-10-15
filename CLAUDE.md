# AI Edge Talent (Kibernum) — guía rápida para Claude

## Forma de trabajar (ahorro de tokens)
- Respuestas cortas en español, trato de "tú". Informe final: qué cambió, qué se probó, qué falta. Sin repetir el pedido.
- Leer solo lo necesario: `Grep` primero, luego `Read` con offset/limit. No releer archivos ya editados.
- Al empezar, leer `PENDIENTES.md` (no el historial). Al terminar, actualizarlo.
- Validar en este orden y parar al primer fallo: `npm run check` (tipos + unitarias) → (si toca SQL) `bash tests/db/run.sh` → build/E2E solo para cambios de UI o flujos.
- Capturas de pantalla solo si el cambio es visual; una por vista.
- Cambios pequeños: un commit y push sin pasos intermedios. No crear PR salvo que se pida.

## Publicar
- Rama `claude/relaxed-tesla-plpdsl`; luego `git push origin HEAD:main` (despliega en Vercel).
- Push a main con cambios en `supabase/**` re-ejecuta todas las migraciones + `supabase/seed.sql`: todo SQL debe ser idempotente.
- Commits como `-c user.name="Jorge-Pinto-Munoz" -c user.email="jorge.esteban@me.com"`.
- Repo público: nunca secretos, contraseñas ni datos reales de candidatos.

## Stack
Next.js 15 (App Router, server actions: todo export de un archivo "use server" es público → validar rol con `requireRole`), React 19, TypeScript, Supabase (RLS, Storage privado con URLs firmadas), Vitest, Playwright. Correo SMTP vía `sendIdentityEmail` (registra en `email_messages`). Cron diario `/api/cron/recordatorios` → `lib/reminders/run.ts`.

## Mapa
- Admisión: `lib/admission/*` (estados en `lib/domain/admission.ts`; decisiones en `decision-actions.ts`; cola/tabla en `queue.ts`; rescate en `rescue.ts` + `candidate-actions.ts`).
- UI admisión: `components/admission/` (`CandidateTable`, `EvaluationDrawer`, `RescueForm`).
- Journey: `lib/journey/*` (apertura de etapa en `opening.ts`), portal del profesional `app/mi-journey`, admin `app/admin/journey/[waveId]/[etapa]`.
- Correos: `lib/email/identity.ts`. Auditoría/idempotencia: `audit(action, { eventKey })` devuelve false si ya existía.
- Migraciones: `supabase/migrations/` (una por cambio, re-ejecutable).

## Reglas de negocio clave
- Estados: APPLICATION_SUBMITTED → ASSESSMENT_EVALUATED/HUMAN_REVIEW → SELECTED | RESCUE_REQUIRED | NOT_SELECTED (terminal). SELECTED → compromiso → journey.
- La recomendación de IA nunca decide; toda decisión es humana, con confirmación y registro.
- Rescate solo con invitación (`rescue_invitations`, 24 h, hora del servidor; la base bloquea fuera de plazo).
- AI First Mindset se abre por Wave (`wave_stage_openings`); el contenido lo bloquea RLS.
- Correos sin duplicar (eventKey) y sin falso éxito: reportar enviado/fallido.
