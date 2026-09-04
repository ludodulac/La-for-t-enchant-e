alter table public.wikignose_pending_documents
  add column if not exists sha256 text;

create unique index if not exists wikignose_pending_documents_sha256_uidx
  on public.wikignose_pending_documents(sha256)
  where sha256 is not null;
