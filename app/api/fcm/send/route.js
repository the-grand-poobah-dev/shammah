import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      ok: true,
      dispatchedAt: new Date().toISOString(),
      title: body?.title || 'Shammah Notification',
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 400 });
  }
}
