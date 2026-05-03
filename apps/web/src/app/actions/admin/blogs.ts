'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { audit } from '@/lib/security/auditLog';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

export async function createBlogPost(_prev: unknown, formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const excerpt = (formData.get('excerpt') as string)?.trim();
  const category = (formData.get('category') as string)?.trim();
  const lead = (formData.get('lead') as string)?.trim();
  const readTime = parseInt(formData.get('read_time_minutes') as string) || 5;
  const isPublished = formData.get('is_published') === 'true';

  // Parse sections from form
  const sections: { heading: string; content: string }[] = [];
  let i = 0;
  while (formData.has(`section_heading_${i}`)) {
    const heading = (formData.get(`section_heading_${i}`) as string)?.trim() || '';
    const content = (formData.get(`section_content_${i}`) as string)?.trim() || '';
    if (content) {
      sections.push({ heading, content });
    }
    i++;
  }

  if (!title || !excerpt) {
    return { error: 'Vui lòng nhập tiêu đề và mô tả ngắn.' };
  }

  if (sections.length === 0) {
    return { error: 'Bài viết cần ít nhất 1 phần nội dung.' };
  }

  const slug = slugify(title) || `post-${Date.now()}`;
  const supabase = await createClient();

  const { error } = await supabase.from('blog_posts').insert({
    slug,
    title,
    excerpt,
    category: category || 'Tổng hợp',
    read_time_minutes: readTime,
    lead: lead || excerpt,
    sections: JSON.stringify(sections),
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : new Date().toISOString(),
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Slug (đường dẫn) đã tồn tại. Vui lòng đổi tiêu đề.' };
    }
    return { error: 'Lỗi tạo bài viết: ' + error.message };
  }

  // Audit log
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0] ?? null;
  const userAgent = h.get('user-agent');
  await audit(
    { action: 'blog.create', severity: 'info', entity: 'blog_post', summary: title },
    { ip, userAgent }
  );

  revalidatePath('/admin/blogs');
  revalidatePath('/blog');
  redirect('/admin/blogs');
}

export async function updateBlogPost(_prev: unknown, formData: FormData) {
  const id = formData.get('id') as string;
  const title = (formData.get('title') as string)?.trim();
  const excerpt = (formData.get('excerpt') as string)?.trim();
  const category = (formData.get('category') as string)?.trim();
  const lead = (formData.get('lead') as string)?.trim();
  const readTime = parseInt(formData.get('read_time_minutes') as string) || 5;
  const isPublished = formData.get('is_published') === 'true';

  const sections: { heading: string; content: string }[] = [];
  let i = 0;
  while (formData.has(`section_heading_${i}`)) {
    const heading = (formData.get(`section_heading_${i}`) as string)?.trim() || '';
    const content = (formData.get(`section_content_${i}`) as string)?.trim() || '';
    if (content) {
      sections.push({ heading, content });
    }
    i++;
  }

  if (!title || !excerpt || !id) {
    return { error: 'Thiếu thông tin bắt buộc.' };
  }

  const supabase = await createClient();

  const { error } = await (supabase.from('blog_posts') as any)
    .update({
      title,
      excerpt,
      category: category || 'Tổng hợp',
      read_time_minutes: readTime,
      lead: lead || excerpt,
      sections: JSON.stringify(sections),
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : undefined,
    })
    .eq('id', id);

  if (error) {
    return { error: 'Lỗi cập nhật bài viết: ' + error.message };
  }

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0] ?? null;
  const userAgent = h.get('user-agent');
  await audit(
    { action: 'blog.update', severity: 'info', entity: 'blog_post', entity_id: id, summary: title },
    { ip, userAgent }
  );

  revalidatePath('/admin/blogs');
  revalidatePath('/blog');
  redirect('/admin/blogs');
}

export async function toggleBlogPublish(formData: FormData) {
  const id = formData.get('id') as string;
  const publish = formData.get('publish') === 'true';

  const supabase = await createClient();
  await (supabase.from('blog_posts') as any)
    .update({
      is_published: publish,
      ...(publish ? { published_at: new Date().toISOString() } : {}),
    })
    .eq('id', id);

  revalidatePath('/admin/blogs');
  revalidatePath('/blog');
}

export async function deleteBlogPost(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = await createClient();
  await supabase.from('blog_posts').delete().eq('id', id);

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0] ?? null;
  const userAgent = h.get('user-agent');
  await audit(
    { action: 'blog.delete', severity: 'warning', entity: 'blog_post', entity_id: id },
    { ip, userAgent }
  );

  revalidatePath('/admin/blogs');
  revalidatePath('/blog');
}
