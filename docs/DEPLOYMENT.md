# VeganGlow — Hướng dẫn Deployment

## 1. Frontend → Vercel

### Cách 1: GitHub Integration (Khuyến nghị)

1. Push code lên GitHub
2. Truy cập [vercel.com](https://vercel.com) → Import project
3. Chọn repo `VeganGlow`
4. Cấu hình:
   - **Framework**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Thêm Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
6. Deploy!

### Cách 2: Vercel CLI

```bash
cd frontend
npx vercel --prod
```

### Cách 3: GitHub Actions (Auto)

Push to `main` branch → CI/CD tự deploy via `.github/workflows/deploy-frontend.yml`

Cần setup secrets trong GitHub:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## 2. Backend → Supabase

### Database Setup

1. Tạo project tại [supabase.com](https://supabase.com)
2. Chạy migrations:
   ```sql
   -- Copy nội dung backend/supabase/migrations/00001_init_schema.sql
   -- Paste vào SQL Editor → Run
   ```
3. Seed data:
   ```sql
   -- Copy nội dung backend/supabase/migrations/00002_seed_data.sql
   -- Paste vào SQL Editor → Run
   ```

### Edge Functions

```bash
# Cài Supabase CLI
npm install -g supabase

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy checkout
supabase functions deploy send-email

# Set secrets
supabase secrets set RESEND_API_KEY=re_xxx
```

---

## 3. Mobile → App Store & CH Play

### Android (CH Play)

```bash
cd mobile
npm install
npx cap sync android
npx cap open android  # Opens Android Studio

# Build APK
cd android
./gradlew assembleRelease
```

Upload APK/AAB tại [Google Play Console](https://play.google.com/console)

### iOS (App Store)

```bash
cd mobile
npm install
npx cap sync ios
npx cap open ios  # Opens Xcode
```

Build & Archive trong Xcode → Upload via App Store Connect

---

## 4. Docker Deployment

### Development
```bash
npm run docker:dev
```

### Production (VPS/Cloud)
```bash
# Build & run
docker compose -f docker/docker-compose.prod.yml up --build -d

# View logs
docker compose -f docker/docker-compose.prod.yml logs -f
```

---

## Environment Variables Checklist

| Variable | Required | Where |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Vercel + Docker |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Vercel + Docker |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Edge Functions |
| `SUPABASE_PROJECT_REF` | ✅ | CI/CD |
| `VERCEL_TOKEN` | ✅ | GitHub Actions |
| `RESEND_API_KEY` | Optional | Edge Functions |
| `STRIPE_SECRET_KEY` | Optional | Edge Functions |
