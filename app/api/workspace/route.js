import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Base URLs for allowed Google Workspace services
// Note: gmail and people have been removed completely (not used by Shammah).
const SERVICE_BASE_URLS = {
  calendar: 'https://www.googleapis.com/calendar/v3',
  meet: 'https://meet.googleapis.com/v2',
  classroom: 'https://classroom.googleapis.com/v1',
  tasks: 'https://tasks.googleapis.com/tasks/v1',
  chat: 'https://chat.googleapis.com/v1',
  drive: 'https://www.googleapis.com/drive/v3',
  slides: 'https://slides.googleapis.com/v1',
  forms: 'https://forms.googleapis.com/v1',
  keep: 'https://keep.googleapis.com/v1',
};

// Strict action allowlist: only endpoints and HTTP methods Shammah actually uses
const ALLOWED_ACTIONS = [
  // Calendar
  { service: 'calendar', method: 'GET', pattern: /^\/calendars\/[^\/]+\/events(?:\?.*)?$/ },
  { service: 'calendar', method: 'POST', pattern: /^\/calendars\/[^\/]+\/events$/ },
  { service: 'calendar', method: 'DELETE', pattern: /^\/calendars\/[^\/]+\/events\/[^\/]+$/ },

  // Meet
  { service: 'meet', method: 'POST', pattern: /^\/spaces$/ },

  // Classroom
  { service: 'classroom', method: 'GET', pattern: /^\/courses(?:\?.*)?$/ },
  { service: 'classroom', method: 'POST', pattern: /^\/courses$/ },
  { service: 'classroom', method: 'GET', pattern: /^\/courses\/[^\/]+\/announcements(?:\?.*)?$/ },
  { service: 'classroom', method: 'POST', pattern: /^\/courses\/[^\/]+\/announcements$/ },

  // Drive (scoped listing and deletion of church presentations and forms)
  { service: 'drive', method: 'GET', pattern: /^\/files(?:\?.*)?$/ },
  { service: 'drive', method: 'DELETE', pattern: /^\/files\/[^\/]+$/ },

  // Slides
  { service: 'slides', method: 'GET', pattern: /^\/presentations\/[^\/]+(?:\?.*)?$/ },
  { service: 'slides', method: 'POST', pattern: /^\/presentations$/ },
  { service: 'slides', method: 'POST', pattern: /^\/presentations\/[^\/]+:batchUpdate$/ },

  // Forms
  { service: 'forms', method: 'GET', pattern: /^\/forms\/[^\/]+(?:\?.*)?$/ },
  { service: 'forms', method: 'GET', pattern: /^\/forms\/[^\/]+\/responses(?:\?.*)?$/ },
  { service: 'forms', method: 'POST', pattern: /^\/forms$/ },
  { service: 'forms', method: 'POST', pattern: /^\/forms\/[^\/]+:batchUpdate$/ },

  // Tasks
  { service: 'tasks', method: 'GET', pattern: /^\/users\/@me\/lists(?:\?.*)?$/ },
  { service: 'tasks', method: 'GET', pattern: /^\/lists\/[^\/]+\/tasks(?:\?.*)?$/ },
  { service: 'tasks', method: 'POST', pattern: /^\/lists\/[^\/]+\/tasks$/ },
  { service: 'tasks', method: 'PATCH', pattern: /^\/lists\/[^\/]+\/tasks\/[^\/]+$/ },
  { service: 'tasks', method: 'DELETE', pattern: /^\/lists\/[^\/]+\/tasks\/[^\/]+$/ },

  // Chat
  { service: 'chat', method: 'GET', pattern: /^\/spaces(?:\?.*)?$/ },
  { service: 'chat', method: 'GET', pattern: /^\/(?:spaces\/)?[^\/]+\/messages(?:\?.*)?$/ },
  { service: 'chat', method: 'POST', pattern: /^\/(?:spaces\/)?[^\/]+\/messages$/ },

  // Keep
  { service: 'keep', method: 'GET', pattern: /^\/notes(?:\?.*)?$/ },
  { service: 'keep', method: 'POST', pattern: /^\/notes$/ },
  { service: 'keep', method: 'DELETE', pattern: /^\/(?:notes\/)?[^\/]+$/ },
];

function isActionAllowed(service, method, endpoint) {
  const upper = String(method || '').toUpperCase();
  const cleanPath = String(endpoint || '').trim();
  return ALLOWED_ACTIONS.some(
    (action) => action.service === service && action.method === upper && action.pattern.test(cleanPath)
  );
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request) {
  try {
    // 1. Validate Google OAuth token from Authorization header
    const googleAuthHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (!googleAuthHeader || !googleAuthHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Google Workspace Authorization Bearer token.' },
        { status: 401 }
      );
    }

    const payload = await request.json().catch(() => ({}));
    const { service, endpoint, method = 'GET', body = null, church_id = null } = payload || {};

    // 2. Validate requested service
    const baseUrl = SERVICE_BASE_URLS[service];
    if (!baseUrl) {
      return NextResponse.json(
        { error: `Unsupported or disabled Google Workspace service: ${service}` },
        { status: 400 }
      );
    }

    if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('/')) {
      return NextResponse.json(
        { error: 'Endpoint must be a valid relative path starting with /.' },
        { status: 400 }
      );
    }

    const upperMethod = String(method).toUpperCase();

    // 3. Enforce strict allowlist of actions
    if (!isActionAllowed(service, upperMethod, endpoint)) {
      return NextResponse.json(
        {
          error: `Action ${upperMethod} ${service}:${endpoint.split('?')[0]} is not permitted on this server proxy.`,
        },
        { status: 403 }
      );
    }

    // 4. Verify Supabase session (must be signed into Shammah)
    const supabaseToken =
      request.headers.get('x-supabase-auth') ||
      request.headers.get('x-shammah-token') ||
      payload?.supabaseToken;

    if (!supabaseToken) {
      return NextResponse.json(
        { error: 'Missing Shammah user session. Please sign in to Shammah to access church workspace features.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    const {
      data: { user: shammahUser },
      error: userErr,
    } = await supabase.auth.getUser(supabaseToken);

    if (userErr || !shammahUser) {
      return NextResponse.json(
        { error: 'Shammah user session expired or invalid. Please sign in again.' },
        { status: 401 }
      );
    }

    // 5. For creation and mutation actions (POST, PATCH, PUT, DELETE), enforce church admin & plan gating
    const isMutatingAction = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(upperMethod);
    const targetChurchId = church_id || request.headers.get('x-church-id');

    if (isMutatingAction) {
      if (!targetChurchId) {
        return NextResponse.json(
          { error: 'Target church_id is required to create or modify church workspace items.' },
          { status: 400 }
        );
      }

      // Check if caller is church admin or platform admin
      const { data: church, error: churchErr } = await supabase
        .from('churches')
        .select('id, name, created_by, subscription_status, subscription_plan')
        .eq('id', targetChurchId)
        .maybeSingle();

      if (churchErr || !church) {
        return NextResponse.json({ error: 'Target church not found.' }, { status: 404 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', shammahUser.id)
        .maybeSingle();

      const isPlatformAdmin = profile?.role === 'platform_admin';
      const isChurchCreator = church.created_by === shammahUser.id;

      if (!isChurchCreator && !isPlatformAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators of this church may create or manage Google Workspace items.' },
          { status: 403 }
        );
      }

      // Check if church has active workspace plan via DB function or active subscription
      let hasPlan = false;
      try {
        const { data: planCheck } = await supabase.rpc('church_has_workspace_plan', {
          p_church_id: String(targetChurchId),
        });
        hasPlan = Boolean(planCheck);
      } catch {
        // Fallback check against subscriptions table and church status
        const { data: activeSub } = await supabase
          .from('subscriptions')
          .select('id, status, period_ends_at')
          .eq('church_id', targetChurchId)
          .in('status', ['confirmed', 'active'])
          .maybeSingle();

        hasPlan = Boolean(
          activeSub ||
            (church.subscription_status === 'active' &&
              (church.subscription_plan === 'workspace_premium' || church.subscription_plan === 'advanced'))
        );
      }

      if (!hasPlan) {
        return NextResponse.json(
          {
            error:
              'Forbidden: This church requires an active Workspace Premium plan (KES 7,000/month) to create or manage Google Workspace items.',
            requires_upgrade: true,
            plan_key: 'workspace_premium',
            plan_price_kes: 7000,
          },
          { status: 403 }
        );
      }
    }

    // 6. Forward request to upstream Google Workspace API
    const targetUrl = `${baseUrl}${endpoint}`;
    const fetchOptions = {
      method: upperMethod,
      headers: {
        Authorization: googleAuthHeader, // Never logged or reflected in responses
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

    // Never return Google token or credentials
    return NextResponse.json(parsed, { status: upstreamRes.status });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Internal Workspace proxy error' },
      { status: 500 }
    );
  }
}
