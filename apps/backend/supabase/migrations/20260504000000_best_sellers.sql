-- Function to get best selling products based on real order data
CREATE OR REPLACE FUNCTION public.get_best_selling_products(p_days_ago integer DEFAULT 30, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  price numeric,
  image text,
  rating numeric,
  reviews_count integer,
  sales_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.price,
    p.image,
    p.rating,
    p.reviews_count,
    COALESCE(SUM(oi.quantity), 0) as sales_count
  FROM public.products p
  JOIN public.order_items oi ON p.id = oi.product_id
  JOIN public.orders o ON oi.order_id = o.id
  WHERE p.is_active = true
    AND (o.status = 'completed' OR o.status = 'confirmed' OR o.status = 'shipping' OR o.status = 'pending')
    AND (o.created_at >= now() - (p_days_ago || ' days')::interval)
  GROUP BY p.id
  HAVING SUM(oi.quantity) > 0
  ORDER BY sales_count DESC, p.rating DESC
  LIMIT p_limit;
END;
$$;
