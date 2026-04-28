-- VeganGlow — Identity fields for customer profiles
-- Adds fields for personalized experience and identity verification (CCCD)

alter table public.profiles
  add column if not exists username       text,
  add column if not exists gender         text check (gender in ('male', 'female', 'other')),
  add column if not exists birthday       date,
  add column if not exists cccd_number    text,
  add column if not exists cccd_full_name text;

-- Enforce username uniqueness for customers
create unique index if not exists profiles_username_uniq
  on public.profiles (lower(username))
  where username is not null;
