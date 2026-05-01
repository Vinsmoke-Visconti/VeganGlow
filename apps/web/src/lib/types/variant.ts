export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  attributes: Record<string, string | number | boolean | null>;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string | null;
  position: number;
  is_active: boolean;
};
