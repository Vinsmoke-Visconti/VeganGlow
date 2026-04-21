# Hướng dẫn chi tiết sử dụng Supabase cho VeganGlow

Để hoàn thiện yêu cầu của đồ án (sử dụng Supabase làm Backend), bạn cần thực hiện các bước cấu hình cơ sở dữ liệu và kết nối mã nguồn như sau:

## 1. Thiết lập Database trên Supabase

Truy cập [Supabase Dashboard](https://supabase.com/dashboard), tạo một dự án mới và thực thi các lệnh SQL sau trong **SQL Editor** để tạo cấu trúc bảng:

### Tạo bảng Sản phẩm (Products)
```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL NOT NULL,
  ingredients TEXT,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thêm dữ liệu mẫu (Dựa trên products.json)
INSERT INTO products (name, category, price, ingredients, image_url)
VALUES 
('Serum Rau Má Phục Hồi', 'Serum', 350000, 'Chiết xuất rau má, HA, B5', '/images/product1.png'),
('Toner Diếp Cá Kiềm Dầu', 'Toner', 280000, 'Chiết xuất diếp cá, AHA', '/images/product2.png');
```

### Tạo bảng Đơn hàng (Orders) - Cho BI
```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_name TEXT,
  total_amount DECIMAL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. Kết nối Next.js với Supabase

### Cấu hình Biến môi trường
Mở file `.env.local` và thay thế bằng thông tin thực tế từ **Project Settings > API**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Cách lấy dữ liệu trong Code
Thay vì import từ `products.json`, bạn hãy sửa logic tại các trang (như `src/pages/products/index.js`) như sau:

```javascript
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

// Trong component:
const [products, setProducts] = useState([]);

useEffect(() => {
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*');
    
    if (data) setProducts(data);
  };
  fetchProducts();
}, []);
```

---

## 3. Các tính năng Supabase có thể tận dụng cho Báo cáo

Để "WOW" hội đồng chấm thi, bạn nên đưa các nội dung này vào báo cáo:

1.  **Authentication**: Sử dụng Supabase Auth để tạo trang Đăng nhập/Đăng ký cho khách hàng và Admin.
2.  **Storage**: Tải ảnh sản phẩm lên Supabase Storage thay vì để trong thư mục `public`.
3.  **Realtime**: Hiển thị thông báo đơn hàng mới ngay lập tức trên trang Admin Dashboard khi có khách đặt hàng.

---

## 4. Gợi ý cho báo cáo Word (Chương 2: Thiết kế hệ thống)

*   **ERD**: Sử dụng cấu trúc bảng SQL ở trên để vẽ sơ đồ thực thể mối quan hệ.
*   **An toàn dữ liệu**: Giải thích cách Supabase sử dụng **PostgreSQL** và cơ chế **Row Level Security (RLS)** để bảo mật thông tin khách hàng.

> [!IMPORTANT]
> Nếu bạn muốn tôi sửa trực tiếp mã nguồn để chuyển hẳn sang lấy dữ liệu từ Supabase (thay vì file JSON), hãy cho tôi biết nhé!
