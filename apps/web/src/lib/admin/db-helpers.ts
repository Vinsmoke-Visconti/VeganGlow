import type { Database } from '@/types/database';

export type Tables = Database['public']['Tables'];
export type TableRow<K extends keyof Tables> = Tables[K]['Row'];
export type TableInsert<K extends keyof Tables> = Tables[K]['Insert'];
export type TableUpdate<K extends keyof Tables> = Tables[K]['Update'];
