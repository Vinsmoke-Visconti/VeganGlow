# PayOS Setup Guide — VeganGlow

Hướng dẫn này dành cho người vừa đăng ký PayOS xong và cần đưa nó hoạt động với hệ thống VeganGlow. Mọi bước **chỉ cần copy-paste** giá trị từ dashboard PayOS sang một nơi (Supabase secrets), tôi không cần bạn nghĩ ra gì cả.

> **Project Supabase ref hiện tại:** `hijzebtakmkyrowdqtrd`
> **Webhook URL bạn sẽ paste vào PayOS:**
> `https://hijzebtakmkyrowdqtrd.supabase.co/functions/v1/payos-webhook`

---

## Phần 1 — Đăng ký + lấy 3 giá trị từ PayOS

### Bước 1. Vào dashboard PayOS

→ https://my.payos.vn → Đăng nhập bằng tài khoản đã đăng ký.

### Bước 2. Liên kết tài khoản ngân hàng nhận tiền

PayOS hỏi bạn nhập tài khoản ngân hàng để nhận tiền. **Nhập đúng tài khoản này:**

| Trường | Giá trị |
|---|---|
| Ngân hàng | **MB Bank (Quân đội)** |
| Số tài khoản | **2111122227777** |
| Tên chủ tài khoản | **PHAM HOAI THUONG** |

> Đây cũng là 3 giá trị mà migration `00019_payment_fixes.sql` đã hardcode. Nếu PayOS yêu cầu OTP/eKYC để xác minh tài khoản → làm theo hướng dẫn của PayOS, đây là quy định ngân hàng.

### Bước 3. Tạo "Kênh thanh toán" (Payment Channel)

Vào **"Kênh thanh toán" → "Thêm kênh"**. Đặt tên gì cũng được (ví dụ: `VeganGlow Production`). Sau khi tạo xong, PayOS hiện 3 giá trị bí mật. **Copy hết 3 giá trị này, lát nữa bạn dán cho tôi:**

| Trường (PayOS dashboard hiển thị) | Tên dùng trong project | Ví dụ format |
|---|---|---|
| `Client ID` | `PAYOS_CLIENT_ID` | `8b9c1234-...-abcd` (UUID) |
| `API Key` | `PAYOS_API_KEY` | `xyz...` (chuỗi dài) |
| `Checksum Key` | `PAYOS_CHECKSUM_KEY` | `abc...` (chuỗi dài, dùng cho HMAC webhook) |

> **CẨN THẬN:** đây là 3 giá trị **bí mật**. Đừng dán chúng vào chat công khai, repo public, hay screenshot có ai khác thấy. Chỉ dán vào **Supabase secrets** ở phần dưới, hoặc gửi cho tôi qua kênh riêng (Anthropic chat này được riêng tư).

### Bước 4. Cấu hình Webhook URL

Trong cùng kênh thanh toán, tìm phần **"Webhook URL"** hoặc **"URL nhận thông báo"**, dán đúng URL này:

```
https://hijzebtakmkyrowdqtrd.supabase.co/functions/v1/payos-webhook
```

Sau đó bấm **"Kiểm tra webhook"** (Test webhook). PayOS sẽ POST một payload rỗng vào URL trên. Nếu trả về `200 OK` thì OK — Edge Function đã được code sẵn để ack ping này.

> Nếu test webhook trả 401/404/500 → xem phần [Khắc phục sự cố](#khắc-phục-sự-cố) bên dưới.

---

## Phần 2 — Bạn gửi 3 giá trị cho tôi

Bạn paste vào ô chat dưới định dạng này (chỉ điền 3 giá trị, các phần khác giữ nguyên):

```
PAYOS_CLIENT_ID=<dán-Client-ID-từ-PayOS>
PAYOS_API_KEY=<dán-API-Key-từ-PayOS>
PAYOS_CHECKSUM_KEY=<dán-Checksum-Key-từ-PayOS>
```

Sau khi nhận, tôi sẽ:
1. Set 3 giá trị này vào Supabase secrets (qua MCP nếu được phép, hoặc tôi đưa lệnh CLI bạn chạy).
2. Deploy `payos-webhook` Edge Function.
3. Apply migration `00019_payment_fixes.sql` lên database.
4. Verify end-to-end với 1 đơn hàng test (chuyển 1.000đ).

---

## Phần 3 — Lệnh deploy (tôi sẽ chạy hộ, bạn không cần)

Tham chiếu để bạn biết tôi đang làm gì:

```bash
# Set secrets cho Edge Function
supabase secrets set PAYOS_CLIENT_ID="..." PAYOS_API_KEY="..." PAYOS_CHECKSUM_KEY="..." \
  --project-ref hijzebtakmkyrowdqtrd

# Deploy webhook (KHÔNG bật JWT verify — PayOS không gửi Supabase JWT)
supabase functions deploy payos-webhook --no-verify-jwt \
  --project-ref hijzebtakmkyrowdqtrd

# Apply migration
supabase db push --project-ref hijzebtakmkyrowdqtrd
```

---

## Phần 4 — Test sau khi deploy

1. Vào storefront → đặt 1 đơn nhỏ (ví dụ 5.000đ), chọn **Chuyển khoản ngân hàng**.
2. Mã QR hiện ra.
3. Mở app MB Bank trên điện thoại → quét QR → chuyển 5.000đ.
4. Trong vòng 1-3 giây, trang web phải tự chuyển sang "Thanh toán đã được xác nhận!" (qua Supabase Realtime).
5. Vào Supabase Studio → table `payment_transactions` → có 1 row mới với `status='matched'`, `provider='payos'`.
6. Vào table `orders` → đơn vừa đặt có `payment_status='paid'`, `paid_at` được set.

---

## Phần 5 — Khắc phục sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Test webhook trả 401 `Invalid signature` | `PAYOS_CHECKSUM_KEY` set sai trong Supabase | Set lại đúng giá trị từ dashboard PayOS |
| Test webhook trả 404 | Edge Function chưa deploy hoặc URL sai | Chạy lại `supabase functions deploy payos-webhook --no-verify-jwt` |
| Đã chuyển tiền nhưng đơn không paid | Xem logs Edge Function trong Supabase Studio | Tìm dòng có `provider_transaction_id` của giao dịch; row trong `payment_transactions` có `status='rejected'` hoặc `'manual_review'` cho biết nguyên nhân |
| `payment_transactions.status='rejected'` | Sai bank/account/account_name | Đối chiếu MB Bank số tài khoản 2111122227777 PHAM HOAI THUONG |
| `payment_transactions.status='manual_review'` reason `ORDER_CODE_NOT_FOUND` | Khách chuyển khoản không có mã `VG-xxxxx-xxxxx` trong nội dung | Liên hệ khách, hoặc super-admin dùng nút **Đánh dấu đã thanh toán** để confirm thủ công |
| `AMOUNT_MISMATCH` | Khách chuyển sai số tiền | Tương tự — manual review hoặc super-admin confirm |

---

## Phần 6 — Bảo mật

- 3 secrets (`PAYOS_*`) **chỉ** nằm trong Supabase secrets, không commit vào git, không paste vào client code.
- Frontend (`NEXT_PUBLIC_*`) **không** chứa bất kỳ giá trị PayOS nào — toàn bộ giao tiếp PayOS chạy server-to-server từ Edge Function.
- Webhook bắt buộc verify HMAC — bất kỳ ai gọi vào URL mà không có signature đúng đều bị reject 401.
- Migration `00019` đã đóng các lỗ hổng review trước đó: stock được hoàn trả khi đơn hết hạn, super_admin có thể manual confirm khi webhook fail, beneficiary-name check không còn bypass khi rỗng.
