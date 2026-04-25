-- Seed categories + 6 initial VeganGlow products.
-- Idempotent: re-running won't create duplicates.

insert into public.categories (name, slug) values
  ('Serum', 'serum'),
  ('Toner', 'toner'),
  ('Mặt nạ', 'mat-na'),
  ('Sữa rửa mặt', 'sua-rua-mat'),
  ('Dưỡng thể', 'duong-the'),
  ('Chống nắng', 'chong-nang')
on conflict (slug) do nothing;

insert into public.products (slug, name, price, category_id, image, rating, reviews_count, description, ingredients, stock, is_active)
values
  ('tinh-chat-rau-ma', 'Tinh chất Rau Má giảm mụn phục hồi', 350000,
    (select id from public.categories where slug = 'serum'),
    'https://images.unsplash.com/photo-1773567844398-debd18f215b4?w=1080',
    4.8, 124,
    'Serum Rau Má từ thiên nhiên giúp làm dịu da mụn, giảm sưng viêm và kích thích quá trình phục hồi da.',
    'Chiết xuất rau má, Niacinamide, B5, Hyaluronic Acid.', 50, true),

  ('toner-diep-ca', 'Nước hoa hồng Diếp Cá làm dịu da', 280000,
    (select id from public.categories where slug = 'toner'),
    'https://images.unsplash.com/photo-1556228994-efb7c88fa0f9?w=1080',
    4.7, 98,
    'Toner chiết xuất từ lá diếp cá hữu cơ giúp cấp ẩm nhẹ nhàng, cân bằng pH.',
    'Chiết xuất diếp cá, Nước cất, Allantoin.', 45, true),

  ('mat-na-nghe-tuoi', 'Mặt nạ Nghệ Tươi sáng da mờ thâm', 250000,
    (select id from public.categories where slug = 'mat-na'),
    'https://images.unsplash.com/photo-1768235146447-26b1549f845a?w=1080',
    4.9, 215,
    'Mặt nạ rửa từ nghệ tươi Hưng Yên, tẩy tế bào chết nhẹ nhàng, giảm thâm mụn.',
    'Chiết xuất nghệ tươi, Mật ong thuần chay, Đất sét trắng.', 60, true),

  ('sua-rua-mat-dau-dua', 'Sữa rửa mặt Dầu Dừa dịu nhẹ', 190000,
    (select id from public.categories where slug = 'sua-rua-mat'),
    'https://images.unsplash.com/photo-1771309224199-ca868f4a772b?w=1080',
    4.6, 156,
    'Sữa rửa mặt chứa chiết xuất dầu dừa Bến Tre, làm sạch sâu không gây khô căng.',
    'Dầu dừa tinh khiết, Vitamin E, Glycerin.', 80, true),

  ('duong-the-hoa-dau-biec', 'Sữa dưỡng thể Hoa Đậu Biếc cấp ẩm', 320000,
    (select id from public.categories where slug = 'duong-the'),
    'https://images.unsplash.com/photo-1695634326951-36ce362fa3df?w=1080',
    4.8, 74,
    'Cấp ẩm toàn thân với hoa đậu biếc và lô hội. Thấm nhanh, không bết dính.',
    'Chiết xuất hoa đậu biếc, Bơ hạt mỡ, Dầu jojoba.', 35, true),

  ('chong-nang-tra-xanh', 'Kem chống nắng Trà Xanh Shan Tuyết', 390000,
    (select id from public.categories where slug = 'chong-nang'),
    'https://images.unsplash.com/photo-1596980846062-81a524d170ee?w=1080',
    4.9, 310,
    'Bảo vệ da khỏi UV với màng lọc thế hệ mới và chiết xuất trà xanh chống oxy hóa.',
    'Chiết xuất trà xanh Shan Tuyết, Tinosorb S, Kẽm Oxit.', 70, true)
on conflict (slug) do nothing;

-- To promote a user to admin after they sign up, run (replace the email):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
