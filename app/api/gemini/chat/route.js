import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SYSTEM_INSTRUCTION = `You are Shammah AI, an empathetic, pastoral, biblically grounded Christian companion, fellowship assistant, and theological study guide for the Shammah church community platform.

Your mission is to:
1. Provide gentle, compassionate, prayerful biblical guidance rooted in scripture.
2. Provide relevant scripture references (book, chapter, verse) with short explanations when answering theological or spiritual questions.
3. Help church leaders, pastors, teachers, and members prepare sermon outlines, discipleship course lessons, icebreaker fellowship polls, and daily devotions.
4. Maintain a warm, encouraging, joyful, Christ-centered tone.
5. If someone asks for prayer, offer a heartfelt, uplifting prayer in your response.
6. Format your responses with clean, readable markdown, bullet points, and highlight key Bible verses.`;

function getFallbackResponse(prompt) {
  const p = (prompt || '').toLowerCase();

  if (p.includes('prayer') || p.includes('pray') || p.includes('healing') || p.includes('peace')) {
    return {
      text: `🙏 **A Prayer of Grace and Divine Peace**\n\nHeavenly Father, we come before You with thankful hearts. We ask for Your healing touch, comfort, and peace that surpasses all human understanding (Philippians 4:6-7). May Your presence bring strength where there is weakness, and joy where there is sorrow.\n\n*"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace."* — **Numbers 6:24-26**\n\nWalk in confidence knowing You are dearly loved. Amen.`,
      suggestedVerses: ['Philippians 4:6-7', 'Numbers 6:24-26', 'Isaiah 41:10'],
    };
  }

  if (p.includes('poll') || p.includes('icebreaker') || p.includes('question') || p.includes('youth')) {
    return {
      text: `📊 **Inspiring Fellowship Poll Ideas for Your Service / Class**\n\nHere are 3 engaging, thought-provoking questions for your congregation:\n\n1. **"Which spiritual discipline has brought you closest to God this month?"**\n   - A) Early Morning Prayer Vigils\n   - B) Meditating on Scripture\n   - C) Fasting & Solitude\n   - D) Fellowship & Worship\n\n2. **"How do you best sense God's guidance during difficult decisions?"**\n   - A) Still, quiet whisper in prayer\n   - B) Direct confirmation through Scripture\n   - C) Wise counsel of church elders\n   - D) Providential doors opening\n\n3. **"Youth & Teens Icebreaker: If you could walk with one Bible figure for a day, who would it be?"**\n   - A) David the worshiper\n   - B) Daniel in Babylon\n   - C) Paul the missionary\n   - D) Esther the courageous queen`,
      suggestedVerses: ['Proverbs 27:17', 'Hebrews 10:24-25', 'Colossians 3:16'],
    };
  }

  if (p.includes('sermon') || p.includes('outline') || p.includes('course') || p.includes('lesson')) {
    return {
      text: `📖 **3-Point Sermon & Teaching Outline: "Walking in Divine Authority"**\n\n**Main Scripture:** Luke 10:19 & Ephesians 6:10-18\n\n**1. Understand Your Identity in Christ**\n- You are not fighting for victory; you are fighting from victory.\n- *Key Verse:* 1 John 4:4 — *"Greater is He that is in you than he that is in the world."*\n\n**2. Put on the Whole Armor of God Daily**\n- Stand firm with the belt of truth, the breastplate of righteousness, and the shield of faith to quench every fiery dart.\n- *Key Verse:* Ephesians 6:13 — *"Therefore take up the whole armor of God, that you may be able to withstand in the evil day."*\n\n**3. Exercise the Authority of Prayer & the Spoken Word**\n- Declare God's Word boldly in fellowship and ministry.\n- *Key Verse:* Mark 11:23-24\n\n**Practical Call to Action:** Dedicate 15 minutes of intercession daily for your church family and community.`,
      suggestedVerses: ['Luke 10:19', 'Ephesians 6:10-18', '1 John 4:4'],
    };
  }

  return {
    text: `🕊️ **Grace and Peace to You in Christ Jesus!**\n\nThank you for reaching out to Shammah AI. Scripture reminds us in **Jeremiah 29:11**: *"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."*\n\nWhether you are preparing a sermon, seeking comfort, studying a discipleship course module, or facilitating a fellowship group, the Lord promises to guide your steps.\n\nHow can I support your spiritual walk or ministry today? You can ask me:\n- 📖 To explain any Bible passage or verse context\n- 🙏 To compose a prayer or devotional reflection\n- 📊 To create interactive polls for your church service or youth fellowship\n- 🎓 To outline a discipleship course curriculum or sermon`,
    suggestedVerses: ['Jeremiah 29:11', 'Proverbs 3:5-6', 'Romans 8:28'],
  };
}

export async function POST(req) {
  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = getFallbackResponse(message);
      return NextResponse.json({
        reply: fallback.text,
        suggestedVerses: fallback.suggestedVerses,
        isFallback: true,
      });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const contents = [];
    for (const item of conversationHistory.slice(-6)) {
      if (item.sender === 'user') {
        contents.push({ role: 'user', parts: [{ text: item.text }] });
      } else if (item.sender === 'bot') {
        contents.push({ role: 'model', parts: [{ text: item.text }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const replyText = response.text || 'May the peace of Christ be with you.';

    return NextResponse.json({
      reply: replyText,
      isFallback: false,
    });
  } catch (err) {
    console.error('Gemini chat error:', err);
    const fallback = getFallbackResponse('');
    return NextResponse.json({
      reply: `${fallback.text}\n\n*(Note: Running in offline/graceful mode)*`,
      isFallback: true,
    });
  }
}
