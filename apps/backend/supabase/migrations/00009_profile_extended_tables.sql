-- VeganGlow — Profile extended tables
-- Defines tables for user settings, notifications, vouchers, and bank accounts

-- ============== USER_SETTINGS ==============
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  order_updates      boolean default true,
  promo_emails       boolean default false,
  wallet_updates     boolean default true,
  chat_notifications boolean default true,
  newsletters        boolean default false,
  updated_at         timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Auto-create settings when a profile is created
create or replace function public.handle_new_profile_settings()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_profile_created_settings on public.profiles;
create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_settings();

-- ============== NOTIFICATIONS ==============
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  content    text not null,
  type       text default 'info', -- 'info', 'success', 'warning', 'error'
  is_read    boolean default false,
  link       text,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ============== USER_VOUCHERS ==============
create table if not exists public.user_vouchers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  voucher_id uuid not null references public.vouchers(id) on delete cascade,
  is_used    boolean default false,
  used_at    timestamptz,
  created_at timestamptz default now(),
  unique (user_id, voucher_id)
);

alter table public.user_vouchers enable row level security;

create policy "Users can view own vouchers"
  on public.user_vouchers for select
  using (auth.uid() = user_id);

-- ============== USER_BANKS ==============
create table if not exists public.user_banks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  bank_name      text not null,
  account_number text not null,
  account_holder text not null,
  is_default     boolean default false,
  type           text default 'bank' check (type in ('bank', 'card')),
  card_type      text, -- 'visa', 'mastercard', etc.
  created_at     timestamptz default now()
);

alter table public.user_banks enable row level security;

create policy "Users can view own banks"
  on public.user_banks for select
  using (auth.uid() = user_id);

create policy "Users can manage own banks"
  on public.user_banks for all
  using (auth.uid() = user_id);
