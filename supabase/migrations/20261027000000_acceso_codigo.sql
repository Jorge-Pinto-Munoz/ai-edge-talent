-- Acceso con código por correo (re-ejecutable): se registra también cada solicitud de código para limitar
-- abusos por red (IP) sin revelar si un correo está registrado.
alter table public.login_attempts add column if not exists kind text not null default 'verify';
alter table public.login_attempts drop constraint if exists login_attempts_kind_check;
alter table public.login_attempts add constraint login_attempts_kind_check check (kind in ('verify', 'request'));
create index if not exists login_attempts_ip_kind on public.login_attempts (ip_hash, kind, at desc);
