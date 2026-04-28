'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(prevState: any, formData: FormData) {
  let identifier = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirectTo') as string || '/';

  const supabase = await createClient();

  // If not an email, try resolving username to email
  if (!identifier.includes('@')) {
    const { data: resolvedEmail } = await (supabase.rpc as any)('get_email_from_username', {
      p_username: identifier,
    });
    if (resolvedEmail) {
      identifier = resolvedEmail;
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function signup(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/login?message=Kiểm tra email của bạn để xác nhận tài khoản.');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function adminLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/admin', 'layout');
  redirect('/admin/login');
}

export async function adminGoogleLogin() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/admin&admin=true`,
    },
  });

  if (error || !data.url) {
    return redirect('/admin/login?error=oauth_failed');
  }

  redirect(data.url);
}

export async function adminLogin(prevState: any, formData: FormData) {
  let identifier = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();

  // If not an email, try resolving username to email
  if (!identifier.includes('@')) {
    const { data: resolvedEmail } = await (supabase.rpc as any)('get_email_from_username', {
      p_username: identifier,
    });
    if (resolvedEmail) {
      identifier = resolvedEmail;
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password,
  });

  if (error) {
    return { error: 'Tài khoản không có quyền truy cập hoặc mật khẩu không chính xác.' };
  }

  const { data: isStaff } = await supabase.rpc('is_staff');

  if (!isStaff) {
    await supabase.auth.signOut();
    return { error: 'Tài khoản không có quyền truy cập hoặc mật khẩu không chính xác.' };
  }

  revalidatePath('/admin', 'layout');
  redirect('/admin');
}

export async function signInWithGitHub() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin =
    headersList.get('origin') ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback?next=/admin&admin=true`,
    },
  });

  if (error || !data.url) {
    return redirect('/admin/login?error=oauth_failed');
  }

  redirect(data.url);
}
