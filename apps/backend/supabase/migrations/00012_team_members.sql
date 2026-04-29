-- VeganGlow Team members — managed by admin, displayed on public storefront /about
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_label text not null,
  bio text not null default '',
  avatar_url text,
  social_facebook text,
  social_instagram text,
  social_linkedin text,
  display_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists team_members_order_idx on public.team_members(display_order);

alter table public.team_members enable row level security;

drop policy if exists team_members_read on public.team_members;
create policy team_members_read on public.team_members
  for select using (true);

drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members
  for all using (public.is_admin())
  with check (public.is_admin());
