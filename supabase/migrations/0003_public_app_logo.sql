-- FC売上管理簿 — public read access to the operator's global logo, so it can
-- be shown on the login screen before the visitor has an account.
create function public.get_public_app_logo()
returns text language sql security definer set search_path = public stable as $$
  select logo_url from public.app_settings where id = 1;
$$;
grant execute on function public.get_public_app_logo() to anon, authenticated;
