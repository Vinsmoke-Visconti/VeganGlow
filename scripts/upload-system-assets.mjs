import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env from apps/web/.env.local
dotenv.config({ path: 'apps/web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in apps/web/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ASSETS_DIR = 'apps/web/public/images';
const LOGO_FILE = 'apps/web/public/logo.jpg';
const BUCKET_NAME = 'system-assets';

async function ensureBucket() {
  console.log(`Ensuring bucket ${BUCKET_NAME} exists...`);
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true
  });
  if (error && error.message !== 'Bucket already exists') {
    console.error('Error creating bucket:', error.message);
    return false;
  }
  return true;
}

const mapping = {
  'hero.jpg': 'hero_bg',
  'about-long-bg.png': 'about_bg',
  'auth-bg.png': 'auth_bg',
  'cart-bg.png': 'cart_bg',
  'contact-bg.png': 'contact_bg',
  'profile-bg.png': 'profile_bg',
  'products-bg.png': 'products_bg',
  'support-bg.png': 'support_bg',
  'wishlist-bg.png': 'wishlist_bg',
  'blog-detail-bg.png': 'blog_bg',
  'cta-liquid-bg.png': 'cta_bg',
  'logo.jpg': 'logo_url'
};

async function uploadFile(filePath, key) {
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  
  console.log(`Uploading ${fileName}...`);
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, fileBuffer, {
      upsert: true,
      contentType: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg'
    });

  if (error) {
    console.error(`Error uploading ${fileName}:`, error.message);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return { key, publicUrl };
}

async function run() {
  await ensureBucket();
  const results = {};

  // Upload logo first (it's in a different location)
  if (fs.existsSync(LOGO_FILE)) {
    const res = await uploadFile(LOGO_FILE, 'logo_url');
    if (res) results[res.key] = res.publicUrl;
  }

  // Upload other assets
  for (const [file, key] of Object.entries(mapping)) {
    if (key === 'logo_url') continue; // Handled above
    
    const filePath = path.join(ASSETS_DIR, file);
    if (fs.existsSync(filePath)) {
      const res = await uploadFile(filePath, key);
      if (res) results[res.key] = res.publicUrl;
    } else {
      console.warn(`File not found: ${filePath}`);
    }
  }

  if (Object.keys(results).length === 0) {
    console.log('No assets uploaded.');
    return;
  }

  console.log('Updating system_settings...');
  
  // Get current settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'site_assets')
    .single();

  const newValue = { ...(settings?.value || {}), ...results };

  const { error: updateError } = await supabase
    .from('system_settings')
    .upsert({
      key: 'site_assets',
      value: newValue,
      updated_at: new Date().toISOString()
    });

  if (updateError) {
    console.error('Error updating system_settings:', updateError.message);
  } else {
    console.log('Successfully updated site_assets in system_settings!');
    console.log('New mapping:', JSON.stringify(newValue, null, 2));
  }
}

run();
