# 🌿 VeganGlow

**Website TMĐT mỹ phẩm thuần chay Việt Nam**

Đồ án môn Quản trị hệ thống thông tin — Xây dựng hệ thống thương mại điện tử mỹ phẩm thuần chay với đầy đủ tính năng: đăng ký/đăng nhập, danh mục sản phẩm, giỏ hàng, thanh toán, quản lý đơn hàng, admin dashboard.

---

## 🏗️ Kiến trúc dự án

```
VeganGlow/
├── frontend/         # Next.js 16 (App Router, TypeScript)
├── backend/          # Supabase (Postgres, Edge Functions, Auth, Storage)
│   ├── supabase/
│   │   ├── config.toml
│   │   ├── migrations/   # SQL migrations (schema + seed)
│   │   └── functions/    # Deno Edge Functions
│   └── scripts/          # DB utility scripts
├── mobile/           # Capacitor.js (iOS + Android)
├── docker/           # Docker & docker-compose
├── docs/             # Documentation
├── scripts/          # Setup & deploy scripts
└── .github/          # CI/CD workflows
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, CSS Modules |
| **Backend** | Supabase (Postgres 15, Edge Functions / Deno) |
| **Auth** | Supabase Auth (Email + Social login) |
| **Storage** | Supabase Storage (product images) |
| **State** | Zustand (cart), React hooks (auth, products) |
| **Mobile** | Capacitor.js 6 → iOS (App Store) + Android (CH Play) |
| **Deploy** | Vercel (frontend), Supabase Cloud (backend) |
| **CI/CD** | GitHub Actions (lint → build → deploy) |
| **Container** | Docker + docker-compose |

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/Vinsmoke-Visconti/VeganGlow.git
cd VeganGlow
npm run setup
```

### 2. Configure Environment

Copy `.env.example` → `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

### 3. Setup Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Run `backend/supabase/migrations/00001_init_schema.sql` in SQL Editor
3. Run `backend/supabase/migrations/00002_seed_data.sql` for sample data

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 📱 Mobile App

Build for App Store & CH Play using Capacitor:

```bash
# First, build static export
cd frontend && npm run build

# Sync with native projects
cd ../mobile
npm install
npx cap sync

# Open in IDE
npx cap open android   # Android Studio
npx cap open ios       # Xcode
```

## 🐳 Docker

```bash
# Development
npm run docker:dev

# Production
npm run docker:prod
```

## 🌿 Git Branching

| Branch | Mục đích |
|--------|----------|
| `main` | Production — auto-deploy |
| `develop` | Integration / staging |
| `feature/*` | Tính năng mới |
| `hotfix/*` | Sửa lỗi khẩn |
| `release/*` | Stabilization trước release |

## 📋 Available Commands

| Command | Description |
|---------|------------|
| `npm run dev` | Start dev server (Next.js) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm run type-check` | TypeScript check |
| `npm run db:generate-types` | Regenerate DB types |
| `npm run db:reset` | Reset & reseed database |
| `npm run functions:deploy` | Deploy Edge Functions |
| `npm run mobile:android` | Open Android Studio |
| `npm run mobile:ios` | Open Xcode |
| `npm run docker:dev` | Dev with Docker |
| `npm run setup` | First-time setup |
| `npm run deploy` | Deploy all services |

## 👥 Team

- **Vinsmoke-Visconti** — Lead Developer

## 📄 License

MIT © VeganGlow Team
