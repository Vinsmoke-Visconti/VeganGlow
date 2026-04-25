// ============================================
// @veganglow/database — Type Helpers
// Shorthand cho các Database table types
// ============================================

import type { Database } from './database';

// Ví dụ: Tables<'products'> thay cho Database['public']['Tables']['products']['Row']
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
