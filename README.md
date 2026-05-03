# 🌿 VeganGlow — B2C eCommerce Platform

> **Mỹ phẩm thuần chay Việt Nam** — Fullstack Monorepo  
> Dự án cuối kỳ môn **Hệ Thống Thông Tin Quản Lý (MIS)** — Đại học Tôn Đức Thắng

[![Deploy](https://img.shields.io/badge/Production-veganglow.vercel.app-brightgreen?style=flat-square&logo=vercel)](https://veganglow.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)

---

## 📋 Giới thiệu

**VeganGlow** là nền tảng thương mại điện tử B2C chuyên kinh doanh mỹ phẩm thuần chay, 100% không thử nghiệm trên động vật, sử dụng nguyên liệu thiên nhiên Việt Nam. Website phục vụ hai nhóm người dùng chính:

- **Khách hàng (Storefront):** Duyệt sản phẩm, tìm kiếm & lọc, giỏ hàng, thanh toán đa phương thức (Stripe, PayOS/VietQR, COD), theo dõi đơn hàng, đánh giá sản phẩm, quản lý hồ sơ cá nhân.
- **Quản trị viên (Admin Dashboard):** CRUD sản phẩm & danh mục, quản lý đơn hàng, CRM khách hàng, thống kê doanh thu, quản lý nhân sự (mời staff qua email + phân quyền RBAC).

---

## 🏗️ Cấu trúc dự án

```
VeganGlow/
│
├── apps/
│   ├── web/                        # 🌐 Next.js 16 Web App (Storefront + Admin)
│   │   └── src/
│   │       ├── app/                #   App Router — Storefront Pages
│   │       │   ├── (auth)/         #     Đăng nhập / Đăng ký (Google OAuth + Email)
│   │       │   ├── (backoffice)/   #     🔐 Admin Dashboard (RBAC protected)
│   │       │   ├── cart/           #     Giỏ hàng
│   │       │   ├── checkout/       #     Thanh toán đa phương thức
│   │       │   ├── products/       #     Danh sách & Chi tiết sản phẩm
│   │       │   ├── orders/         #     Lịch sử đơn hàng
│   │       │   └── profile/        #     Quản lý tài khoản cá nhân
│   │       ├── lib/                #   Core Libraries
│   │       │   ├── supabase/       #     Supabase Client + Middleware
│   │       │   ├── security/       #     JWT Claims, RBAC logic
│   │       │   └── email.ts        #     Email Service (Gmail OAuth2)
│   │       └── components/         #   Shared UI Components
│   │
│   ├── mobile/                     # 📱 Capacitor (iOS & Android) — planned
│   │
│   └── backend/                    # 🗄️  Supabase Backend
│       └── supabase/
│           ├── functions/          #   Edge Functions (Deno)
│           │   ├── send-email/     #     Transactional Email Service
│           │   └── bank-transfer-webhook/  #   Payment webhook
│           └── migrations/         #   Database Migrations (versioned)
│
├── packages/                       # 📦 Shared Libraries
│   ├── database/                   #   @veganglow/database — DB Types & Clients
│   ├── ui/                         #   @veganglow/ui — Design System Components
│   └── typescript-config/          #   Shared TS configs
│
├── docker/                         # 🐳 Docker (Dev + Production)
│
├── .github/workflows/              # ⚡ CI/CD Pipelines
│   ├── ci.yml                      #   Lint + Type-check + Build on PR
│   ├── deploy-frontend.yml         #   Auto-deploy Web → Vercel
│   ├── deploy-database.yml         #   Auto-push DB migrations → Supabase
│   ├── deploy-functions.yml        #   Auto-deploy Edge Functions
│   └── deploy-docker.yml           #   Auto-push Docker image → Docker Hub
│
├── package.json                    # Monorepo root (npm workspaces)
└── vercel.json                     # Vercel deployment config
```

---

## 🚀 Tech Stack

| Layer | Công nghệ |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript (Strict), Framer Motion |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, RLS, Realtime) |
| **Auth** | Supabase Auth — Google OAuth 2.0 + Email/Password + JWT RBAC |
| **Payments** | Stripe (Quốc tế), PayOS/VietQR (Nội địa), COD |
| **Email** | Nodemailer + Gmail API (Google Cloud OAuth2) |
| **Cache** | Upstash Redis |
| **Deploy** | Vercel (Web), Docker Hub (Container), Supabase Cloud (DB & Functions) |
| **CI/CD** | GitHub Actions — 5 pipelines tự động |
| **Security** | CSP Headers, MFA (TOTP), Idle Timeout, Staff Invitation RBAC |

---

## ⚙️ Hướng dẫn cài đặt

### 1. Clone repository

```bash
git clone https://github.com/Vinsmoke-Visconti/VeganGlow.git
cd VeganGlow
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình biến môi trường

Tạo file `apps/web/.env.local` với nội dung:

```env
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DATABASE_URL=<your-database-connection-string>

# --- Email (Gmail API via Google Cloud Console) ---
GMAIL_USER=<your-project-gmail@gmail.com>
GMAIL_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=<GOCSPX-xxxxx>
GMAIL_REFRESH_TOKEN=<your-refresh-token>

# --- Payments ---
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_test_xxx>
STRIPE_SECRET_KEY=<sk_test_xxx>
PAYOS_CLIENT_ID=<your-payos-client-id>
PAYOS_API_KEY=<your-payos-api-key>
PAYOS_CHECKSUM_KEY=<your-payos-checksum-key>

# --- Cache ---
UPSTASH_REDIS_REST_URL=<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>

# --- Security Feature Flags ---
FEATURE_IDLE_TIMEOUT_ENABLED=true
FEATURE_MFA_ENFORCED=false
```

### 4. Chạy dự án ở chế độ phát triển (Development)

```bash
npm run dev
```

Mở trình duyệt tại: `http://localhost:3000`

### 5. Các lệnh thường dùng

```bash
npm run dev              # Chạy web local (development)
npm run build            # Build production bundle
npm run db:types         # Tự động sinh TypeScript types từ Supabase schema
npm run functions:deploy # Deploy Edge Functions lên Supabase Cloud
npm run docker:prod      # Build Docker image cho production
```

---

## 🔐 Hệ thống bảo mật

| Tính năng | Mô tả |
|---|---|
| **JWT RBAC** | Phân quyền dựa trên `app_metadata` trong JWT — `super_admin`, `admin`, `staff` |
| **Staff Invitation** | Mời nhân sự qua email, hệ thống kiểm tra email đăng nhập khớp chính xác với email được mời |
| **Idle Timeout** | Tự động đăng xuất Admin sau 30 phút không hoạt động |
| **CSP Headers** | Content Security Policy với nonce động cho Admin pages |
| **MFA/TOTP** | Xác thực 2 yếu tố cho Super Admin (tùy chọn bật/tắt) |
| **Strict Isolation** | Khách hàng truy cập `/admin` bị đá ra và ép đăng nhập lại ngay lập tức |
| **RLS** | Row Level Security trên toàn bộ bảng dữ liệu Supabase |

---

## 🔄 CI/CD Pipelines

Dự án sử dụng **5 GitHub Actions workflows** tự động hóa toàn bộ quy trình từ kiểm tra mã nguồn đến triển khai:

| Workflow | Trigger | Chức năng |
|---|---|---|
| `ci.yml` | Pull Request | Lint → Type-check → Build |
| `deploy-frontend.yml` | Push `main` | Auto-deploy Web → Vercel Production |
| `deploy-database.yml` | Push `main` (migrations changed) | Auto-push DB migrations → Supabase |
| `deploy-functions.yml` | Push `main` (functions changed) | Auto-deploy Edge Functions |
| `deploy-docker.yml` | Push `main` | Auto-build & push Docker image → Docker Hub |

---

## 🤖 AI-Assisted Development

Dự án sử dụng công cụ AI như một **trợ lý phát triển** (AI coding assistant) nhằm tăng tốc quá trình xây dựng sản phẩm. Toàn bộ mã nguồn được nhóm kiểm duyệt, chỉnh sửa và chịu trách nhiệm.

**Mục đích sử dụng AI:**
- Tăng tốc thiết lập cấu hình CI/CD pipelines và GitHub Actions workflows.
- Hỗ trợ viết database migrations, RLS policies và các hàm SQL phức tạp.
- Tự động hóa quy trình commit, kiểm tra lỗi TypeScript và deploy lên Vercel/Supabase.
- Hỗ trợ thiết kế kiến trúc bảo mật (JWT RBAC, Staff Invitation, Idle Timeout).
- Tăng tốc debug và xử lý lỗi build trong quá trình phát triển.

> **Lưu ý:** AI được sử dụng như một công cụ hỗ trợ, không thay thế vai trò của nhóm phát triển. Tất cả quyết định về kiến trúc, logic nghiệp vụ và thiết kế hệ thống đều do nhóm thực hiện.

---

## 📧 Hệ thống Email Transactional

Sử dụng **Gmail API (Google Cloud Console OAuth2)** qua Nodemailer. Hệ thống hỗ trợ các loại email:

| Loại email | Mô tả |
|---|---|
| **Welcome** | Chào mừng khách hàng đăng ký mới |
| **Order Confirmation** | Xác nhận đơn hàng (hỗ trợ VietQR cho chuyển khoản) |
| **Payment Success** | Thông báo thanh toán thành công |
| **Shipping Update** | Cập nhật trạng thái giao hàng |
| **Staff Invitation** | Mời nhân sự tham gia hệ thống quản trị |
| **Login Alert** | Cảnh báo đăng nhập Admin bất thường |
| **Contact Confirmation** | Xác nhận đã nhận liên hệ từ khách hàng |

---

## 🌍 Demo & Links

| Tài nguyên | URL |
|---|---|
| **🌐 Production Website** | [veganglow.vercel.app](https://veganglow.vercel.app) |
| **📦 GitHub Repository** | [github.com/Vinsmoke-Visconti/VeganGlow](https://github.com/Vinsmoke-Visconti/VeganGlow) |

---

## 👥 Đội ngũ phát triển

Dự án được thực hiện bởi nhóm sinh viên ngành **Hệ Thống Thông Tin Quản Lý (MIS)** — Đại học Tôn Đức Thắng.  
Đây là sản phẩm demo cho giải pháp doanh nghiệp, nghiêm cấm các hành vi sao chép và sử dụng trái phép.

| Thành viên | MSSV | Email | Công cụ |
|---|---|---|---|
| **Trần Thảo My** | 52300129 | pascallaem@gmail.com | GitHub/Supabase/Vercel/Docker/Snyk: `tranthaomy901` |
| **Huỳnh Nguyễn Quốc Việt** | 52300267 | quocvietcndc@gmail.com | GitHub/Supabase/Sentry/Snyk: `Vinsmoke-Visconti` |
| **Phạm Hoài Thương** | 52300262 | binmin81@gmail.com | GitHub/Supabase/Vercel/Redis/Docker/Snyk: `Terrykozte` |
| **Trần Quỳnh Trâm** | 52300071 | quynhtram5358@gmail.com | GitHub/Supabase/Vercel/Snyk: `chickndot` |

---

*© 2026 VeganGlow — Đại học Tôn Đức Thắng. All rights reserved.*
