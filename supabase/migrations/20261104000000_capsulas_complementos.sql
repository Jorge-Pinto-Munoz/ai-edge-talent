-- Cápsulas: recursos complementarios. Re-ejecutable.
-- links: videos, podcasts y enlaces complementarios [{ title, url, kind: 'video' | 'podcast' | 'link' }]
-- extras: archivos complementarios para estudio (PDF y otros) [{ name, path, size }]
alter table public.capsules add column if not exists links jsonb not null default '[]'::jsonb;
alter table public.capsules add column if not exists extras jsonb not null default '[]'::jsonb;
-- Plazo de entrega con hora (due_date queda como respaldo de fecha) y formatos aceptados para la entrega.
alter table public.capsules add column if not exists due_at timestamptz;
alter table public.capsules add column if not exists submission_formats text[];
