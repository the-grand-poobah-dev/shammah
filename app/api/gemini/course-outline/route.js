import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

// Simple in-memory rate limiter per IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function buildFallbackOutline({ title = 'Faith & Leadership Course', subtitle = '', description = '', category = 'Discipleship', level = 'Beginner' }) {
  const cleanTitle = title.trim() || 'Faith & Leadership Course';
  return {
    subtitle: subtitle?.trim() || `A practical ${level.toLowerCase()} journey in ${category.toLowerCase()} for everyday believers`,
    outcomes: [
      `Understand the biblical foundations of ${cleanTitle}`,
      'Apply practical spiritual habits and reflection in daily life',
      'Lead and encourage others in your church or small group',
      'Complete a personal action plan with measurable milestones'
    ],
    duration_minutes: 120,
    modules: [
      {
        position: 1,
        title: `Module 1: Foundations of ${cleanTitle}`,
        lessons: [
          {
            position: 1,
            title: `Welcome & Vision for ${cleanTitle}`,
            kind: 'video',
            media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            body_md: `### Welcome to ${cleanTitle}\n\n${description || 'In this opening lesson we establish our scriptural foundation, key themes, and how to get the most from each module.'}\n\n- Set aside quiet time for reflection\n- Take notes in the personal notes tab\n- Share insights in the lesson Q&A thread`,
            duration_seconds: 540,
            is_preview: true,
            quiz_questions: []
          },
          {
            position: 2,
            title: 'Biblical Context & Core Scriptures',
            kind: 'text',
            media_url: '',
            body_md: `### Scriptural Anchors\n\n> *"Your word is a lamp for my feet, a light on my path."* — **Psalm 119:105**\n\n#### Key Principles\n1. **Rooted in Truth**: Every transformation begins with hearing and obeying God's Word.\n2. **Practiced in Community**: Faith grows fastest when shared with fellow believers.\n3. **Sustained by Grace**: Growth is a daily walk of dependence on the Holy Spirit.\n\n#### Reflection Prompt\nWrite down one area where you want to grow during this course in your private lesson notes.`,
            duration_seconds: 600,
            is_preview: false,
            quiz_questions: []
          }
        ]
      },
      {
        position: 2,
        title: 'Module 2: Practical Application & Spiritual Habits',
        lessons: [
          {
            position: 1,
            title: 'Guided Audio Devotional & Prayer Walk',
            kind: 'audio',
            media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            body_md: 'Listen to this guided audio session and pause after each prompt to pray and reflect.',
            duration_seconds: 480,
            is_preview: false,
            quiz_questions: []
          },
          {
            position: 2,
            title: 'Study Workbook & Action Checklist',
            kind: 'download',
            media_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            body_md: 'Download the printable study guide and weekly reflection worksheet for your small group or personal study.',
            duration_seconds: 300,
            is_preview: false,
            quiz_questions: []
          },
          {
            position: 3,
            title: 'Course Mastery Check',
            kind: 'quiz',
            media_url: '',
            body_md: 'Test your understanding of the core principles covered in this course.',
            duration_seconds: 360,
            is_preview: false,
            quiz_questions: [
              {
                position: 1,
                question: `What is the primary goal of ${cleanTitle}?`,
                options: [
                  'Merely collecting information without action',
                  'Applying biblical truth practically in daily life and community',
                  'Isolating from the local church',
                  'Skipping reflection and prayer'
                ],
                correct_index: 1,
                explanation: 'True biblical learning always leads to loving obedience, spiritual maturity, and service in community.'
              },
              {
                position: 2,
                question: 'Which psalm reminds us that God’s Word is a lamp to our feet and a light to our path?',
                options: ['Psalm 23:1', 'Psalm 119:105', 'Psalm 1:3', 'Psalm 91:2'],
                correct_index: 1,
                explanation: 'Psalm 119:105 declares: "Your word is a lamp for my feet, a light on my path."'
              }
            ]
          }
        ]
      }
    ]
  };
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'local';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many outline requests. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      title = '',
      subtitle = '',
      description = '',
      category = 'Discipleship',
      level = 'Beginner'
    } = body || {};

    if (!title || String(title).trim().length < 3) {
      return NextResponse.json(
        { error: 'Please enter a course title (at least 3 characters) before generating an outline.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        outline: buildFallbackOutline({ title, subtitle, description, category, level }),
        source: 'fallback',
        notice: 'GEMINI_API_KEY is not configured; generated a structured starter outline.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const prompt = `You are a Christian curriculum designer for Shammah, a faith-community learning platform in Kenya and globally.
Design a complete, practical, biblically grounded course outline for:
- Title: ${title}
- Subtitle: ${subtitle || '(propose one)'}
- Description: ${description || '(none provided)'}
- Category: ${category}
- Level: ${level}

Requirements:
1. Create 2 to 3 modules, each with 2 to 3 lessons.
2. Include a mix of lesson kinds across the course: 'video', 'text', 'audio', 'download', and at least one 'quiz' lesson.
3. For 'text' lessons, write rich Markdown in body_md (2-3 paragraphs with scripture references and bullet points).
4. For 'quiz' lessons, include 2 to 3 multiple-choice questions with 4 options each, correct_index (0-3), and a clear explanation.
5. Make the first lesson of Module 1 a preview lesson (is_preview: true).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtitle: { type: Type.STRING },
            duration_minutes: { type: Type.INTEGER },
            outcomes: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            modules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  position: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  lessons: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        position: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        kind: { type: Type.STRING },
                        body_md: { type: Type.STRING },
                        duration_seconds: { type: Type.INTEGER },
                        is_preview: { type: Type.BOOLEAN },
                        quiz_questions: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              position: { type: Type.INTEGER },
                              question: { type: Type.STRING },
                              options: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                              },
                              correct_index: { type: Type.INTEGER },
                              explanation: { type: Type.STRING }
                            },
                            required: ['question', 'options', 'correct_index', 'explanation']
                          }
                        }
                      },
                      required: ['title', 'kind', 'body_md', 'duration_seconds', 'is_preview']
                    }
                  }
                },
                required: ['title', 'lessons']
              }
            }
          },
          required: ['subtitle', 'outcomes', 'modules']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const validKinds = new Set(['video', 'audio', 'text', 'quiz', 'download']);

    const sanitizedModules = Array.isArray(parsed.modules) && parsed.modules.length > 0
      ? parsed.modules.map((mod, mIdx) => ({
          position: mIdx + 1,
          title: String(mod.title || `Module ${mIdx + 1}`).trim(),
          lessons: Array.isArray(mod.lessons)
            ? mod.lessons.map((les, lIdx) => {
                const kind = validKinds.has(les.kind) ? les.kind : 'text';
                return {
                  position: lIdx + 1,
                  title: String(les.title || `Lesson ${lIdx + 1}`).trim(),
                  kind,
                  media_url:
                    kind === 'video'
                      ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                      : kind === 'audio'
                        ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
                        : kind === 'download'
                          ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
                          : '',
                  body_md: String(les.body_md || '').trim(),
                  duration_seconds: Math.max(60, Number(les.duration_seconds) || 480),
                  is_preview: mIdx === 0 && lIdx === 0 ? true : Boolean(les.is_preview),
                  quiz_questions:
                    kind === 'quiz' && Array.isArray(les.quiz_questions)
                      ? les.quiz_questions.map((q, qIdx) => ({
                          position: qIdx + 1,
                          question: String(q.question || '').trim(),
                          options: Array.isArray(q.options) && q.options.length >= 2
                            ? q.options.slice(0, 4).map(String)
                            : ['True', 'False'],
                          correct_index: Math.max(0, Math.min(3, Number(q.correct_index) || 0)),
                          explanation: String(q.explanation || '').trim()
                        }))
                      : []
                };
              })
            : []
        }))
      : buildFallbackOutline({ title, subtitle, description, category, level }).modules;

    return NextResponse.json({
      outline: {
        subtitle: parsed.subtitle || subtitle || '',
        duration_minutes: Number(parsed.duration_minutes) || 90,
        outcomes: Array.isArray(parsed.outcomes) && parsed.outcomes.length > 0
          ? parsed.outcomes.slice(0, 6).map(String)
          : buildFallbackOutline({ title, subtitle, description, category, level }).outcomes,
        modules: sanitizedModules
      },
      source: 'gemini'
    });
  } catch (err) {
    console.error('[Gemini Course Outline Error]:', err);
    return NextResponse.json({
      outline: buildFallbackOutline({}),
      source: 'fallback',
      notice: 'Used starter curriculum template because AI service was temporarily unavailable.'
    });
  }
}
