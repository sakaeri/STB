-- Record-level image attachments + "who entered this" attribution.
-- date stays auto-assigned client-side at insert time (today) rather than
-- being a user-picked field, so no schema change needed for that part.
alter table public.memo_records add column images text[] not null default '{}'::text[];
alter table public.memo_records add column created_by uuid references public.profiles(id);
