-- Import remaining standard products from user list
-- Ensure all products match the requested details (SKU, Price, Category)

insert into public.products (slug, name, price, category_id, image, rating, reviews_count, description, ingredients, stock, is_active)
values
  ('chong-nang-kem', 'Kem chống nắng vật lý SPF50+', 450000,
    (select id from public.categories where slug = 'chong-nang'),
    'https://images.unsplash.com/photo-1556229167-da31d451b80d?w=1080',
    4.9, 85,
    'Bảo vệ da tối ưu với màng lọc vật lý Zinc Oxide & Titanium Dioxide. Không gây bết dính, nâng tông nhẹ nhàng.',
    'Zinc Oxide, Titanium Dioxide, Chiết xuất rau má, Niacinamide.', 53, true),

  ('mat-na-dua-chuot', 'Mặt nạ Dưa Chuột giải nhiệt', 180000,
    (select id from public.categories where slug = 'mat-na'),
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=1080',
    4.7, 42,
    'Mặt nạ chiết xuất dưa chuột tươi giúp giải nhiệt tức thì, cấp nước và làm dịu làn da cháy nắng.',
    'Chiết xuất dưa chuột, Aloe Vera, Hyaluronic Acid.', 99, true),

  ('duong-the-bac-ha', 'Sữa dưỡng thể Bạc Hà mát lạnh', 275000,
    (select id from public.categories where slug = 'duong-the'),
    'https://images.unsplash.com/photo-1552046122-03184de85e08?w=1080',
    4.8, 67,
    'Dưỡng thể với tinh chất bạc hà mang lại cảm giác sảng khoái, mát lạnh và dưỡng ẩm sâu cho làn da.',
    'Tinh dầu bạc hà, Dầu hạt nho, Vitamin E.', 45, true),

  ('serum-vitamin-c', 'Serum Vitamin C sáng da', 420000,
    (select id from public.categories where slug = 'serum'),
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1080',
    4.9, 112,
    'Serum Vitamin C 15% tinh khiết giúp làm sáng da, mờ thâm mụn và chống oxy hóa mạnh mẽ.',
    'L-Ascorbic Acid, Ferulic Acid, Vitamin E.', 30, true),

  ('tay-trang-hoa-hong', 'Dầu tẩy trang Hoa Hồng', 265000,
    (select id from public.categories where slug = 'sua-rua-mat'),
    'https://images.unsplash.com/photo-1617897903246-719242758050?w=1080',
    4.7, 89,
    'Tẩy trang dạng dầu với hương hoa hồng dịu nhẹ, làm sạch sâu lớp trang điểm và bụi bẩn mà không làm khô da.',
    'Dầu hoa hồng, Dầu hạnh nhân, Vitamin E.', 69, true),

  ('toner-gao', 'Toner Nước Gạo dưỡng ẩm', 195000,
    (select id from public.categories where slug = 'toner'),
    'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=1080',
    4.6, 124,
    'Nước hoa hồng chiết xuất từ nước gạo lên men giúp dưỡng ẩm sâu và làm mịn bề mặt da.',
    'Chiết xuất nước gạo, Niacinamide, Glycerin.', 55, true),

  ('sua-rua-mat-tra-xanh', 'Sữa rửa mặt Trà Xanh detox', 210000,
    (select id from public.categories where slug = 'sua-rua-mat'),
    'https://images.unsplash.com/photo-1626784215021-2e39ccf971cd?w=1080',
    4.8, 156,
    'Sữa rửa mặt dạng gel trà xanh giúp làm sạch bã nhờn, thải độc và ngăn ngừa mụn hiệu quả.',
    'Chiết xuất trà xanh Shan Tuyết, Salicylic Acid (BHA).', 63, true),

  ('serum-tra-xanh', 'Serum Trà Xanh kiểm soát dầu', 299000,
    (select id from public.categories where slug = 'serum'),
    'https://images.unsplash.com/photo-1611073100640-522619028a68?w=1080',
    4.7, 88,
    'Serum trà xanh cô đặc giúp kiểm soát dầu thừa, se khít lỗ chân lông và bảo vệ da trước tác động môi trường.',
    'EGCG từ trà xanh, Kẽm PCA, Niacinamide.', 40, true)
on conflict (slug) do update set
  price = excluded.price,
  stock = excluded.stock,
  image = excluded.image;
