# 🌿 VeganGlow — B2C eCommerce Platform

> **Mỹ phẩm thuần chay Việt Nam** — Fullstack Monorepo  
> Dự án cuối kỳ môn **Hệ Thống Thông Tin Quản Lý (MIS)** — Đại học Tôn Đức Thắng

[![Deploy](https://img.shields.io/badge/Production-veganglow.vercel.app-brightgreen?style=flat-square&logo=vercel)](https://veganglow.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)

---

## 📋 Giới thiệu doanh nghiệp

**VeganGlow** là thương hiệu mỹ phẩm thuần chay tại Việt Nam, chuyên phát triển các sản phẩm chăm sóc da và chăm sóc cá nhân từ nguồn nguyên liệu thiên nhiên quen thuộc của Việt Nam. Sản phẩm 100% không thử nghiệm trên động vật, đáp ứng tiêu chuẩn khắt khe về thành phần lành tính.

- **Lĩnh vực:** Mỹ phẩm và chăm sóc cá nhân thiên nhiên thuần chay  
- **Mô hình kinh doanh:** B2C — bán trực tiếp đến người tiêu dùng qua website TMĐT  
- **Khách hàng mục tiêu:** Gen Z & Millennials (18–35 tuổi), quan tâm đến tiêu dùng xanh, thành phần lành tính và trải nghiệm mua sắm online  

---

## 🎯 Chức năng chính

### Module Khách hàng (Storefront)

| Chức năng | Mô tả |
|---|---|
| **Đăng ký / Đăng nhập** | Hỗ trợ Google OAuth 2.0 và Email/Password với JWT session |
| **Tìm kiếm & Lọc sản phẩm** | Lọc theo danh mục, loại da, mức giá, từ khóa |
| **Giỏ hàng** | Thêm/xóa/cập nhật số lượng, tính tổng tiền tự động |
| **Thanh toán đa phương thức** | Stripe (quốc tế), PayOS/VietQR (chuyển khoản nội địa), COD |
| **Lịch sử đơn hàng** | Theo dõi trạng thái đơn từ chờ xác nhận → đang giao → hoàn thành |
| **Đánh giá sản phẩm** | Khách hàng đã mua có thể để lại đánh giá và nhận xét |
| **Quản lý hồ sơ** | Thông tin cá nhân, địa chỉ giao hàng (tích hợp địa chỉ hành chính VN) |
| **Wishlist & Voucher** | Lưu sản phẩm yêu thích, sử dụng mã giảm giá |

### Module Quản trị (Admin Dashboard)

| Chức năng | Mô tả |
|---|---|
| **CRUD Sản phẩm & Danh mục** | Thêm/sửa/xóa sản phẩm, quản lý biến thể (size, màu), upload hình ảnh |
| **Quản lý đơn hàng** | Xem chi tiết, cập nhật trạng thái, theo dõi thanh toán |
| **Dashboard tổng quan** | Thống kê doanh thu, đơn hàng, khách hàng mới theo thời gian thực |
| **CRM Khách hàng** | KPI stats, lịch sử mua hàng, tổng chi tiêu, phân khúc khách hàng |
| **Quản lý nhân sự** | Mời staff qua email, phân quyền RBAC (super_admin, admin, staff) |

---

## 🏗️ Kiến trúc hệ thống & Tech Stack

### Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│   Next.js 16 (App Router) + TypeScript + Framer Motion  │
│   ┌──────────────┐  ┌──────────────┐                    │
│   │  Storefront   │  │  Admin Panel  │                   │
│   │  (Public)     │  │  (Protected)  │                   │
│   └──────┬───────┘  └──────┬───────┘                    │
└──────────┼─────────────────┼────────────────────────────┘
           │                 │
           ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                  MIDDLEWARE LAYER                        │
│   JWT Validation · RBAC · CSP · Idle Timeout · MFA      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND LAYER                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Supabase    │  │  Edge Funcs  │  │  Gmail API   │  │
│  │  PostgreSQL  │  │  (Deno)      │  │  (OAuth2)    │  │
│  │  + Auth      │  │  send-email  │  │  Nodemailer  │  │
│  │  + RLS       │  │  webhook     │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Stripe      │  │  PayOS       │  │  Upstash     │  │
│  │  (Payments)  │  │  (VietQR)    │  │  Redis       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  DEPLOY & CI/CD                         │
│  Vercel (Web) · Docker Hub · GitHub Actions (5 pipes)   │
└─────────────────────────────────────────────────────────┘
```

### Chi tiết công nghệ sử dụng

| Thành phần | Công nghệ | Vai trò trong hệ thống |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript | Framework xây dựng giao diện web, hỗ trợ SSR/SSG, Server Components cho hiệu suất cao |
| **UI/UX** | Framer Motion, CSS Modules | Tạo giao diện hiện đại với micro-animations, responsive design |
| **Database** | Supabase (PostgreSQL) | Lưu trữ toàn bộ dữ liệu: sản phẩm, đơn hàng, khách hàng, nhân sự. Hỗ trợ Realtime subscription |
| **Authentication** | Supabase Auth | Xác thực người dùng qua Google OAuth 2.0 và Email/Password. Quản lý JWT session, refresh token |
| **Authorization** | Row Level Security (RLS) | Phân quyền cấp dòng dữ liệu: khách hàng chỉ thấy đơn hàng của mình, admin thấy tất cả |
| **Edge Functions** | Supabase Edge Functions (Deno) | Xử lý logic phía server: gửi email, webhook thanh toán, xử lý nghiệp vụ không cần expose API key |
| **Email** | Nodemailer + Gmail API (Google Cloud OAuth2) | Gửi email giao dịch: xác nhận đơn, mời nhân sự, cảnh báo đăng nhập. Dùng OAuth2 thay vì mật khẩu |
| **Thanh toán quốc tế** | Stripe | Xử lý thanh toán thẻ Visa/Mastercard, webhook xác nhận giao dịch tự động |
| **Thanh toán nội địa** | PayOS + VietQR | Tạo mã QR chuyển khoản ngân hàng Việt Nam, webhook xác nhận tự động |
| **Cache** | Upstash Redis | Lưu cache session, rate limiting, tăng tốc truy vấn thường xuyên |
| **Hosting** | Vercel | Deploy website production với CDN toàn cầu, tự động scale, preview mỗi PR |
| **Container** | Docker | Đóng gói ứng dụng trong container để chạy nhất quán trên mọi môi trường |
| **CI/CD** | GitHub Actions | Tự động kiểm tra mã nguồn, build, deploy khi có thay đổi trên nhánh chính |
| **Monitoring** | Sentry | Theo dõi lỗi runtime trên production, cảnh báo realtime |

---

## 📁 Cấu trúc dự án (Monorepo)

```
VeganGlow/
│
├── apps/
│   ├── web/                        # 🌐 Next.js Web App (Storefront + Admin)
│   │   └── src/
│   │       ├── app/                #   App Router — Tất cả các trang
│   │       │   ├── (auth)/         #     Đăng nhập / Đăng ký
│   │       │   ├── (backoffice)/   #     🔐 Admin Dashboard (RBAC protected)
│   │       │   ├── cart/           #     Giỏ hàng
│   │       │   ├── checkout/       #     Thanh toán đa phương thức
│   │       │   ├── products/       #     Danh sách & Chi tiết sản phẩm
│   │       │   ├── orders/         #     Lịch sử đơn hàng
│   │       │   ├── profile/        #     Quản lý tài khoản
│   │       │   ├── blog/           #     Blog làm đẹp
│   │       │   ├── contact/        #     Liên hệ
│   │       │   └── about/          #     Giới thiệu
│   │       ├── lib/                #   Core Libraries
│   │       │   ├── supabase/       #     Supabase Client + Middleware
│   │       │   ├── security/       #     JWT Claims, RBAC logic
│   │       │   ├── email.ts        #     Email Service (Gmail OAuth2)
│   │       │   └── payment.ts      #     Payment logic (Stripe, PayOS, VietQR)
│   │       └── components/         #   Shared UI Components
│   │
│   ├── mobile/                     # 📱 Capacitor (iOS & Android) — planned
│   │
│   └── backend/                    # 🗄️  Supabase Backend
│       └── supabase/
│           ├── functions/          #   Edge Functions (Deno)
│           │   ├── send-email/     #     Gửi email giao dịch
│           │   └── bank-transfer-webhook/  #  Webhook thanh toán
│           └── migrations/         #   Database Migrations (versioned)
│
├── packages/                       # 📦 Shared Libraries (Monorepo)
│   ├── database/                   #   @veganglow/database — DB Types & Clients
│   ├── ui/                         #   @veganglow/ui — Design System Components
│   └── typescript-config/          #   Shared TypeScript configs
│
├── docker/                         # 🐳 Docker (Dev + Production)
│   ├── Dockerfile.frontend         #   Build image cho Web App
│   ├── docker-compose.yml          #   Dev environment
│   └── docker-compose.prod.yml     #   Production environment
│
└── .github/workflows/              # ⚡ CI/CD Pipelines (5 workflows)
    ├── ci.yml                      #   Lint + Type-check + Build on PR
    ├── deploy-frontend.yml         #   Auto-deploy Web → Vercel
    ├── deploy-database.yml         #   Auto-push DB migrations → Supabase
    ├── deploy-functions.yml        #   Auto-deploy Edge Functions
    └── deploy-docker.yml           #   Auto-push Docker image → Docker Hub
```

---

## 🔐 Hệ thống bảo mật

Hệ thống áp dụng mô hình bảo mật nhiều lớp (Defense in Depth), xử lý phân quyền ở cấp database thay vì client-side:

| Lớp bảo mật | Cơ chế | Mô tả |
|---|---|---|
| **Xác thực** | Supabase Auth + Google OAuth 2.0 | Đăng nhập an toàn, JWT session tự động refresh |
| **Phân quyền RBAC** | JWT `app_metadata` | 3 cấp: `super_admin` → `admin` → `staff`. Kiểm tra ở Middleware, không để client tự quyết |
| **RLS (Row Level Security)** | PostgreSQL Policies | Mỗi bảng dữ liệu có chính sách phân quyền riêng: khách chỉ thấy data của mình |
| **Staff Invitation** | Email match verification | Khi mời nhân sự, hệ thống kiểm tra email đăng nhập phải khớp chính xác email được mời |
| **Strict Isolation** | Middleware guard | Tài khoản khách hàng truy cập `/admin` bị buộc đăng xuất và chuyển về trang login Admin |
| **Idle Timeout** | Cookie-based timer | Admin không thao tác 30 phút → tự động đăng xuất, yêu cầu xác thực lại |
| **MFA/TOTP** | Supabase MFA | Xác thực 2 yếu tố cho Super Admin (tùy chọn bật/tắt qua feature flag) |
| **CSP Headers** | Dynamic nonce | Content Security Policy với nonce ngẫu nhiên cho mỗi request Admin |
| **HTTPS + SSL/TLS** | Vercel + Supabase | Mã hóa toàn bộ dữ liệu truyền tải |

---

## 🔄 CI/CD — Tự động hóa triển khai

Dự án sử dụng **5 GitHub Actions workflows** tự động hóa toàn bộ quy trình từ kiểm tra mã nguồn đến triển khai production:

| Workflow | Kích hoạt khi | Chức năng |
|---|---|---|
| `ci.yml` | Tạo Pull Request | Tự động chạy ESLint → TypeScript check → Build thử. PR lỗi sẽ bị chặn merge |
| `deploy-frontend.yml` | Push vào `main` | Build Next.js → Deploy tự động lên Vercel Production |
| `deploy-database.yml` | Push `main` (thay đổi migrations) | Áp dụng database migrations lên Supabase Cloud tự động |
| `deploy-functions.yml` | Push `main` (thay đổi functions) | Deploy Edge Functions lên Supabase Cloud |
| `deploy-docker.yml` | Push vào `main` | Build Docker image → Push lên Docker Hub |

**Quy trình CI/CD:**
```
Developer push code → GitHub Actions tự động:
  1. Lint & Type-check (chặn lỗi)
  2. Build production bundle (chặn lỗi compile)
  3. Deploy Web → Vercel
  4. Deploy DB migrations → Supabase
  5. Deploy Edge Functions → Supabase
  6. Push Docker image → Docker Hub
```

---

## 📧 Hệ thống Email giao dịch

Sử dụng **Gmail API** thông qua **Google Cloud Console (OAuth2)** kết hợp **Nodemailer**, đảm bảo gửi email an toàn mà không cần lưu trữ mật khẩu Gmail trong mã nguồn.

| Loại email | Đối tượng | Mô tả |
|---|---|---|
| **Welcome** | Khách hàng | Chào mừng đăng ký tài khoản mới |
| **Order Confirmation** | Khách hàng | Xác nhận đơn hàng, chi tiết sản phẩm, mã QR thanh toán (VietQR) |
| **Payment Success** | Khách hàng | Thông báo thanh toán thành công |
| **Shipping Update** | Khách hàng | Cập nhật trạng thái giao hàng |
| **Contact Confirmation** | Khách hàng | Xác nhận đã nhận liên hệ/phản hồi |
| **Staff Invitation** | Nhân sự | Email mời tham gia hệ thống quản trị với link kích hoạt |
| **Login Alert** | Admin | Cảnh báo đăng nhập bất thường vào Admin Dashboard |

---

## 🤖 AI-Assisted Development

Dự án sử dụng **AI coding assistant** như một công cụ hỗ trợ nhằm tăng tốc quá trình phát triển phần mềm. Toàn bộ mã nguồn được nhóm kiểm duyệt, chỉnh sửa và chịu trách nhiệm hoàn toàn.

**Mục đích sử dụng AI trong dự án:**

- **Tăng tốc cấu hình hạ tầng:** Thiết lập CI/CD pipelines, GitHub Actions workflows, Docker configs.
- **Hỗ trợ database:** Viết database migrations, RLS policies, stored procedures (SQL).
- **Tự động hóa quy trình:** Auto-commit, kiểm tra lỗi TypeScript, tự động deploy lên Vercel/Supabase.
- **Thiết kế bảo mật:** Xây dựng kiến trúc JWT RBAC, Staff Invitation verification, Idle Timeout logic.
- **Debug & tối ưu:** Phát hiện và sửa lỗi build, tối ưu hiệu suất truy vấn database.

> **Lưu ý quan trọng:** AI chỉ đóng vai trò **công cụ hỗ trợ kỹ thuật**, không thay thế vai trò thiết kế và ra quyết định của nhóm phát triển. Tất cả quyết định về kiến trúc hệ thống, logic nghiệp vụ, thiết kế giao diện và chiến lược triển khai đều do nhóm thực hiện và chịu trách nhiệm.

---

## ⚙️ Hướng dẫn cài đặt & chạy dự án

### Yêu cầu hệ thống

- **Node.js** ≥ 20.0.0
- **npm** hoặc **pnpm**
- **Git**

### Cài đặt

```bash
# 1. Clone repository
git clone https://github.com/Vinsmoke-Visconti/VeganGlow.git
cd VeganGlow

# 2. Cài đặt dependencies
npm install

# 3. Cấu hình biến môi trường
# Tạo file apps/web/.env.local và điền các biến theo hướng dẫn trong .env.example

# 4. Chạy dự án
npm run dev
```

### Biến môi trường cần thiết

Dự án yêu cầu cấu hình các dịch vụ sau trong file `.env.local`:

| Nhóm | Dịch vụ | Mục đích |
|---|---|---|
| **Database & Auth** | Supabase | URL, Anon Key, Service Role Key để kết nối database và xác thực |
| **Email** | Google Cloud Console | Gmail OAuth2 credentials (Client ID, Secret, Refresh Token) để gửi email giao dịch |
| **Thanh toán** | Stripe | Publishable Key & Secret Key để xử lý thanh toán quốc tế |
| **Thanh toán** | PayOS | Client ID, API Key, Checksum Key để xử lý chuyển khoản nội địa |
| **Cache** | Upstash Redis | REST URL & Token để cache session và rate limiting |
| **Deploy** | Vercel | Token, Org ID, Project ID cho CLI deployment |

> Liên hệ nhóm phát triển để nhận file `.env.local` đầy đủ cho mục đích đánh giá.

### Lệnh thường dùng

```bash
npm run dev              # Chạy web ở chế độ phát triển (localhost:3000)
npm run build            # Build production bundle
npm run db:types         # Tự động sinh TypeScript types từ Supabase schema
npm run functions:deploy # Deploy Edge Functions lên Supabase Cloud
npm run docker:prod      # Build Docker image cho production
```

---

## 🗄️ Database Schema (Các bảng dữ liệu chính)

| Bảng | Mô tả |
|---|---|
| `profiles` | Thông tin khách hàng: tên, email, địa chỉ, loại da, điểm thành viên |
| `products` | Sản phẩm: tên, mô tả, giá, thành phần, danh mục, hình ảnh |
| `product_variants` | Biến thể sản phẩm: kích cỡ, màu sắc, số lượng tồn kho |
| `categories` | Danh mục sản phẩm: sữa rửa mặt, toner, serum, kem dưỡng... |
| `orders` | Đơn hàng: trạng thái, tổng tiền, phương thức thanh toán, địa chỉ giao |
| `order_items` | Chi tiết đơn: sản phẩm, số lượng, đơn giá |
| `reviews` | Đánh giá sản phẩm từ khách hàng |
| `staff_profiles` | Nhân sự quản trị: vai trò (super_admin, admin, staff) |
| `staff_invitations` | Lời mời nhân sự: email, token, trạng thái, thời hạn |
| `vouchers` | Mã giảm giá: loại, giá trị, điều kiện sử dụng |

---

## 🌍 Demo & Links

| Tài nguyên | URL |
|---|---|
| **🌐 Website Production** | [veganglow.vercel.app](https://veganglow.vercel.app) |
| **📦 Source Code** | [github.com/Vinsmoke-Visconti/VeganGlow](https://github.com/Vinsmoke-Visconti/VeganGlow) |

---

## 👥 Đội ngũ phát triển

Dự án được thực hiện bởi nhóm sinh viên ngành **Hệ Thống Thông Tin Quản Lý (MIS)** — Đại học Tôn Đức Thắng.  
⚠️ Đây là sản phẩm demo cho giải pháp doanh nghiệp, nghiêm cấm các hành vi sao chép và sử dụng trái phép.

| Thành viên | MSSV | Email | GitHub |
|---|---|---|---|
| **Trần Thảo My** | 52300129 | pascallaem@gmail.com | `tranthaomy901` |
| **Huỳnh Nguyễn Quốc Việt** | 52300267 | quocvietcndc@gmail.com | `Vinsmoke-Visconti` |
| **Phạm Hoài Thương** | 52300262 | binmin81@gmail.com | `Terrykozte` |
| **Trần Quỳnh Trâm** | 52300071 | quynhtram5358@gmail.com | `chickndot` |

---

*© 2026 VeganGlow — Đại học Tôn Đức Thắng. All rights reserved.*
