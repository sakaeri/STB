-- Tags where a transaction row came from (manual entry vs a bank CSV
-- import), so a future dashboard stat can show what share of records are
-- actually being filled in via CSV import.
alter table public.transactions add column source text not null default 'manual';
