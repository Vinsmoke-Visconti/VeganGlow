# Hướng dẫn Kiểm tra & Xác nhận Hệ thống (UAT)

Để đảm bảo hệ thống VeganGlow hoạt động 100% công suất và sẵn sàng cho bài báo cáo, bạn hãy thực hiện kiểm tra theo danh sách các nhiệm vụ (Task) sau:

## 1. Kiểm tra Dòng khách hàng (Customer Flow)

| Task | Cách thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- |
| **Tải dữ liệu thực** | Mở trang chủ (`/`) | Thấy 4 sản phẩm đầu tiên hiện ra (được lấy từ Supabase). |
| **Tìm kiếm & Lọc** | Vào `/products`, gõ tên sản phẩm hoặc chọn "Serum" | Danh sách sản phẩm thay đổi theo đúng từ khóa/loại. |
| **Xem chi tiết** | Click vào một sản phẩm bất kỳ | Trang chuyển đến `/products/[id]` với đúng thông tin thành phần. |
| **Giỏ hàng (Context)** | Nhấn nút (+) ở nhiều sản phẩm, sau đó vào giỏ hàng | Số lượng sản phẩm hiển thị đúng, tổng tiền tính chính xác. |
| **Tính bền vững** | Thêm đồ vào giỏ, sau đó F5 (Reload) trang | Giỏ hàng vẫn giữ nguyên (kiểm tra LocalStorage). |

## 2. Kiểm tra Hệ thống Quản trị & BI (Admin Flow)

| Task | Cách thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- |
| **Dashboard** | Truy cập `/admin` | Thấy các thẻ KPI (Doanh thu, Khách hàng...) hiển thị đẹp mắt. |
| **Quản lý thực tế** | Vào `/admin/products`, nhấn nút Thùng rác đỏ | Hệ thống hỏi xác nhận, sau đó sản phẩm biến mất khỏi bảng và DB. |
| **Báo cáo BI** | Vào `/admin/bi` | Kiểm tra xem các biểu đồ (Line, Donut) có hiển thị đúng layout yêu cầu. |

## 3. Kiểm tra Kỹ thuật (Technical Check)

| Task | Cách thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- |
| **Build Production** | Chạy lệnh `npm run build` | Không có lỗi đỏ, hiện bảng danh sách các Route (`/`, `/admin`, ...). |
| **Biến môi trường** | Kiểm tra file `.env.local` | Đảm bảo không có dấu cách thừa hoặc sai URL (https). |

---

## 🛠 Hướng dẫn thực hiện Kiểm tra ngay bây giờ:

1.  **Chạy server**: Mở terminal, gõ `npm run dev`.
2.  **Mở trình duyệt**: Vào [http://localhost:3000](http://localhost:3000).
3.  **Thử nghiệm Xóa**: 
    *   Mở thêm 1 tab mới vào trang admin: [http://localhost:3000/admin/products](http://localhost:3000/admin/products).
    *   Thử xóa 1 sản phẩm.
    *   Quay lại tab khách hàng [http://localhost:3000/products](http://localhost:3000/products) và F5. Sản phẩm đó phải biến mất. **Nếu bước này thành công, nghĩa là kết nối Supabase của bạn đã hoạt động 100%!**

> [!IMPORTANT]
> **Mẹo cho báo cáo**: Khi kiểm tra từng bước, hãy **chụp ảnh màn hình**. Đây chính là bằng chứng (Evidence) quan trọng nhất cho chương **"Thực nghiệm và Kết quả"** trong file báo cáo Word của bạn.
