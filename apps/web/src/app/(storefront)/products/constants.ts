export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất', column: 'created_at', ascending: false },
  { value: 'price-asc', label: 'Giá: Thấp → Cao', column: 'price', ascending: true },
  { value: 'price-desc', label: 'Giá: Cao → Thấp', column: 'price', ascending: false },
  { value: 'rating', label: 'Đánh giá tốt nhất', column: 'rating', ascending: false },
  { value: 'popular', label: 'Bán chạy', column: 'reviews_count', ascending: false },
] as const;

export const PRICE_BRACKETS = [
  { label: 'Dưới 100.000đ', min: 0, max: 100000 },
  { label: '100.000đ - 200.000đ', min: 100000, max: 200000 },
  { label: '200.000đ - 500.000đ', min: 200000, max: 500000 },
  { label: 'Trên 500.000đ', min: 500000, max: Infinity },
] as const;
