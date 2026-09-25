import { createClient } from '@supabase/supabase-js';

// These come from Supabase Dashboard > Project Settings > API
// Set them as Environment Variables in Vercel (never commit real keys to GitHub)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
