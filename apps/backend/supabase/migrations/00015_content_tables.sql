-- VeganGlow content tables: testimonials, blog_posts, faqs, contact_messages.
-- Replaces hardcoded arrays in storefront pages and adds a destination for the
-- contact form / newsletter signup so the site runs on real Supabase data.

-- ============== TESTIMONIALS ==============
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  rating integer not null default 5 check (rating between 1 and 5),
  text text not null,
  avatar_initials text not null default '',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists testimonials_active_idx
  on public.testimonials (is_active, display_order);

-- ============== BLOG POSTS ==============
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  category text not null default '',
  read_time_minutes integer not null default 5 check (read_time_minutes > 0),
  lead text not null default '',
  sections jsonb not null default '[]'::jsonb,
  cover_image text,
  published_at timestamptz not null default now(),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx
  on public.blog_posts (is_published, published_at desc);

create or replace function public.touch_blog_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_blog_posts_updated on public.blog_posts;
create trigger trg_blog_posts_updated before update on public.blog_posts
  for each row execute procedure public.touch_blog_posts_updated_at();

-- ============== FAQS ==============
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default '',
  display_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists faqs_visible_idx
  on public.faqs (is_visible, category, display_order);

-- ============== CONTACT MESSAGES ==============
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'read', 'replied')),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_status_idx
  on public.contact_messages (status, created_at desc);

create or replace function public.set_contact_message_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null and auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_contact_messages_user on public.contact_messages;
create trigger trg_contact_messages_user before insert on public.contact_messages
  for each row execute procedure public.set_contact_message_user();

-- ============== RLS ==============
alter table public.testimonials      enable row level security;
alter table public.blog_posts        enable row level security;
alter table public.faqs              enable row level security;
alter table public.contact_messages  enable row level security;

-- testimonials
drop policy if exists testimonials_read_public on public.testimonials;
create policy testimonials_read_public on public.testimonials
  for select to anon, authenticated using (is_active = true);

drop policy if exists testimonials_read_staff on public.testimonials;
create policy testimonials_read_staff on public.testimonials
  for select using (public.is_staff());

drop policy if exists testimonials_write_staff on public.testimonials;
create policy testimonials_write_staff on public.testimonials
  for all using (public.is_staff()) with check (public.is_staff());

-- blog_posts
drop policy if exists blog_posts_read_public on public.blog_posts;
create policy blog_posts_read_public on public.blog_posts
  for select to anon, authenticated
  using (is_published = true and published_at <= now());

drop policy if exists blog_posts_read_staff on public.blog_posts;
create policy blog_posts_read_staff on public.blog_posts
  for select using (public.is_staff());

drop policy if exists blog_posts_write_staff on public.blog_posts;
create policy blog_posts_write_staff on public.blog_posts
  for all using (public.is_staff()) with check (public.is_staff());

-- faqs
drop policy if exists faqs_read_public on public.faqs;
create policy faqs_read_public on public.faqs
  for select to anon, authenticated using (is_visible = true);

drop policy if exists faqs_read_staff on public.faqs;
create policy faqs_read_staff on public.faqs
  for select using (public.is_staff());

drop policy if exists faqs_write_staff on public.faqs;
create policy faqs_write_staff on public.faqs
  for all using (public.is_staff()) with check (public.is_staff());

-- contact_messages: anyone may submit; only staff may read/update/delete
drop policy if exists contact_messages_insert_anyone on public.contact_messages;
create policy contact_messages_insert_anyone on public.contact_messages
  for insert to anon, authenticated with check (true);

drop policy if exists contact_messages_read_staff on public.contact_messages;
create policy contact_messages_read_staff on public.contact_messages
  for select using (public.is_staff());

drop policy if exists contact_messages_update_staff on public.contact_messages;
create policy contact_messages_update_staff on public.contact_messages
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists contact_messages_delete_staff on public.contact_messages;
create policy contact_messages_delete_staff on public.contact_messages
  for delete using (public.is_staff());

-- ============== SEED: testimonials ==============
insert into public.testimonials (name, role, rating, text, avatar_initials, display_order) values
  ('Nguyễn Thị Lan', 'Khách hàng thân thiết', 5,
   'Sau 3 tuần dùng VeganGlow Serum, da mình sáng hẳn lên! Không còn lo ngại về thành phần hóa học nữa.',
   'NL', 1),
  ('Trần Minh Châu', 'Beauty Blogger', 5,
   'Đây là thương hiệu thuần chay Việt Nam mình tự hào giới thiệu. Chất lượng sánh ngang hàng quốc tế.',
   'MC', 2),
  ('Lê Thị Hoa', 'Da nhạy cảm', 5,
   'Da mình cực kỳ nhạy cảm nhưng sản phẩm VeganGlow không gây kích ứng gì. Thực sự yên tâm khi dùng.',
   'LH', 3)
on conflict do nothing;

-- ============== SEED: faqs (10 rows mirroring /faq hardcode) ==============
insert into public.faqs (question, answer, category, display_order) values
  ('Thời gian giao hàng là bao lâu?',
   'Đơn nội thành TP.HCM giao trong 24h, các tỉnh thành khác 2–4 ngày làm việc tùy khu vực.',
   'Đơn hàng & Vận chuyển', 1),
  ('Tôi có thể theo dõi đơn hàng ở đâu?',
   'Sau khi đăng nhập, vào mục "Lịch sử đơn hàng" để theo dõi trạng thái đơn hàng theo thời gian thực.',
   'Đơn hàng & Vận chuyển', 2),
  ('Phí giao hàng tính như thế nào?',
   'Hiện tại VeganGlow miễn phí giao hàng cho mọi đơn hàng trên toàn quốc.',
   'Đơn hàng & Vận chuyển', 3),
  ('Tôi có thể đổi/trả sản phẩm không?',
   'Sản phẩm còn nguyên seal, chưa sử dụng, được đổi trả trong vòng 7 ngày kể từ khi nhận hàng.',
   'Đơn hàng & Vận chuyển', 4),
  ('Sản phẩm VeganGlow có thực sự thuần chay không?',
   'Có. 100% nguyên liệu có nguồn gốc thực vật, không chứa thành phần từ động vật và không thử nghiệm trên động vật.',
   'Sản phẩm & Thành phần', 5),
  ('Sản phẩm phù hợp với da nhạy cảm?',
   'Tất cả sản phẩm đều được kiểm nghiệm da liễu, không paraben, không sulfate, an toàn cho da nhạy cảm.',
   'Sản phẩm & Thành phần', 6),
  ('Hạn sử dụng của sản phẩm là bao lâu?',
   '36 tháng kể từ ngày sản xuất khi chưa mở seal, 12 tháng sau khi mở seal.',
   'Sản phẩm & Thành phần', 7),
  ('Làm sao để tạo tài khoản?',
   'Bấm "Đăng ký" ở góc phải hoặc đăng nhập bằng Google chỉ với 1 click.',
   'Tài khoản & Thanh toán', 8),
  ('VeganGlow chấp nhận hình thức thanh toán nào?',
   'COD (thanh toán khi nhận hàng) và chuyển khoản ngân hàng. Sắp tới sẽ có thêm ví điện tử.',
   'Tài khoản & Thanh toán', 9),
  ('Tôi quên mật khẩu, phải làm sao?',
   'Bấm "Quên mật khẩu" ở trang đăng nhập để nhận link đặt lại qua email.',
   'Tài khoản & Thanh toán', 10)
on conflict do nothing;

-- ============== SEED: blog_posts ==============
insert into public.blog_posts (slug, title, excerpt, category, read_time_minutes, lead, sections, published_at)
values
  ('rau-ma-cho-da-mun',
   'Rau má — bí quyết Việt cho làn da mụn',
   'Tại sao rau má (centella asiatica) là thành phần được giới skincare châu Á tin dùng?',
   'Skincare', 6,
   'Centella asiatica (rau má) là một trong những thành phần được giới skincare châu Á tin dùng. Vì sao? Hãy cùng VeganGlow tìm hiểu cơ chế khoa học đằng sau.',
   '[
     {"heading":"Rau má có gì đặc biệt?","content":"Rau má chứa 4 hợp chất triterpenoids — asiaticoside, madecassoside, asiatic acid và madecassic acid — kết hợp tạo nên hoạt chất TECA giúp giảm viêm, tăng tổng hợp collagen và phục hồi tổn thương trên da."},
     {"heading":"Vì sao tốt cho da mụn?","content":"Mụn về bản chất là phản ứng viêm do vi khuẩn P. acnes kết hợp bít tắc lỗ chân lông. Madecassoside giảm cytokine viêm IL-1, IL-6, làm dịu vết sưng đỏ; asiaticoside thúc đẩy lành thương, hạn chế thâm và sẹo lõm."},
     {"heading":"Cách sử dụng đúng","content":"Sau bước làm sạch và toner, dùng vài giọt serum rau má thoa đều lên da. Có thể dùng sáng và tối. Kết hợp với niacinamide để tăng hiệu quả, tránh dùng cùng AHA/BHA nồng độ cao trong cùng routine."}
   ]'::jsonb,
   '2026-04-10'::timestamptz),
  ('tra-xanh-chong-oxy-hoa',
   'Trà xanh và sức mạnh chống oxy hóa',
   'EGCG trong trà xanh giúp da chống lại các gốc tự do như thế nào.',
   'Khoa học da', 5,
   'EGCG trong trà xanh là một trong những chất chống oxy hóa mạnh nhất thiên nhiên ban tặng — gấp 100 lần vitamin C.',
   '[
     {"heading":"EGCG là gì?","content":"Epigallocatechin gallate (EGCG) là catechin chiếm hơn 50% polyphenol trong lá trà xanh. EGCG trung hòa gốc tự do gây stress oxy hóa, ngăn lão hóa da và tổn thương DNA do tia UV."},
     {"heading":"Lợi ích thực tế","content":"Nghiên cứu cho thấy bôi EGCG giúp giảm sạm nám, tăng độ đàn hồi và làm dịu da kích ứng do nắng. Trong nội thực, một ngày 2 cốc trà xanh giúp kéo dài hiệu quả chống lão hóa."}
   ]'::jsonb,
   '2026-04-03'::timestamptz),
  ('lam-sao-de-doc-bang-thanh-phan',
   'Đọc bảng thành phần mỹ phẩm sao cho đúng?',
   'Hướng dẫn người dùng phổ thông cách nhận biết thành phần an toàn và rủi ro.',
   'Hướng dẫn', 7,
   'Bảng thành phần (INCI) là "lý lịch khai sinh" của mỗi sản phẩm. Học cách đọc nó là bước đầu để trở thành người tiêu dùng thông thái.',
   '[
     {"heading":"Quy tắc thứ tự","content":"Thành phần xếp theo nồng độ giảm dần. 5 cái đầu tiên thường chiếm 80% công thức. Nếu thấy water ở đầu thì sản phẩm gốc nước, petrolatum ở đầu thì gốc dầu."},
     {"heading":"Cảnh giác với gì?","content":"Paraben (methyl-, propyl-) — chất bảo quản gây tranh cãi. Sulfate (SLS, SLES) — gây khô da. Phthalates (DBP, DEHP) — rối loạn nội tiết. Formaldehyde donors như DMDM hydantoin — kích ứng."}
   ]'::jsonb,
   '2026-03-20'::timestamptz)
on conflict (slug) do nothing;
