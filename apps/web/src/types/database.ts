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
          phone: string | null;
          address: string | null;
          ward: string | null;
          ward_code: string | null;
          province: string | null;
          province_code: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin';
          phone?: string | null;
          address?: string | null;
          ward?: string | null;
          ward_code?: string | null;
          province?: string | null;
          province_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'customer' | 'admin';
          phone?: string | null;
          address?: string | null;
          ward?: string | null;
          ward_code?: string | null;
          province?: string | null;
          province_code?: string | null;
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
          email: string | null;
          address: string;
          city: string;
          ward: string | null;
          ward_code: string | null;
          province: string | null;
          province_code: string | null;
          note: string | null;
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
          email?: string | null;
          address: string;
          city: string;
          ward?: string | null;
          ward_code?: string | null;
          province?: string | null;
          province_code?: string | null;
          note?: string | null;
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
          email?: string | null;
          address?: string;
          city?: string;
          ward?: string | null;
          ward_code?: string | null;
          province?: string | null;
          province_code?: string | null;
          note?: string | null;
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
      roles: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string;
          is_system?: boolean;
          created_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          module: string;
          action: string;
          display_name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          module: string;
          action: string;
          display_name: string;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          module?: string;
          action?: string;
          display_name?: string;
          description?: string;
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
      };
      staff_profiles: {
        Row: {
          id: string;
          role_id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id: string;
          role_id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          role_id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_permission: {
        Args: { p_module: string; p_action: string };
        Returns: boolean;
      };
      refresh_product_rating: {
        Args: { pid: string };
        Returns: void;
      };
    };
  };
}

// ============================================
// RBAC Type Aliases
// ============================================
export type Role = Database['public']['Tables']['roles']['Row'];
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type RolePermission = Database['public']['Tables']['role_permissions']['Row'];
export type StaffProfile = Database['public']['Tables']['staff_profiles']['Row'];

export type RoleName =
  | 'super_admin'
  | 'product_manager'
  | 'order_manager'
  | 'inventory_manager'
  | 'customer_support'
  | 'finance_accountant'
  | 'marketing_manager'
  | 'content_editor'
  | 'hr_manager'
  | 'auditor'
  | 'customer';

export type PermissionModule =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'inventory'
  | 'finance'
  | 'reports'
  | 'marketing'
  | 'content'
  | 'reviews'
  | 'system'
  | 'hr';

export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'import'
  | 'export'
  | 'view'
  | 'cancel'
  | 'refund'
  | 'adjust'
  | 'invoices'
  | 'moderate'
  | 'reply'
  | 'publish'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_settings'
  | 'view_logs'
  | 'backup'
  | 'notifications'
  | 'assign_role';

