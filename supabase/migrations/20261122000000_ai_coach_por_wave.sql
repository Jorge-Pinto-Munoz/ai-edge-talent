-- AET Platform · El AI Coach es quien dicta Role Enablement (el rol «Profesor» se une a AI Coach). Re-ejecutable.
-- El AI Coach se asigna a Waves (wave_staff, rol 'mentor'), registra las 4 sesiones y ve su Wave en solo lectura.

alter table public.wave_staff drop constraint if exists wave_staff_role_check;
alter table public.wave_staff add constraint wave_staff_role_check check (role in ('profesor', 'hub', 'delivery', 'mentor'));

-- Cuentas «Profesor» que hubieran quedado: pasan a AI Coach con sus mismas Waves.
update public.profiles set role = 'mentor', updated_at = now() where role = 'profesor';
update public.role_grants set role = 'mentor' where role = 'profesor';
insert into public.wave_staff (wave_id, email, role, added_by, added_at)
  select wave_id, email, 'mentor', added_by, added_at from public.wave_staff where role = 'profesor'
  on conflict (wave_id, email, role) do nothing;
delete from public.wave_staff where role = 'profesor';

-- AI Coach de la Wave: lee a los participantes de su Wave.
drop policy if exists candidates_wave_staff on public.candidates;
create policy candidates_wave_staff on public.candidates for select
  using (public.is_wave_staff(wave_id, 'profesor') or public.is_wave_staff(wave_id, 'hub') or public.is_wave_staff(wave_id, 'mentor'));

-- Sesiones de Role Enablement: el AI Coach de la Wave tiene lo mismo que tenía el profesor.
drop policy if exists re_sessions_read on public.re_sessions;
create policy re_sessions_read on public.re_sessions for select using (
  public.is_staff() or public.is_wave_staff(wave_id, 'profesor') or public.is_wave_staff(wave_id, 'mentor')
  or exists (select 1 from public.candidates c where c.id in (select public.my_candidate_ids()) and c.wave_id = re_sessions.wave_id)
);
drop policy if exists re_private_read on public.re_session_private;
create policy re_private_read on public.re_session_private for select using (public.is_admin() or public.is_wave_staff(wave_id, 'profesor') or public.is_wave_staff(wave_id, 'mentor'));
drop policy if exists re_attendance_read on public.re_session_attendance;
create policy re_attendance_read on public.re_session_attendance for select using (public.is_admin() or public.is_wave_staff(wave_id, 'profesor') or public.is_wave_staff(wave_id, 'mentor'));
drop policy if exists re_checkins_read on public.re_session_checkins;
create policy re_checkins_read on public.re_session_checkins for select using (
  public.is_staff() or public.is_wave_staff(wave_id, 'profesor') or public.is_wave_staff(wave_id, 'mentor') or candidate_id in (select public.my_candidate_ids())
);
