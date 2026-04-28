import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * OAuth callback handler.
 *
 * Customer flow (admin=false / not set):
 *   - Just exchange code, redirect to `next` (default /).
 *   - Auto-provisioning of `profiles` row is handled by the on_auth_user_created
 *     DB trigger (handle_new_user → also runs accept_staff_invitation_for so
 *     invited staff are auto-promoted on first sign-in).
 *
 * Admin flow (admin=true, set by /admin/login OAuth buttons):
 *   - GitHub: validate that the user is a collaborator on the configured repo,
 *     then upsert them into staff_profiles with role=super_admin.
 *   - Google / Email: rely on the DB trigger having promoted them via
 *     staff_invitations whitelist; we just check is_staff() and gate access.
 *   - If is_staff is false at this point, sign out and redirect with an error.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const isAdminFlow = searchParams.get('admin') === 'true' || next.startsWith('/admin');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();
  const { data: { user }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !user) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // ============== CUSTOMER FLOW ==============
  if (!isAdminFlow) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // ============== ADMIN FLOW ==============
  const provider = user.app_metadata.provider;

  if (provider === 'github') {
    const promoted = await promoteGithubCollaboratorIfEligible(supabase, user);
    if (!promoted) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/admin/login?error=not_collaborator`
      );
    }
  }

  // Final gate: regardless of provider, the user MUST be in staff_profiles by
  // now. Google/email users are promoted via DB trigger; GitHub users were
  // promoted just above; super admin was seeded.
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/admin/login?error=not_whitelisted`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function promoteGithubCollaboratorIfEligible(supabase: any, user: any): Promise<boolean> {
  const githubUsername = user.user_metadata?.user_name;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_ADMIN_TOKEN;

  if (!githubUsername || !repo || !token) {
    return false;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/collaborators/${githubUsername}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'VeganGlow-Admin',
        },
      }
    );

    if (res.status !== 204) {
      return false;
    }

    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'super_admin')
      .single();

    if (!role) return false;

    await supabase.from('staff_profiles').upsert({
      id: user.id,
      role_id: role.id,
      full_name: user.user_metadata.full_name || githubUsername,
      email: user.email,
      is_active: true,
    });

    return true;
  } catch (err) {
    console.error('GitHub collaborator check failed:', err);
    return false;
  }
}
