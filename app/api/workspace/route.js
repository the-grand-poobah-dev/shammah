import { NextResponse } from 'next/server';

const SERVICE_BASE_URLS = {
  calendar: 'https://www.googleapis.com/calendar/v3',
  keep: 'https://keep.googleapis.com/v1',
  meet: 'https://meet.googleapis.com/v2',
  classroom: 'https://classroom.googleapis.com/v1',
  tasks: 'https://tasks.googleapis.com/tasks/v1',
  chat: 'https://chat.googleapis.com/v1',
  drive: 'https://www.googleapis.com/drive/v3',
  slides: 'https://slides.googleapis.com/v1',
  sheets: 'https://sheets.googleapis.com/v4',
  forms: 'https://forms.googleapis.com/v1',
  docs: 'https://docs.googleapis.com/v1',
  gmail: 'https://gmail.googleapis.com/gmail/v1',
  people: 'https://people.googleapis.com/v1',
};

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization Bearer token.' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const { service, endpoint, method = 'GET', body = null } = payload || {};

    const baseUrl = SERVICE_BASE_URLS[service];
    if (!baseUrl) {
      return NextResponse.json(
        { error: `Unsupported Google Workspace service: ${service}` },
        { status: 400 }
      );
    }

    if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('/')) {
      return NextResponse.json(
        { error: 'Endpoint must be a valid relative path starting with /.' },
        { status: 400 }
      );
    }

    const targetUrl = `${baseUrl}${endpoint}`;
    const upperMethod = String(method).toUpperCase();

    const fetchOptions = {
      method: upperMethod,
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    };

    if (body !== null && body !== undefined && upperMethod !== 'GET' && upperMethod !== 'HEAD') {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(body);
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);

    if (upstreamRes.status === 204) {
      return NextResponse.json({ ok: true });
    }

    const rawText = await upstreamRes.text();
    let parsed = {};
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = { raw: rawText };
      }
    }

    if (!upstreamRes.ok) {
      const errMsg =
        parsed?.error?.message ||
        parsed?.error_description ||
        parsed?.error ||
        `Google ${service} API returned status ${upstreamRes.status}`;
      return NextResponse.json(
        { error: errMsg, details: parsed?.error || null },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json(parsed, { status: upstreamRes.status });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Internal Workspace proxy error' },
      { status: 500 }
    );
  }
}
