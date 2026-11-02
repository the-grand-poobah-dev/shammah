import { NextResponse } from 'next/server';
import { createSign } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function firebaseCredentials() {
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    }
  }
  const projectId = serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = serviceAccount?.client_email || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = String(serviceAccount?.private_key || process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey.includes('BEGIN PRIVATE KEY')) return null;
  return { projectId, clientEmail, privateKey };
}

async function getGoogleAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: credentials.clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + '.' + claims;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + '.' + signer.sign(credentials.privateKey, 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Firebase authentication failed.');
  }
  return data.access_token;
}

async function verifiedUser(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\\s+/i, '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data?.user || null;
}

export async function POST(request) {
  const user = await verifiedUser(request);
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: 'Sign in before sending a push reminder.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid notification payload.' }, { status: 400 });
  }

  const token = String(body?.token || '').trim();
  const title = String(body?.title || 'Shammah Notification').trim().slice(0, 120);
  const messageBody = String(body?.body || '').trim().slice(0, 500);
  const link = String(body?.link || '/').trim();
  if (!token || token.length > 4096 || !messageBody) {
    return NextResponse.json({ ok: false, error: 'A device token and notification body are required.' }, { status: 400 });
  }
  if (!link.startsWith('/') || link.startsWith('//')) {
    return NextResponse.json({ ok: false, error: 'Notification link must be a local path.' }, { status: 400 });
  }

  let credentials;
  try {
    credentials = firebaseCredentials();
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503 });
  }
  if (!credentials) {
    return NextResponse.json({ ok: false, error: 'FCM is not configured; the in-app reminder is still available.' }, { status: 503 });
  }

  try {
    const accessToken = await getGoogleAccessToken(credentials);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\\/$/, '')
      : process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : null;
    const notification = {
      title,
      body: messageBody,
      icon: '/favicon.ico',
      tag: 'faith-challenge-streak-risk',
    };
    const message = {
      token,
      notification: { title, body: messageBody },
      webpush: {
        notification,
        ...(baseUrl ? { fcmOptions: { link: baseUrl + link } } : {}),
      },
      data: {
        kind: 'faith_challenge_streak_risk',
        link,
        userId: user.id,
      },
    };
    const response = await fetch(
      'https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(credentials.projectId) + '/messages:send',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        cache: 'no-store',
      }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: result?.error?.message || 'Firebase did not accept the push notification.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    console.error('FCM push failed:', error?.message || error);
    return NextResponse.json({ ok: false, error: 'Push notification could not be sent.' }, { status: 502 });
  }
}
