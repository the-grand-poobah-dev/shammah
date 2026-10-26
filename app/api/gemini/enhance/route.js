import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// In-memory sliding window rate limiter: max 10 requests per minute per caller
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitMap = new Map();

function isRateLimited(identifier) {
  const now = Date.now();
  const history = rateLimitMap.get(identifier) || [];
  const validHistory = history.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (validHistory.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(identifier, validHistory);
    return true;
  }

  validHistory.push(now);
  rateLimitMap.set(identifier, validHistory);

  // Periodically clean up old entries
  if (rateLimitMap.size > 1000) {
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const active = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, active);
    }
  }

  return false;
}

export async function POST(request) {
  try {
    // 1. Caller Authentication: Bearer token is required
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to polish posts.' },
        { status: 401 }
      );
    }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json(
        { error: 'Invalid authentication token.' },
        { status: 401 }
      );
    }

    // Verify token with Supabase if configured
    let callerId = 'authenticated-member';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (
      supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes('placeholder') &&
      !token.startsWith('mock-')
    ) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
          return NextResponse.json(
            { error: 'Session expired or invalid. Please sign in again.' },
            { status: 401 }
          );
        }
        callerId = user.id;
      } catch {
        // Fall back gracefully if offline / test environment
        callerId = token.slice(0, 16);
      }
    } else {
      // Local preview / test session token
      callerId = token.slice(0, 16);
    }

    // 2. Rate limiting check
    if (isRateLimited(callerId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute before requesting another AI Polish.' },
        { status: 429 }
      );
    }

    // 3. Request Payload & Input Length Validation
    const body = await request.json();
    const { action, text } = body || {};
    if (!text || !String(text).trim()) {
      return NextResponse.json(
        { error: 'Text is required for AI Polish.' },
        { status: 400 }
      );
    }

    const trimmedText = String(text).trim();
    if (trimmedText.length > 2500) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 2,500 characters.' },
        { status: 400 }
      );
    }

    // 4. Check for GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI Polish service is temporarily unavailable (GEMINI_API_KEY is not configured).' },
        { status: 503 }
      );
    }

    // 5. Initialize @google/genai SDK using gemini-3.8-flash
    const ai = new GoogleGenAI({ apiKey });

    // Strict prompt: only fix grammar, spelling, punctuation, and flow.
    // Never change theological meaning, scripture references/quotes, names, places, or dates.
    const prompt =
      action === 'generate_poll'
        ? `You are an editorial assistant for the Shammah faith-community social app.
Rewrite the following poll question to be grammatically correct, warm, and engaging (concise, under 220 characters).
DO NOT change the core question, doctrine, or intent.
Return ONLY the polished poll question without quotes, commentary, or greetings.

Poll question:
${trimmedText}`
        : `You are an editorial proofreader for the Shammah faith-community app.
Your task is to polish this fellowship post, testimony, prayer request, or devotion for clarity, correct grammar, spelling, punctuation, and smooth sentence flow.

STRICT CONSTRAINTS:
1. ONLY fix grammar, spelling, punctuation, capitalization, and awkward phrasing.
2. DO NOT change the author's theological meaning, doctrine, feelings, or intent.
3. NEVER alter or remove scripture quotes, chapter/verse citations (e.g. John 3:16, Psalm 23, Romans 8:28), or biblical references.
4. NEVER change personal names, church names, places, or dates.
5. DO NOT add preambles, introductory phrases, explanations, quotation marks around the entire response, or sign-offs.
6. Return ONLY the polished text itself, preserving the author's authentic voice.

Text to polish:
${trimmedText}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const polishedText = response.text?.trim() || trimmedText;

    return NextResponse.json({
      enhancedText: polishedText,
    });
  } catch (err) {
    console.error('AI Enhance error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to polish text. Please try again later.' },
      { status: 500 }
    );
  }
}
