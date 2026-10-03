-- PDF attachments for memo records, stored alongside the existing image
-- URLs but as {url, name} pairs (a PDF isn't previewable, so the original
-- filename is what identifies it in the UI).
alter table public.memo_records add column pdfs jsonb not null default '[]'::jsonb;
