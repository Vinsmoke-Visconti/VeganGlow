import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BlogEditor } from '../../_components/BlogEditor';

type Section = { heading: string; content: string };

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, excerpt, category, lead, read_time_minutes, is_published, sections')
    .eq('id', id)
    .single();

  if (error || !data) notFound();

  const blog = {
    id: data.id as string,
    title: data.title as string,
    excerpt: data.excerpt as string,
    category: data.category as string,
    lead: data.lead as string,
    read_time_minutes: data.read_time_minutes as number,
    is_published: data.is_published as boolean,
    sections: (Array.isArray(data.sections) ? data.sections : []) as Section[],
  };

  return <BlogEditor blog={blog} />;
}
