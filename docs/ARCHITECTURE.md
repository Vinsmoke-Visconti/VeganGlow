# VeganGlow — Kiến trúc hệ thống

## Tổng quan

```
┌─────────────────────────────────────────────────────────┐
│                    USERS / BROWSERS                      │
│              (Desktop, Mobile, App Store, CH Play)        │
└──────────┬───────────────────────────────┬───────────────┘
           │                               │
           ▼                               ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│   Vercel (CDN)      │     │   Capacitor.js              │
│   Next.js 16 SSR    │     │   (iOS / Android wrapper)   │
│   ┌───────────────┐ │     │   Points to Vercel URL      │
│   │ App Router    │ │     └─────────────────────────────┘
│   │ Server Comp.  │ │
│   │ Client Comp.  │ │
│   │ Middleware     │ │
│   └──────┬────────┘ │
└──────────┼──────────┘
           │ REST / Realtime
           ▼
┌─────────────────────────────────────────────────────────┐
│                   SUPABASE CLOUD                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ Auth     │  │ Database │  │ Edge      │  │Storage │ │
│  │ (JWT)    │  │ Postgres │  │ Functions │  │ (S3)   │ │
│  │          │  │ + RLS    │  │ (Deno)    │  │        │ │
│  └──────────┘  └──────────┘  └───────────┘  └────────┘ │
│                                                          │
│  Tables: profiles, categories, products, orders,         │
│          order_items, reviews, favorites, addresses       │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Xác thực (Authentication)
- User đăng nhập → Supabase Auth trả JWT
- JWT lưu trong cookie (managed by @supabase/ssr)
- Next.js middleware refresh session mỗi request
- RLS policies sử dụng `auth.uid()` để authorize

### 2. Đọc dữ liệu (Server-side)
- Next.js Server Components fetch trực tiếp từ Supabase
- Không expose API routes cho public read operations
- Sử dụng Supabase server client (cookie-based)

### 3. Ghi dữ liệu (Client-side)
- Client components gọi Supabase trực tiếp (browser client)
- RLS policies đảm bảo authorization
- Complex operations (checkout) → Edge Functions

### 4. Checkout Flow
```
Client → Edge Function (checkout)
  → Validate cart items
  → Check stock availability
  → Create order + order_items
  → Update product stock
  → Return order_code
  → (Optional) Trigger send-email function
```

## Security Model

| Resource | Read | Write |
|----------|------|-------|
| Products | Public (is_active) | Admin only |
| Categories | Public | Admin only |
| Profiles | Self + Admin | Self only |
| Orders | Self + Admin | Self (create), Admin (update) |
| Reviews | Public | Owner only |
| Favorites | Owner | Owner |
| Addresses | Owner | Owner |
