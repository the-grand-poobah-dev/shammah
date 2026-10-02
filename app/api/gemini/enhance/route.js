import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { action, text, context = '' } = await req.json();

    if (!text && action !== 'generate_poll') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Graceful offline enhancement
      if (action === 'polish_testimony') {
        return NextResponse.json({
          enhancedText: `${text}\n\n*"Let everything that has breath praise the Lord!" (Psalm 150:6)* 🙏✨`,
          verses: ['Psalm 150:6', 'Romans 8:28'],
        });
      }
      if (action === 'generate_poll') {
        return NextResponse.json({
          question: 'What spiritual priority would you like to strengthen this season?',
          options: [
            'Daily Secret Place & Dawn Prayer',
            'Deep Scripture Memorization',
            'Evangelism & Sharing My Testimony',
            'Serving in Church & Community',
          ],
        });
      }
      return NextResponse.json({
        enhancedText: `${text}\n\nAmen. Glory be to God!`,
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    let prompt = '';
    if (action === 'polish_testimony') {
      prompt = `Take this Christian post/testimony draft and polish it with inspiring, faith-filled language, fix grammar, and append 1-2 powerful scripture references that reinforce its message:\n\nDraft: "${text}"`;
    } else if (action === 'sermon_outline') {
      prompt = `Generate a 3-point biblical sermon outline based on this topic or theme: "${text}". Include supporting scriptures for each point and a practical life application.`;
    } else if (action === 'generate_poll') {
      prompt = `Generate a lively, engaging poll question with 4 compelling options for Christian fellowship or Sunday service based on topic: "${text || 'fellowship icebreaker'}". Return JSON format: {"question": "...", "options": ["opt1", "opt2", "opt3", "opt4"]}`;
    } else {
      prompt = `Enhance the following text with spiritual clarity and biblical encouragement: "${text}"`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an expert biblical editor and Christian community content specialist.',
        temperature: 0.7,
      },
    });

    const reply = response.text || text;

    return NextResponse.json({
      enhancedText: reply,
      isFallback: false,
    });
  } catch (err) {
    console.error('Enhance API error:', err);
    return NextResponse.json({
      enhancedText: text,
      isFallback: true,
    });
  }
}
