-- Indexes covering historical foreign keys reported by Supabase advisors.
-- Safe performance-only change: no data or access policy modification.

create index if not exists audios_category_id_idx
  on public.audios(category_id);

create index if not exists audios_subcategory_id_idx
  on public.audios(subcategory_id);

create index if not exists subcategories_category_id_idx
  on public.subcategories(category_id);
