import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const OPTIONAL_ENV_VARS = [
  'GEMINI_API_KEY',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_PASSKEY',
  'MPESA_SHORTCODE',
  'CRON_SECRET',
  'FIREBASE_SERVER_KEY',
];

export async function GET(request) {
  // Check required and optional environment variable configurations (NAMES ONLY)
  const configured = [];
  const missing = [];

  for (const name of REQUIRED_ENV_VARS) {
    const val = process.env[name];
    if (val && !val.includes('placeholder') && !val.includes('your-project-url')) {
      configured.push(name);
    } else {
      missing.push({ name, required: true });
    }
  }

  for (const name of OPTIONAL_ENV_VARS) {
    const val = process.env[name];
    if (val && !val.includes('placeholder')) {
      configured.push(name);
    } else {
      missing.push({ name, required: false });
    }
  }

  // Database connectivity check
  let dbStatus = 'disconnected';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
      });
      const { error } = await supabase.from('badges').select('id').limit(1);
      dbStatus = error ? `error: ${error.message}` : 'connected';
    } catch (err) {
      dbStatus = `unreachable: ${err?.message || 'unknown'}`;
    }
  } else {
    dbStatus = 'preview_fallback_mode';
  }

  const isHealthy = missing.filter((m) => m.required).length === 0 && dbStatus === 'connected';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      database: dbStatus,
      env: {
        configuredCount: configured.length,
        configuredNames: configured,
        missingCount: missing.length,
        missingVars: missing,
      },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
