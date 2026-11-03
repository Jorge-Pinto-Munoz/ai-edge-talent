-- Entregas y certificaciones: solo el admin las revisa (aprueba / no aprueba / verifica).
-- Delivery solo lee las de sus asignados. Re-ejecutable.
drop policy if exists subs_staff on public.submissions;
drop policy if exists subs_admin on public.submissions;
create policy subs_admin on public.submissions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists subs_delivery_read on public.submissions;
create policy subs_delivery_read on public.submissions for select using (public.is_delivery_of(candidate_id));

drop policy if exists certs_staff on public.certifications;
drop policy if exists certs_admin on public.certifications;
create policy certs_admin on public.certifications for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists certs_delivery_read on public.certifications;
create policy certs_delivery_read on public.certifications for select using (public.is_delivery_of(candidate_id));
