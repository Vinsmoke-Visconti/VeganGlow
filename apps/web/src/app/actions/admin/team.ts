'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type Result = { ok: true; id?: string } | { ok: false; error: string };

export type TeamMemberInput = {
  id?: string;
  full_name: string;
  role_label: string;
  bio: string;
  avatar_url: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  display_order: number;
  is_visible: boolean;
};

export async function upsertTeamMember(input: TeamMemberInput): Promise<Result> {
  const supabase = await createClient();
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from('team_members').update(rest as never).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/about-team');
    return { ok: true, id };
  }
  const { id: _ignored, ...rest } = input;
  void _ignored;
  const { data, error } = await supabase
    .from('team_members')
    .insert(rest as never)
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/about-team');
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteTeamMember(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from('team_members').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/about-team');
  return { ok: true };
}

export async function reorderTeamMembers(orderedIds: string[]): Promise<Result> {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('team_members')
      .update({ display_order: i } as never)
      .eq('id', orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/admin/about-team');
  return { ok: true };
}
