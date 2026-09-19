-- FC売上管理簿 — enforce the "30日間保存、31日目に自動完全削除" that the
-- ゴミ箱 UI has always claimed, via a daily pg_cron job (previously nothing
-- actually purged trash_items — it just accumulated indefinitely).
create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-old-trash') then
    perform cron.unschedule('purge-old-trash');
  end if;
end $$;

select cron.schedule(
  'purge-old-trash',
  '0 3 * * *', -- daily at 03:00 UTC
  $$delete from public.trash_items where deleted_at < now() - interval '30 days';$$
);
