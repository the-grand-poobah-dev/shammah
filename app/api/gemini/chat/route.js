import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request) {
  try {
    const { message, conversationHistory = [] } = await request.json();
    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: 'Grace and peace to you! Please configure GEMINI_API_KEY on the server to enable live AI scripture study.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const historyContext = Array.isArray(conversationHistory)
      ? conversationHistory
          .map((m) => `${m.sender === 'user' ? 'Believer' : 'Shammah Guide'}: ${m.text}`)
          .join('\n')
      : '';

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${historyContext ? `Recent conversation:\n${historyContext}\n\n` : ''}Believer: ${message}`,
      config: {
        systemInstruction:
          'You are a warm, scripture-grounded Christian discipleship companion for Kenyan church congregations and youth on Shammah. Provide encouraging, biblically sound, concise responses.',
      },
    });

    return NextResponse.json({
      reply: response.text?.trim() || 'May the peace of Christ dwell in you richly.',
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Chat failed' }, { status: 500 });
  }
}
