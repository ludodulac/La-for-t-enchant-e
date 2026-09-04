alter table public.wikignose_pending_documents
  add column if not exists batch_instruction text;

create index if not exists wikignose_pending_documents_batch_instruction_idx
  on public.wikignose_pending_documents(batch_no)
  where batch_instruction is not null;
