-- Mémoire minimale pour rééditer les couvertures composées.
-- image_path reste l'unique couverture consommée par le site public.
alter table public.audios
  add column if not exists illustration_key text,
  add column if not exists cover_color text;
