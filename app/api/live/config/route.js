import { isLiveConfigured } from '../../../lib/live/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ configured: isLiveConfigured() });
}
