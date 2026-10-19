-- Delivery: solo lectura y solo de sus candidatos asignados (delivery_assignments). El admin conserva todo.
-- Re-ejecutable: funciones con create or replace y políticas con drop if exists.

create or replace function public.is_delivery_of(p_candidate uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.delivery_assignments a
    join public.profiles p on p.id = auth.uid() and p.role = 'delivery' and p.status = 'ACTIVE'
    where a.candidate_id = p_candidate and a.delivery_email = lower(p.email)
  )
$$;
revoke all on function public.is_delivery_of(uuid) from public;
grant execute on function public.is_delivery_of(uuid) to authenticated;

-- Candidatos: el admin lee y escribe; Delivery solo lee los suyos.
drop policy if exists candidates_staff on public.candidates;
drop policy if exists candidates_admin on public.candidates;
create policy candidates_admin on public.candidates for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists candidates_delivery_read on public.candidates;
create policy candidates_delivery_read on public.candidates for select using (public.is_delivery_of(id));

-- Postulación, historial, compromiso, rescate y correos: lectura del admin o del Delivery asignado.
drop policy if exists applications_staff on public.applications;
create policy applications_staff on public.applications for select using (public.is_admin() or public.is_delivery_of(candidate_id));
drop policy if exists events_staff on public.admission_events;
create policy events_staff on public.admission_events for select using (public.is_admin() or public.is_delivery_of(candidate_id));
drop policy if exists commitments_staff on public.commitment_acceptances;
create policy commitments_staff on public.commitment_acceptances for select using (public.is_admin() or public.is_delivery_of(candidate_id));
drop policy if exists rescue_inv_staff_read on public.rescue_invitations;
create policy rescue_inv_staff_read on public.rescue_invitations for select using (public.is_admin() or public.is_delivery_of(candidate_id));
drop policy if exists emails_staff on public.email_messages;
create policy emails_staff on public.email_messages for select using (public.is_admin() or (candidate_id is not null and public.is_delivery_of(candidate_id)));

-- Asignaciones: cada Delivery ve solo las suyas.
drop policy if exists assignments_read on public.delivery_assignments;
create policy assignments_read on public.delivery_assignments for select
  using (public.is_admin() or delivery_email = lower(coalesce((select email from public.profiles where id = auth.uid() and role = 'delivery' and status = 'ACTIVE'), '')));
