export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      flash_sales: {
        Row: {
          id: string
          product_id: string
          discount_percent: number
          starts_at: string
          ends_at: string
          status: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          discount_percent: number
          starts_at: string
          ends_at: string
          status?: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          discount_percent?: number
          starts_at?: string
          ends_at?: string
          status?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          id: string
          full_name: string
          role_label: string
          bio: string
          avatar_url: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          display_order: number
          is_visible: boolean
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          role_label: string
          bio?: string
          avatar_url?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          display_order?: number
          is_visible?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role_label?: string
          bio?: string
          avatar_url?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          display_order?: number
          is_visible?: boolean
          created_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      addresses: {
        Row: {
          address: string
          city: string
          created_at: string
          district: string | null
          full_name: string
          id: string
          is_default: boolean
          phone: string
          province: string | null
          user_id: string
          ward: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          district?: string | null
          full_name: string
          id?: string
          is_default?: boolean
          phone: string
          province?: string | null
          user_id: string
          ward?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          is_default?: boolean
          phone?: string
          province?: string | null
          user_id?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          summary?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          cover_gradient: string | null
          created_at: string | null
          display_order: number | null
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_url: string | null
          placement: string | null
          position: number | null
          starts_at: string | null
          status: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          cover_gradient?: string | null
          created_at?: string | null
          display_order?: number | null
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_url?: string | null
          placement?: string | null
          position?: number | null
          starts_at?: string | null
          status?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          cover_gradient?: string | null
          created_at?: string | null
          display_order?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_url?: string | null
          placement?: string | null
          position?: number | null
          starts_at?: string | null
          status?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          change_amount: number
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          reason: string
        }
        Insert: {
          change_amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          reason: string
        }
        Update: {
          change_amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_image: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          city: string
          code: string
          created_at: string
          customer_name: string
          discount_amount: number | null
          id: string
          notes: string | null
          payment_method: string
          payment_due_at: string | null
          payment_reference: string | null
          payment_status: string
          paid_at: string | null
          phone: string
          shipping_fee: number | null
          status: string
          total_amount: number
          tracking_number: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          city: string
          code: string
          created_at?: string
          customer_name: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          payment_method: string
          payment_due_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          paid_at?: string | null
          phone: string
          shipping_fee?: number | null
          status?: string
          total_amount: number
          tracking_number?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          city?: string
          code?: string
          created_at?: string
          customer_name?: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_due_at?: string | null
          payment_reference?: string | null
          payment_status?: string
          paid_at?: string | null
          phone?: string
          shipping_fee?: number | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string
          display_name: string
          id: string
          module: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string
          display_name: string
          id?: string
          module: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          display_name?: string
          id?: string
          module?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          image: string
          ingredients: string
          is_active: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number
          rating: number
          reviews_count: number
          slug: string
          stock: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image?: string
          ingredients?: string
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price: number
          rating?: number
          reviews_count?: number
          slug: string
          stock?: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image?: string
          ingredients?: string
          is_active?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          rating?: number
          reviews_count?: number
          slug?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birthday: string | null
          cccd_full_name: string | null
          cccd_number: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          province: string | null
          province_code: string | null
          role: string
          role_id: string | null
          username: string | null
          ward: string | null
          ward_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          cccd_full_name?: string | null
          cccd_number?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          province?: string | null
          province_code?: string | null
          role?: string
          role_id?: string | null
          username?: string | null
          ward?: string | null
          ward_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          cccd_full_name?: string | null
          cccd_number?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          province?: string | null
          province_code?: string | null
          role?: string
          role_id?: string | null
          username?: string | null
          ward?: string | null
          ward_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string
          display_name: string
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_name: string
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          display_name?: string
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          invited_by: string | null
          role_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          invited_by?: string | null
          role_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          role_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          position: string | null
          role_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          position?: string | null
          role_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          position?: string | null
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_banks: {
        Row: {
          account_holder: string
          account_number: string
          bank_name: string
          card_type: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          type: string | null
          user_id: string
        }
        Insert: {
          account_holder: string
          account_number: string
          bank_name: string
          card_type?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          type?: string | null
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_name?: string
          card_type?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_banks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          chat_notifications: boolean | null
          newsletters: boolean | null
          order_updates: boolean | null
          promo_emails: boolean | null
          updated_at: string | null
          user_id: string
          wallet_updates: boolean | null
        }
        Insert: {
          chat_notifications?: boolean | null
          newsletters?: boolean | null
          order_updates?: boolean | null
          promo_emails?: boolean | null
          updated_at?: string | null
          user_id: string
          wallet_updates?: boolean | null
        }
        Update: {
          chat_notifications?: boolean | null
          newsletters?: boolean | null
          order_updates?: boolean | null
          promo_emails?: boolean | null
          updated_at?: string | null
          user_id?: string
          wallet_updates?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vouchers: {
        Row: {
          created_at: string | null
          id: string
          is_used: boolean | null
          used_at: string | null
          user_id: string
          voucher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          user_id: string
          voucher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order: number | null
          min_order_amount: number | null
          quota: number | null
          start_date: string | null
          status: string | null
          title: string
          usage_count: number | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order?: number | null
          min_order_amount?: number | null
          quota?: number | null
          start_date?: string | null
          status?: string | null
          title: string
          usage_count?: number | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order?: number | null
          min_order_amount?: number | null
          quota?: number | null
          start_date?: string | null
          status?: string | null
          title?: string
          usage_count?: number | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: boolean
      }
      has_permission: {
        Args: { p_action: string; p_module: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_v2: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_admin_action:
        | {
            Args: {
              p_action: string
              p_entity: string
              p_entity_id?: string
              p_metadata?: Json
              p_summary: string
            }
            Returns: number
          }
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_resource_id?: string
              p_resource_type: string
            }
            Returns: undefined
          }
      refresh_product_rating: { Args: { pid: string }; Returns: undefined }
      sweep_pending_invitations: { Args: never; Returns: undefined }
      user_order_stats: {
        Args: { p_user_id: string }
        Returns: {
          last_order_at: string
          order_count: number
          total_spent: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
