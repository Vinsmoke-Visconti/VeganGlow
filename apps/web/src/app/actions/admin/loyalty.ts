'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { audit } from '@/lib/security/auditLog';

type Result = { ok: true } | { ok: false; error: string };

async function auditCtx() {
  const h = await headers();
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null,
    userAgent: h.get('user-agent'),
  };
}

type AwardRpc = (
  fn: 'award_loyalty_points',
  args: {
    p_user_id: string;
    p_delta: number;
    p_reason: string;
    p_reference_type?: string | null;
    p_reference_id?: string | null;
  }
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function awardPoints(
  userId: string,
  delta: number,
  reason: string,
  refType?: string,
  refId?: string
): Promise<Result> {
  const supabase = await createClient();
  const award = supabase.rpc.bind(supabase) as unknown as AwardRpc;
  const { error } = await award('award_loyalty_points', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason,
    p_reference_type: refType ?? null,
    p_reference_id: refId ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/customers/${userId}`);

  await audit(
    {
      action: 'customer.note_added',
      severity: 'warn',
      entity: 'customer',
      entity_id: userId,
      details: { loyalty_delta: delta, reason, refType, refId },
    },
    await auditCtx()
  );

  return { ok: true };
}

type RecomputeTierRpc = (
  fn: 'recompute_loyalty_tier',
  args: { p_user_id: string }
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function recomputeTier(userId: string): Promise<Result> {
  const supabase = await createClient();
  const recompute = supabase.rpc.bind(supabase) as unknown as RecomputeTierRpc;
  const { error } = await recompute('recompute_loyalty_tier', { p_user_id: userId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/customers/${userId}`);
  return { ok: true };
}
