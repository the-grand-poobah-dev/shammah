import { NextResponse } from 'next/server';
import { getGifCategories } from '../../../lib/gifProviders';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await getGifCategories();
    return NextResponse.json({ categories }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    return NextResponse.json({
      categories: [
        { name: 'Praise & Amen', query: 'amen praise' },
        { name: 'Worship', query: 'worship' },
        { name: 'Celebration', query: 'joy celebration' },
        { name: 'Blessed', query: 'blessed' },
        { name: 'Prayer', query: 'praying' },
      ],
    });
  }
}
