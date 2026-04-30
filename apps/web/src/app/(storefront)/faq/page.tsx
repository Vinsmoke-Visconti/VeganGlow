import { createClient } from '@/lib/supabase/server';
import FaqClient, { type FaqGroup, type FaqItem } from './FaqClient';

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

  // Preserve first-seen category order from the sorted list.
  const groupMap = new Map<string, FaqItem[]>();
  for (const row of rows) {
    const cat = row.category || 'Khác';
    if (!groupMap.has(cat)) groupMap.set(cat, []);
    groupMap.get(cat)!.push({ id: row.id, question: row.question, answer: row.answer });
  }
  const groups: FaqGroup[] = Array.from(groupMap, ([title, items]) => ({ title, items }));

  return <FaqClient groups={groups} />;
}
