do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select from pg_roles where rolname='authenticator') then create role authenticator login noinherit password 'e2epass'; end if;
  if not exists (select from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin login createrole password 'e2epass'; end if;
end $$;
alter role service_role bypassrls;
grant anon, authenticated, service_role to authenticator;
do $$ begin
  if not exists (select from pg_roles where rolname='supabase_storage_admin') then create role supabase_storage_admin login createrole noinherit password 'e2epass'; end if;
end $$;
grant anon, authenticated, service_role to supabase_storage_admin;
