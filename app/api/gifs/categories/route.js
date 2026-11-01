import { NextResponse } from 'next/server';
import { getGifCategories } from '../../../lib/gifProviders';

export async function GET() {
  try {
    const result = await getGifCategories();
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (err) {
    console.error('[API /api/gifs/categories] Error:', err);
    return NextResponse.json(
      {
        configured: Boolean(process.env.GIPHY_API_KEY),
        categories: [
          'Amen',
          'Praise God',
          'Hallelujah',
          'Prayer',
          'Blessings',
          'Worship',
          'Faith',
          'Church',
          'Grace',
          'Love',
        ],
      },
      { status: 200 }
    );
  }
}
