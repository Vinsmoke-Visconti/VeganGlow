-- 20260501064556_loyalty_tiers_5_levels.sql
-- Purpose: Replace 4-tier loyalty system (Bronze→Platinum) with 5-tier:
--   Member → Silver → Gold → Platinum → Diamond
-- IMPORTANT: Does NOT alter any existing logic/functions, only updates tier data.

begin;

-- 1. Nullify FK references before modifying tiers
update public.profiles set tier_id = null where tier_id is not null;

-- 2. Remove old tiers that no longer exist in the new system
delete from public.loyalty_tiers where name = 'bronze';

-- 3. Upsert the 5 new tiers (silver, gold, platinum exist but get updated; member and diamond are new)
insert into public.loyalty_tiers (name, display_name, min_lifetime_spend, discount_percent, perks, badge_color, position) values
  ('member',   'Thành viên (Member)',       0,          0,  '{"freeShippingThreshold": 500000}'::jsonb,                                                 '#8B7355', 1),
  ('silver',   'Hạng Bạc (Silver)',         5000000,    3,  '{"freeShippingThreshold": 300000, "birthdayGift": true}'::jsonb,                            '#C0C0C0', 2),
  ('gold',     'Hạng Vàng (Gold)',          20000000,   5,  '{"freeShippingThreshold": 0, "earlyAccess": true, "birthdayGift": true}'::jsonb,            '#FFD700', 3),
  ('platinum', 'Hạng Bạch Kim (Platinum)',  50000000,  10,  '{"freeShippingThreshold": 0, "earlyAccess": true, "personalShopper": true, "birthdayGift": true}'::jsonb, '#E5E4E2', 4),
  ('diamond',  'Hạng Kim Cương (Diamond)', 100000000,  15,  '{"freeShippingThreshold": 0, "earlyAccess": true, "personalShopper": true, "birthdayGift": true, "vipLounge": true, "exclusiveEvents": true}'::jsonb, '#B9F2FF', 5)
on conflict (name) do update set
  display_name = excluded.display_name,
  min_lifetime_spend = excluded.min_lifetime_spend,
  discount_percent = excluded.discount_percent,
  perks = excluded.perks,
  badge_color = excluded.badge_color,
  position = excluded.position;

-- 4. Recompute tiers for all profiles using existing function
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.recompute_loyalty_tier(r.id);
  end loop;
end $$;

commit;
