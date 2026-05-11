-- 20260511007000_customer_edit_otps.sql
-- Create table to store OTPs for editing customer profiles

begin;

create table if not exists public.customer_edit_otps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  otp_code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for quick lookup
create index if not exists customer_edit_otps_user_id_idx on public.customer_edit_otps(user_id);

-- RLS
alter table public.customer_edit_otps enable row level security;

-- Only super admins or staff with users write permission can read/write otps
create policy "Staff can manage customer edit otps" on public.customer_edit_otps
  for all using (public.has_permission('users', 'write') or public.is_super_admin())
  with check (public.has_permission('users', 'write') or public.is_super_admin());

commit;
