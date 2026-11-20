-- AET Platform · «Habilitar etapa» para todas las etapas (antes solo AI First Mindset). Re-ejecutable.
-- El contenido (módulos) de cada etapa lo ve el profesional solo cuando Administración la habilita para su Wave.

drop policy if exists capsules_read on public.capsules;
create policy capsules_read on public.capsules for select
  using (
    public.is_staff()
    or (public.is_mentor() and published)
    or (public.is_participant_of(wave_id) and published and (layer = 'ASSESSMENT' or public.wave_stage_open(wave_id, layer)))
  );

-- UNA sola vez: etapas que ya tienen módulos publicados y personas trabajando en ellas (o más adelante) quedan
-- habilitadas, sin aviso, para no esconderle contenido a nadie que ya lo está usando. Las demás parten cerradas.
do $bf$
begin
  if not exists (select 1 from public.schema_backfills where key = 'wave_stage_openings_v2') then
    insert into public.wave_stage_openings (wave_id, layer, opens_at, notified_at)
    select distinct cap.wave_id, cap.layer, now(), now()
    from public.capsules cap
    where cap.published and cap.layer not in ('ASSESSMENT', 'AI_MINDSET')
      and exists (
        select 1 from public.candidates c
        where c.wave_id = cap.wave_id and c.journey_layer is not null and c.journey_layer >= cap.layer
          and c.status in ('CONDITIONS_ACCEPTED', 'ENROLLED', 'MINDSET_READY')
      )
    on conflict (wave_id, layer) do nothing;
    insert into public.schema_backfills (key) values ('wave_stage_openings_v2');
  end if;
end $bf$;
