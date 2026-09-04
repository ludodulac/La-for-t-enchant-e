-- Wikignose module for La Forêt Enchantée
-- 2026-09-04
--
-- Goals:
-- - use the existing La Forêt Enchantée Supabase project as the single backend;
-- - preserve existing authenticated admins by enrolling current auth.users once;
-- - keep Wikignose PDFs private;
-- - namespace Wikignose application data to avoid collisions.

create extension if not exists pgcrypto;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = (select auth.uid())
  );
$$;

-- Existing La Forêt Enchantée admin historically allowed any signed-in account.
-- Enrol all accounts already present at migration time, then protect future admin use
-- with the explicit allow-list above.
insert into public.app_admins (user_id)
select id from auth.users
on conflict (user_id) do nothing;

drop policy if exists "admins can verify own app role" on public.app_admins;
create policy "admins can verify own app role"
on public.app_admins
for select
to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.wikignose_pending_documents (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  original_filename text not null,
  file_size bigint,
  title_hint text,
  course_hint text,
  school_hint text,
  current_hint text,
  masters_hint text[],
  status text not null default 'pending' check (status in ('pending','indexing','indexed','error','archived')),
  uploaded_by uuid references auth.users(id) default auth.uid(),
  uploaded_at timestamptz not null default now(),
  indexed_at timestamptz,
  index_note text
);

alter table public.wikignose_pending_documents enable row level security;
revoke all on public.wikignose_pending_documents from anon;
grant select, insert, update, delete on public.wikignose_pending_documents to authenticated;

drop policy if exists "app admins view wikignose pending documents" on public.wikignose_pending_documents;
create policy "app admins view wikignose pending documents"
on public.wikignose_pending_documents
for select
to authenticated
using (public.is_app_admin());

drop policy if exists "app admins insert wikignose pending documents" on public.wikignose_pending_documents;
create policy "app admins insert wikignose pending documents"
on public.wikignose_pending_documents
for insert
to authenticated
with check (public.is_app_admin() and uploaded_by = (select auth.uid()));

drop policy if exists "app admins update wikignose pending documents" on public.wikignose_pending_documents;
create policy "app admins update wikignose pending documents"
on public.wikignose_pending_documents
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

drop policy if exists "app admins delete wikignose pending documents" on public.wikignose_pending_documents;
create policy "app admins delete wikignose pending documents"
on public.wikignose_pending_documents
for delete
to authenticated
using (public.is_app_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wikignose-pdfs', 'wikignose-pdfs', false, 104857600, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "app admins read wikignose pdfs" on storage.objects;
create policy "app admins read wikignose pdfs"
on storage.objects
for select
to authenticated
using (bucket_id = 'wikignose-pdfs' and public.is_app_admin());

drop policy if exists "app admins upload wikignose pdfs" on storage.objects;
create policy "app admins upload wikignose pdfs"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'wikignose-pdfs' and public.is_app_admin());

drop policy if exists "app admins update wikignose pdfs" on storage.objects;
create policy "app admins update wikignose pdfs"
on storage.objects
for update
to authenticated
using (bucket_id = 'wikignose-pdfs' and public.is_app_admin())
with check (bucket_id = 'wikignose-pdfs' and public.is_app_admin());

drop policy if exists "app admins delete wikignose pdfs" on storage.objects;
create policy "app admins delete wikignose pdfs"
on storage.objects
for delete
to authenticated
using (bucket_id = 'wikignose-pdfs' and public.is_app_admin());
