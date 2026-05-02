import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hijzebtakmkyrowdqtrd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpanplYnRha21reXJvd2RxdHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1OTE1MzEsImV4cCI6MjA5MjE2NzUzMX0.DlYgiiwb-p3IYGT5Y3U4Xjl-v1ap4aqjAEHqzQYN39I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('product_variants').select('id').limit(1);
  if (error) {
    console.error('Error fetching product_variants:', error);
  } else {
    console.log('Success! Table exists. Data:', data);
  }
}

check();
