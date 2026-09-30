import { createClient } from '@supabase/supabase-js';

// These come from Supabase Dashboard > Project Settings > API
// Set them as Environment Variables in Vercel (never commit real keys to GitHub)
function getValidUrl(url) {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url;
  }
  return 'https://placeholder.supabase.co';
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = getValidUrl(rawUrl);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
