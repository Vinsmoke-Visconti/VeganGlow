import { createClient } from '@/lib/supabase/server';

export type TeamMember = {
  id: string;
  full_name: string;
  role_label: string;
  bio: string;
  avatar_url: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
};

export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .order('display_order', { ascending: true });
  return (data ?? []) as TeamMember[];
}
