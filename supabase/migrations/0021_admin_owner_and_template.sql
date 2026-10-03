-- Records which HQ-setup industry template (if any) an org was created
-- with, so the admin dashboard can show it.
alter table public.orgs add column signup_template_id text;

-- The admin dashboard already reads orgs/teams/transactions for every org
-- via admin-bypass policies (0002_invites_and_admin.sql), but org_members
-- and profiles never got the same treatment — showing the actual owner's
-- name/email there requires reading both across orgs the admin isn't a
-- member of.
create policy "org_members: admin select" on public.org_members for select using (public.is_admin());
create policy "profiles: admin select" on public.profiles for select using (public.is_admin());
