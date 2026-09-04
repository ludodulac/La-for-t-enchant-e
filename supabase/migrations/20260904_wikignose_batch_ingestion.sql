alter table public.wikignose_pending_documents
  add column if not exists batch_no integer,
  add column if not exists batch_position integer;

alter table public.wikignose_pending_documents
  drop constraint if exists wikignose_pending_documents_batch_no_check,
  add constraint wikignose_pending_documents_batch_no_check check (batch_no is null or batch_no > 0),
  drop constraint if exists wikignose_pending_documents_batch_position_check,
  add constraint wikignose_pending_documents_batch_position_check check (batch_position is null or batch_position between 1 and 10);

create unique index if not exists wikignose_pending_documents_batch_slot_uidx
  on public.wikignose_pending_documents(batch_no, batch_position)
  where batch_no is not null and batch_position is not null;

create index if not exists wikignose_pending_documents_batch_status_idx
  on public.wikignose_pending_documents(batch_no, status, batch_position);
