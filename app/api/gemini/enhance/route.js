import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request) {
  try {
    const { action, text } = await request.json();
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ enhancedText: text });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt =
      action === 'generate_poll'
        ? `Rewrite this church community poll question to be clear, warm, and engaging (keep it concise, under 220 characters):\n\n${text}`
        : `Polish this Christian testimony, prayer request, or fellowship post while preserving the author's authentic voice and heart (return only the polished text):\n\n${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return NextResponse.json({
      enhancedText: response.text?.trim() || text,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Enhance failed' }, { status: 500 });
  }
}
