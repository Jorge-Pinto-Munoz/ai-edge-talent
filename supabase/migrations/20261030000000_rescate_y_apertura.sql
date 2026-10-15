-- Rescate con plazo y apertura de etapas por Wave (re-ejecutable).
--
-- 1) Invitación de rescate: solo existe si Administración ofreció formalmente el rescate a alguien que no quedó
--    seleccionado directamente. Tiene vencimiento (24 h por defecto, calculado en el servidor) y la base de datos
--    impide registrar o reemplazar un video sin invitación vigente.
-- 2) Apertura de AI First Mindset por Wave: el contenido de la etapa queda bloqueado (RLS) hasta la apertura que
--    decide Administración, aunque la persona ya pueda ingresar a su portal.

-- ───────────── 1 · Invitación de rescate ─────────────
create table if not exists public.rescue_invitations (
  candidate_id uuid primary key references public.candidates (id) on delete cascade,
  wave_id text not null references public.waves (id) on delete cascade,
  offered_by uuid references auth.users (id) on delete set null,
  offered_at timestamptz not null default now(),
  expires_at timestamptz,                 -- null: sin plazo (rescates habilitados antes de esta versión)
  explanation text,                       -- texto revisado por Administración que va en el correo
  started_at timestamptz,                 -- abrió la grabación o la subida ("en preparación")
  extended_at timestamptz,
  extended_by uuid references auth.users (id) on delete set null,
  expired_logged_at timestamptz,          -- vencimiento registrado (auditoría)
  admin_notified_at timestamptz           -- aviso a Administración de que llegó el video
);
create index if not exists rescue_invitations_wave on public.rescue_invitations (wave_id);
alter table public.rescue_invitations enable row level security;
drop policy if exists rescue_inv_staff_read on public.rescue_invitations;
create policy rescue_inv_staff_read on public.rescue_invitations for select using (public.is_staff());
-- Escritura solo desde el servidor (llave de servicio), después de validar el rol de Administración.

-- Rescates habilitados antes de esta versión: quedan con invitación sin plazo (no se les quita la oportunidad).
insert into public.rescue_invitations (candidate_id, wave_id, offered_at, expires_at)
select c.id, c.wave_id, coalesce(c.updated_at, now()), null
from public.candidates c
where c.status = 'RESCUE_REQUIRED'
on conflict (candidate_id) do nothing;

-- Sin invitación vigente no se registra ni se reemplaza un video (la revisión del admin sí se puede guardar).
create or replace function public.rescue_window_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.video_path is distinct from old.video_path or new.video_url is distinct from old.video_url then
    if not exists (
      select 1 from public.rescue_invitations i
      where i.candidate_id = new.candidate_id and (i.expires_at is null or now() <= i.expires_at)
    ) then
      raise exception 'El plazo del rescate venció o no hay una invitación de rescate vigente.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists rescue_videos_window on public.rescue_videos;
create trigger rescue_videos_window before insert or update on public.rescue_videos
  for each row execute function public.rescue_window_guard();

-- ───────────── 2 · Apertura de etapas por Wave ─────────────
create table if not exists public.wave_stage_openings (
  wave_id text not null references public.waves (id) on delete cascade,
  layer public.journey_layer not null,
  opens_at timestamptz,                   -- abierta desde (puede ser futura: apertura programada)
  set_by uuid references auth.users (id) on delete set null,
  set_at timestamptz not null default now(),
  notified_at timestamptz,                -- aviso de "primer reto disponible" enviado
  primary key (wave_id, layer)
);
alter table public.wave_stage_openings enable row level security;
drop policy if exists stage_open_read on public.wave_stage_openings;
create policy stage_open_read on public.wave_stage_openings for select
  using (public.is_staff() or public.is_participant_of(wave_id) or public.is_mentor());

create or replace function public.wave_stage_open(p_wave text, p_layer public.journey_layer) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wave_stage_openings
    where wave_id = p_wave and layer = p_layer and opens_at is not null and opens_at <= now()
  )
$$;

-- Cápsulas: AI First Mindset solo se ve cuando la Wave abrió la etapa (no basta con cambiar la URL).
drop policy if exists capsules_read on public.capsules;
create policy capsules_read on public.capsules for select
  using (
    public.is_staff()
    or (public.is_mentor() and published)
    or (public.is_participant_of(wave_id) and published and (layer <> 'AI_MINDSET' or public.wave_stage_open(wave_id, 'AI_MINDSET')))
  );

-- Progreso: solo sobre cápsulas visibles para la persona (no se marca una etapa cerrada).
drop policy if exists progress_self on public.capsule_progress;
create policy progress_self on public.capsule_progress for all
  using (candidate_id in (select public.my_candidate_ids()))
  with check (candidate_id in (select public.my_candidate_ids()) and exists (select 1 from public.capsules c where c.id = capsule_id));

-- Waves que ya tienen personas en el journey al publicar esta versión: AI First Mindset queda abierta (no se
-- bloquea a nadie que ya avanza). Corre UNA sola vez: las Waves nuevas quedan cerradas hasta que Administración abra.
create table if not exists public.schema_backfills (key text primary key, applied_at timestamptz not null default now());
alter table public.schema_backfills enable row level security;
do $bf$
begin
  if not exists (select 1 from public.schema_backfills where key = 'wave_stage_openings_v1') then
    insert into public.wave_stage_openings (wave_id, layer, opens_at, notified_at)
    select distinct c.wave_id, 'AI_MINDSET'::public.journey_layer, now(), now()
    from public.candidates c
    where c.status in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY') or c.journey_layer is not null
    on conflict (wave_id, layer) do nothing;
    insert into public.schema_backfills (key) values ('wave_stage_openings_v1');
  end if;
end $bf$;
