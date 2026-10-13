-- Control de accesos (re-ejecutable):
--  · Los roles internos (Líder de producto/admin, Delivery, Hub AI, AI Coach, Profesor, Business Partner) solo los
--    asigna Administración. Una cuenta que nace con un rol interno queda PENDIENTE y sin permisos hasta que la
--    persona demuestra que el correo es suyo (código temporal → crea su código personal), aunque alguien
--    consiga crear el usuario de Auth por otra vía.
--  · La cuenta de administración principal y la última cuenta admin activa no se pueden degradar, pausar ni
--    eliminar (lo impide la base, no solo la interfaz).
--  · Las solicitudes públicas de cuenta no pueden pedir roles internos.

-- ───────────── Rol vigente: los roles internos exigen cuenta activa ─────────────
create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles
  where id = auth.uid() and (status = 'ACTIVE' or (status = 'PENDING' and role in ('kiber', 'client')))
$$;

-- ───────────── Perfil al crear el usuario de Auth ─────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare g public.role_grants; r public.app_role;
begin
  select * into g from public.role_grants where email = lower(new.email);
  r := coalesce(g.role, 'kiber');
  insert into public.profiles (id, email, role, client_name, status)
  values (new.id, lower(new.email), r, g.client_name, case when r in ('kiber', 'client') then 'ACTIVE' else 'PENDING' end)
  on conflict (id) do nothing;
  update public.candidates set user_id = new.id where lower(corporate_email) = lower(new.email) and user_id is null;
  return new;
end $$;

-- ───────────── Administración principal y última cuenta admin ─────────────
alter table public.profiles add column if not exists principal boolean not null default false;
create unique index if not exists profiles_one_principal on public.profiles (principal) where principal;

create or replace function public.guard_admin_accounts() returns trigger
language plpgsql set search_path = public as $$
declare others int;
begin
  if tg_op = 'UPDATE' then
    -- La marca de principal solo la pone el servidor (inicialización), nunca una sesión de usuario.
    if new.principal is distinct from old.principal and current_user in ('authenticated', 'anon') then
      raise exception 'No autorizado para cambiar la cuenta principal.' using errcode = '42501';
    end if;
    if old.principal and (new.role <> 'admin' or new.status in ('PAUSED', 'REVOKED', 'DELETED') or not new.principal) then
      raise exception 'La cuenta de administración principal no se puede degradar, pausar ni eliminar.' using errcode = 'P0001';
    end if;
    if old.role = 'admin' and old.status = 'ACTIVE' and (new.role <> 'admin' or new.status <> 'ACTIVE') then
      select count(*) into others from public.profiles where role = 'admin' and status = 'ACTIVE' and id <> old.id;
      if others = 0 then
        raise exception 'Debe quedar al menos una cuenta de administración activa.' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;
  -- DELETE
  if old.principal then
    raise exception 'La cuenta de administración principal no se puede eliminar.' using errcode = 'P0001';
  end if;
  if old.role = 'admin' and old.status = 'ACTIVE' then
    select count(*) into others from public.profiles where role = 'admin' and status = 'ACTIVE' and id <> old.id;
    if others = 0 then
      raise exception 'Debe quedar al menos una cuenta de administración activa.' using errcode = 'P0001';
    end if;
  end if;
  return old;
end $$;

drop trigger if exists profiles_guard_admins on public.profiles;
create trigger profiles_guard_admins before update or delete on public.profiles
  for each row execute function public.guard_admin_accounts();

-- ───────────── Solicitudes públicas: sin roles internos ─────────────
-- NOT VALID: no revalida solicitudes antiguas; rige para toda solicitud nueva o modificada.
alter table public.access_requests drop constraint if exists access_requests_requested_role_check;
alter table public.access_requests add constraint access_requests_requested_role_check
  check (requested_role is null or requested_role in ('kiber', 'bp')) not valid;
