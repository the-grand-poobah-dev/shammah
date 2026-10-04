import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SERVICE_BASE_URLS = {
  calendar: 'https://www.googleapis.com/calendar/v3',
  keep: 'https://keep.googleapis.com/v1',
  meet: 'https://meet.googleapis.com/v2',
  classroom: 'https://classroom.googleapis.com/v1',
  tasks: 'https://tasks.googleapis.com/tasks/v1',
  chat: 'https://chat.googleapis.com/v1',
  slides: 'https://slides.googleapis.com/v1',
  forms: 'https://forms.googleapis.com/v1',
  drive: 'https://www.googleapis.com/drive/v3',
  sheets: 'https://sheets.googleapis.com/v4',
};

export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization Bearer token.' }, { status: 401 });
    }

    const { service, endpoint = '', method = 'GET', body = null } = await req.json();
    const baseUrl = SERVICE_BASE_URLS[service];
    if (!baseUrl) {
      return NextResponse.json({ error: `Unsupported Workspace service: ${service}` }, { status: 400 });
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const fetchOptions = {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    if (response.status === 204) {
      return NextResponse.json({ ok: true });
    }

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || `Google ${service} API returned status ${response.status}`,
          details: data?.error || data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Workspace API route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Workspace proxy error' },
      { status: 500 }
    );
  }
}
