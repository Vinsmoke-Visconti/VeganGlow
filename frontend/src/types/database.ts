// ============================================
// VeganGlow — Database Types (Supabase Generated)
// Run `npm run db:generate-types` to regenerate
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'customer' | 'admin';
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin';
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin';
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          price: number;
          category_id: string | null;
          image: string;
          rating: number;
          reviews_count: number;
          description: string;
          ingredients: string;
          stock: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          price: number;
          category_id?: string | null;
          image?: string;
          rating?: number;
          reviews_count?: number;
          description?: string;
          ingredients?: string;
          stock?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          price?: number;
          category_id?: string | null;
          image?: string;
          rating?: number;
          reviews_count?: number;
          description?: string;
          ingredients?: string;
          stock?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          city: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          address: string;
          city: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          phone?: string;
          address?: string;
          city?: string;
          is_default?: boolean;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          code: string;
          user_id: string | null;
          customer_name: string;
          phone: string;
          address: string;
          city: string;
          payment_method: 'cod' | 'card';
          total_amount: number;
          status: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          user_id?: string | null;
          customer_name: string;
          phone: string;
          address: string;
          city: string;
          payment_method: 'cod' | 'card';
          total_amount: number;
          status?: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          user_id?: string | null;
          customer_name?: string;
          phone?: string;
          address?: string;
          city?: string;
          payment_method?: 'cod' | 'card';
          total_amount?: number;
          status?: 'pending' | 'confirmed' | 'shipping' | 'completed' | 'cancelled';
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          product_image: string;
          unit_price: number;
          quantity: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          product_image?: string;
          unit_price: number;
          quantity: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          product_image?: string;
          unit_price?: number;
          quantity?: number;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          rating: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          rating: number;
          comment?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          rating?: number;
          comment?: string;
          created_at?: string;
        };
      };
      favorites: {
        Row: {
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      refresh_product_rating: {
        Args: { pid: string };
        Returns: void;
      };
    };
  };
}
