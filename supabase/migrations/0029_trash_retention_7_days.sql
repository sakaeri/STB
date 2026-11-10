-- FC売上管理簿 — shorten ゴミ箱 retention from 30 days to 7, now that this
-- org no longer sells externally and wants a lighter, faster-to-clear
-- trash. Re-schedules the same purge-old-trash job (see 0010) with the
-- new interval.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-old-trash') then
    perform cron.unschedule('purge-old-trash');
  end if;
end $$;

select cron.schedule(
  'purge-old-trash',
  '0 3 * * *', -- daily at 03:00 UTC
  $$delete from public.trash_items where deleted_at < now() - interval '7 days';$$
);
