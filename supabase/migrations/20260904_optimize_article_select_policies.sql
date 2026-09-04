-- Avoid overlapping permissive SELECT policies on public.articles.
-- Anonymous visitors can read published articles.
-- Authenticated users can read published articles; app admins can also read drafts.

drop policy if exists articles_read_public on public.articles;
drop policy if exists articles_select_admin on public.articles;

create policy articles_read_anon
on public.articles
for select
to anon
using (published = true);

create policy articles_read_authenticated
on public.articles
for select
to authenticated
using (published = true or public.is_app_admin());
