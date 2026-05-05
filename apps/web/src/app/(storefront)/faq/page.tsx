import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import FaqClient from './FaqClient';

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
};

export default async function FaqPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('faqs')
    .select('id,question,answer,category,display_order')
    .eq('is_visible', true)
    .order('category')
    .order('display_order');

  const rows: FaqRow[] = error || !data ? [] : (data as unknown as FaqRow[]);

  return (
    <Suspense fallback={null}>
      <FaqClient faqs={rows} />
    </Suspense>
  );
}
