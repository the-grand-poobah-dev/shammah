import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_PATH = path.join(process.cwd(), 'supabase', 'migrations', '20261008_production_readiness.sql');

function getProjectRef() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const match = rawUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (match) return match[1];

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (serviceKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) return payload.ref;
    } catch {}
  }
  return 'wrlubcjcjuoozoxjfabu';
}

async function main() {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
  const projectRef = getProjectRef();
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (accessToken) {
    console.log(`Pushing migration to Supabase project ${projectRef} via Management API...`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`Supabase Management API error (${res.status}):`, body);
      process.exit(1);
    }
    console.log('Migration pushed successfully:', body);
    return;
  }

  console.error(
    `[Supabase Migration] Project detected: https://${projectRef}.supabase.co\n` +
    `Cannot execute raw DDL (ALTER TABLE / CREATE TABLE / CREATE POLICY / GRANT) with SUPABASE_SERVICE_ROLE_KEY alone because PostgREST (/rest/v1) does not expose raw SQL execution.\n` +
    `To push directly from CLI, set SUPABASE_ACCESS_TOKEN (Personal Access Token from https://supabase.com/dashboard/account/tokens) and run: npm run db:push\n` +
    `Or paste supabase/migrations/20261008_production_readiness.sql into the Supabase SQL Editor at:\n` +
    `https://supabase.com/dashboard/project/${projectRef}/sql/new`
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
