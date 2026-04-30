# VeganGlow — Fullstack Monorepo

> Mỹ phẩm thuần chay Việt Nam — B2C eCommerce Platform

## Cấu trúc dự án

```
VeganGlow/
│
├── apps/                          # 🚀 CÁC ỨNG DỤNG CHẠY ĐƯỢC
│   ├── web/                       # 🌐 Next.js Web App (User + Admin)
│   │   └── src/
│   │       ├── app/               #   App Router — Trang User (Home, Cart, Checkout)
│   │       │   ├── (auth)/        #     Đăng nhập / Đăng ký
│   │       │   ├── cart/          #     Giỏ hàng
│   │       │   ├── checkout/      #     Thanh toán
│   │       │   ├── products/      #     Chi tiết sản phẩm (slug)
│   │       │   ├── orders/        #     Lịch sử đơn hàng
│   │       │   └── profile/       #     Trang cá nhân
│   │       └── pages/             #   Pages Router — Admin Panel
│   │           ├── admin/         #     🔐 Quản trị (Products, Orders, Users)
│   │           │   ├── products/  #       CRUD Sản phẩm
│   │           │   ├── orders/    #       Quản lý đơn hàng
│   │           │   └── users/     #       Quản lý người dùng
│   │           └── api/           #     API Routes (server-side logic)
│   │
│   ├── mobile/                    # 📱 Mobile App (Capacitor — iOS & Android)
│   │   └── capacitor.config.ts    #   Cấu hình Capacitor
│   │
│   └── backend/                   # 🗄️  Supabase Backend
│       ├── supabase/
│       │   ├── functions/         #   Edge Functions (Deno)
│       │   └── migrations/        #   Database migrations
│       ├── schema.sql             #   Schema đầy đủ (Tables + RLS)
│       └── seed.sql               #   Dữ liệu mẫu 6 sản phẩm
│
├── packages/                      # 📦 CODE DÙNG CHUNG (Shared Libraries)
│   ├── database/                  # 🔌 @veganglow/database
│   │   └── src/
│   │       ├── index.ts           #   Entry point — export tất cả
│   │       ├── database.ts        #   TypeScript types (Auto-generated từ Supabase)
│   │       ├── helpers.ts         #   Tables<T>, TablesInsert<T>, TablesUpdate<T>
│   │       └── clients/           #   Supabase Clients cho từng môi trường
│   │           ├── client.ts      #     Browser Client (use client)
│   │           ├── server.ts      #     Server Client (Server Components)
│   │           └── middleware.ts  #     Middleware Client (session refresh)
│   │
│   ├── ui/                        # 🎨 @veganglow/ui
│   │   └── src/
│   │       ├── index.ts           #   Entry point — export tất cả components
│   │       └── components/        #   Shared UI Components
│   │           ├── Navbar.js      #     Thanh điều hướng
│   │           ├── Footer.js      #     Footer
│   │           ├── Layout.js      #     Layout User
│   │           ├── AdminLayout.js #     Layout Admin
│   │           └── AdminSidebar.js#     Sidebar Admin
│   │
│   └── typescript-config/         # ⚙️  @veganglow/typescript-config
│       ├── base.json              #   Config gốc (Strict mode)
│       └── nextjs.json            #   Config cho Next.js
│
├── docker/                        # 🐳 Docker
│   ├── Dockerfile.frontend        #   Build image cho Web App
│   ├── docker-compose.yml         #   Dev environment
│   └── docker-compose.prod.yml    #   Production environment
│
├── .github/workflows/             # ⚡ CI/CD (GitHub Actions)
│   ├── ci.yml                     #   Lint + Type-check + Build on PR
│   ├── deploy-frontend.yml        #   Auto-deploy lên Vercel khi push main
│   └── deploy-docker.yml          #   Auto-push Docker image lên Docker Hub
│
├── package.json                   # 📋 Monorepo root — npm workspaces
├── pnpm-workspace.yaml            # 📋 pnpm workspace config (khuyên dùng)
└── vercel.json                    # ▲  Vercel deployment config
```

## Phân vai trò

| Vai trò | Nhìn vào đâu | Làm gì |
|---|---|---|
| **Frontend Dev** | `apps/web/src/app/` | Xây dựng trang User (Next.js App Router) |
| **Admin Dev** | `apps/web/src/pages/admin/` | Xây dựng trang Quản trị |
| **Mobile Dev** | `apps/mobile/` | Phát triển iOS/Android với Capacitor |
| **Backend/DB Dev** | `apps/backend/` | Viết Edge Functions, quản lý migrations |
| **UI/Design Dev** | `packages/ui/` | Tạo design system, shared components |
| **DevOps** | `docker/`, `.github/workflows/` | CI/CD, containers, deployment |

## Lệnh hay dùng

```bash
# Chạy web local
npm run dev

# Rebuild database types từ Supabase
npm run db:types

# Deploy Supabase Edge Functions
npm run functions:deploy

# Build Docker image
npm run docker:prod
```

## Tech Stack

- **Web:** Next.js 16 (App Router + Pages Router), TypeScript, Supabase SSR
- **Mobile:** Capacitor (iOS + Android), chia sẻ DB types với Web
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, RLS)
- **Deploy:** Vercel (Web), Docker Hub (Container), GitHub Actions (CI/CD)

## Đội ngũ phát triển (Development Team)

Dự án được thực hiện bởi nhóm sinh viên MIS - Đại học Tôn Đức Thắng. Đây là sản phẩm demo cho giải pháp doanh nghiệp, nghiêm cấm các hành vi sao chép và sử dụng trái phép.

| Thành viên | MSSV | Vai trò & Liên hệ | Công cụ |
|---|---|---|---|
| **Trần Thảo My** | 52300129 | pascallaem@gmail.com | Github/Supabase/Vercel/Docker/Snyk: `tranthaomy901`<br/>Redis: `22 .Trần Thảo` |
| **Huỳnh Nguyễn Quốc Việt** | 52300267 | quocvietcndc@gmail.com | Github/Supabase/Sentry/Snyk: `Vinsmoke-Visconti`<br/>Vercel: `vinsmoke-visconti`<br/>Redis: `viet quoc`<br/>Docker: `viscontivinsmoke` |
| **Phạm Hoài Thương** | 52300262 | binmin81@gmail.com | Github/Supabase/Vercel/Redis/Docker/Snyk: `Terrykozte` |
| **(Đang cập nhật)** | - | - | - |

---
*© 2026 VeganGlow. All rights reserved.*
