import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { checkRateLimit } from '../../../lib/rateLimit';
import { serverLogger } from '../../../lib/serverLogger';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const startedAt = Date.now();
  try {
    // 1. Rate limiting check (15 requests per minute per client IP)
    const rate = await checkRateLimit(request, {
      keyPrefix: 'gemini_chat',
      limit: 15,
      windowSeconds: 60,
    });

    if (!rate.allowed) {
      serverLogger.warn('Rate limit exceeded on Gemini chat route', {
        remaining: rate.remaining,
        resetIn: rate.resetIn,
      });
      return NextResponse.json(
        { error: 'Too many prayer/scripture queries. Please wait a moment before sending another message.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.resetIn || 60) },
        }
      );
    }

    // 2. Parse and validate input bounds
    const body = await request.json().catch(() => ({}));
    const { message, conversationHistory = [] } = body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length > 2000) {
      return NextResponse.json(
        { error: 'Message exceeds maximum length of 2,000 characters. Please shorten your reflection or question.' },
        { status: 400 }
      );
    }

    // Guard conversation history bounds (max 8 turns, max 1000 chars each)
    const boundedHistory = Array.isArray(conversationHistory)
      ? conversationHistory.slice(-8).map((m) => ({
          sender: m.sender === 'user' ? 'Believer' : 'Shammah Guide',
          text: String(m.text || '').slice(0, 1000),
        }))
      : [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      serverLogger.warn('GEMINI_API_KEY not configured on server');
      return NextResponse.json({
        reply: 'Grace and peace to you! Please configure GEMINI_API_KEY on the server to enable live AI scripture study.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const historyContext = boundedHistory
      .map((m) => `${m.sender}: ${m.text}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${historyContext ? `Recent conversation:\n${historyContext}\n\n` : ''}Believer: ${cleanMessage}`,
      config: {
        systemInstruction:
          'You are a warm, scripture-grounded Christian discipleship companion for Kenyan church congregations and youth on Shammah. Provide encouraging, biblically sound, concise responses.',
      },
    });

    serverLogger.info('Gemini scripture chat generated successfully', {
      durationMs: Date.now() - startedAt,
      messageLength: cleanMessage.length,
    });

    return NextResponse.json({
      reply: response.text?.trim() || 'May the peace of Christ dwell in you richly.',
    });
  } catch (err) {
    serverLogger.error('Gemini chat execution failed', {
      error: err?.message,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Scripture study service encountered an error. Please try again.' }, { status: 500 });
  }
}
