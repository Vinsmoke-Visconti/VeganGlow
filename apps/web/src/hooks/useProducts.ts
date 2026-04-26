'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Product, ProductFilters, ProductWithCategory } from '@/types/product';
import type { Category } from '@/types/product';
import { PRODUCTS_PER_PAGE } from '@/lib/constants';

export function useProducts(filters?: ProductFilters) {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const supabase = createBrowserClient();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('products')
        .select('*, categories(*)', { count: 'exact' })
        .eq('is_active', true);

      // Apply filters
      if (filters?.category) {
        query = query.eq('categories.slug', filters.category);
      }
      if (filters?.minPrice) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters?.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Sorting
      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || PRODUCTS_PER_PAGE;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;

      setProducts((data as ProductWithCategory[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [filters?.category, filters?.minPrice, filters?.maxPrice, filters?.search, filters?.sortBy, filters?.sortOrder, filters?.page, filters?.limit]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  return {
    products,
    categories,
    loading,
    error,
    totalCount,
    totalPages: Math.ceil(totalCount / (filters?.limit || PRODUCTS_PER_PAGE)),
    refetch: fetchProducts,
  };
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('slug', slug)
        .single();
      setProduct(data as ProductWithCategory | null);
      setLoading(false);
    };

    if (slug) fetchProduct();
  }, [slug]);

  return { product, loading };
}
