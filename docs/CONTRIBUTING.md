# VeganGlow — Hướng dẫn đóng góp

## Quy trình làm việc

1. **Fork** repo (hoặc clone nếu là team member)
2. Tạo branch mới từ `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/ten-tinh-nang
   ```
3. Code & commit theo convention
4. Push branch và tạo Pull Request → `develop`
5. Review → Merge

## Commit Convention

```
<type>(<scope>): <description>

feat(products): thêm bộ lọc giá sản phẩm
fix(cart): sửa lỗi số lượng âm
style(home): cải thiện responsive hero section
docs(api): cập nhật API reference
refactor(auth): chuyển sang @supabase/ssr
test(checkout): thêm unit test checkout flow
chore(ci): cập nhật Node.js version trong CI
```

## Code Standards

- **TypeScript** — strict mode, no `any`
- **ESLint** — chạy `npm run lint` trước khi commit
- **Prettier** — chạy `npm run format` để format code
- **CSS Modules** — mỗi component có `.module.css` riêng
- **Server vs Client** — ưu tiên Server Components, chỉ dùng `'use client'` khi cần

## Checklist trước khi tạo PR

- [ ] `npm run lint` — không có lỗi
- [ ] `npm run type-check` — không có lỗi
- [ ] `npm run build` — build thành công
- [ ] Test trên mobile viewport (375px)
- [ ] Kiểm tra RLS policies nếu thay đổi DB
