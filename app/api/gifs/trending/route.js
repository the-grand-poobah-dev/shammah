import { trendingGifs } from '../../../lib/gifProviders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const limit = Math.min(24, Math.max(1, Number.parseInt(params.get('limit') || '24', 10) || 24));
  const offset = Math.min(1000, Math.max(0, Number.parseInt(params.get('offset') || '0', 10) || 0));
  const result = await trendingGifs({ limit, offset });
  if (result.error) return Response.json({ data: [], error: result.error }, { status: result.error.includes('not configured') ? 503 : 502 });
  return Response.json({ data: result.data, error: null });
}
