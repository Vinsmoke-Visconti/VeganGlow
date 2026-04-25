# VeganGlow — API Reference

## Supabase REST API

Base URL: `{SUPABASE_URL}/rest/v1/`

All requests require headers:
```
apikey: {SUPABASE_ANON_KEY}
Authorization: Bearer {JWT_TOKEN}  (for authenticated requests)
```

---

## Products

### List Products
```
GET /products?select=*,categories(*)&is_active=eq.true&order=created_at.desc&limit=12
```

### Get Product by Slug
```
GET /products?select=*,categories(*)&slug=eq.{slug}&limit=1
```

### Search Products
```
GET /products?select=*&name=ilike.*{query}*&is_active=eq.true
```

---

## Categories

### List Categories
```
GET /categories?select=*&order=name
```

---

## Auth

### Sign Up
```javascript
supabase.auth.signUp({ email, password, options: { data: { full_name } } })
```

### Sign In
```javascript
supabase.auth.signInWithPassword({ email, password })
```

### Sign Out
```javascript
supabase.auth.signOut()
```

---

## Orders

### Create Order (via Edge Function)
```
POST {SUPABASE_URL}/functions/v1/checkout

Body:
{
  "items": [{ "product_id": "uuid", "quantity": 1 }],
  "customer_name": "Nguyễn Văn A",
  "phone": "0901234567",
  "address": "123 Đường ABC",
  "city": "Hồ Chí Minh",
  "payment_method": "cod"
}

Response:
{ "success": true, "order_code": "VG-xxx", "order_id": "uuid" }
```

### List User Orders
```
GET /orders?select=*,order_items(*)&order=created_at.desc
```

---

## Reviews

### Add Review
```
POST /reviews
Body: { "product_id": "uuid", "rating": 5, "comment": "Tuyệt vời!" }
```

### Get Product Reviews
```
GET /reviews?select=*,profiles(full_name,avatar_url)&product_id=eq.{id}&order=created_at.desc
```

---

## Favorites

### Toggle Favorite
```javascript
// Add
supabase.from('favorites').insert({ product_id, user_id })

// Remove
supabase.from('favorites').delete().match({ product_id, user_id })
```
