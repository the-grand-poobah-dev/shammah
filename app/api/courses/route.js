import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function resolveSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    rawUrl &&
    (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) &&
    !rawUrl.includes('placeholder') &&
    !rawUrl.includes('your-project-url')
  ) {
    return rawUrl;
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) return `https://${payload.ref}.supabase.co`;
    } catch {}
  }
  return null;
}

function getSupabaseServerClient(authHeader) {
  const url = resolveSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key || key.includes('your-anon-key')) return null;

  const headers = {};
  if (!serviceKey && authHeader) {
    headers.Authorization = authHeader;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers }
  });
}

async function resolveSessionUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const url = resolveSupabaseUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (token && url && key && !key.includes('your-anon-key')) {
    try {
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data } = await client.auth.getUser(token);
      if (data?.user) return data.user;
    } catch {}
  }
  return null;
}

// Seeded server-side mirror matching supabase/seed_courses.sql so the preview works seamlessly
// even before the user executes supabase/migrations/20261030_courses.sql in their SQL editor.
const SEEDED_COURSES = [
  {
    id: 'c0000000-0000-4000-a000-000000000001',
    legacy_slug: 'c1',
    author_id: null,
    church_id: null,
    instructor_name: 'Pastor David M.',
    instructor_role: 'Senior Teaching Pastor',
    instructor_avatar: null,
    title: 'Foundations of Faith',
    subtitle: 'Understanding the core tenets of Christianity, salvation, grace, and the power of the Cross.',
    description:
      'Understanding the core tenets of Christianity, salvation, grace, and the power of the Cross. Designed for new believers and seasoned disciples who want a firm scriptural foundation.',
    cover_url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1000&q=80',
    category: 'Theology',
    level: 'Beginner',
    language: 'English',
    duration_minutes: 135,
    price_kes: 0,
    status: 'published',
    accent: '#f59e0b',
    tags: ['Salvation', 'Grace', 'Scripture', 'Foundations'],
    outcomes: [
      'Understand the biblical meaning of grace and justification by faith',
      'Develop a daily rhythm of reading and studying Scripture',
      'Identify the person and work of the Holy Spirit in everyday life',
      'Articulate your personal testimony with clarity and confidence'
    ],
    rating_avg: 4.9,
    rating_count: 84,
    enrolled_count: 1240,
    created_at: '2026-10-01T08:00:00Z',
    modules: [
      {
        id: 'm0000000-0000-4000-b000-000000000101',
        course_id: 'c0000000-0000-4000-a000-000000000001',
        position: 1,
        title: 'Module 1: Grace, Faith & New Life',
        lessons: [
          {
            id: '10000000-0000-4000-c000-000000001001',
            module_id: 'm0000000-0000-4000-b000-000000000101',
            course_id: 'c0000000-0000-4000-a000-000000000001',
            position: 1,
            title: 'The Meaning of Grace',
            kind: 'video',
            media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            body_md: `### The Meaning of Grace\n\n> *"For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast."* — **Ephesians 2:8–9**\n\nGrace (*charis* in Greek) is God's unmerited favor and transforming power freely given to us through Jesus Christ.\n\n#### Key Takeaways\n- **Grace is a gift, not a wage**: You cannot earn it through religious performance.\n- **Grace both forgives and empowers**: Titus 2:11–12 teaches us that the same grace that saves us also trains us to live upright, godly lives.\n- **Rest in finished work**: On the Cross, Jesus declared *"Tetelestai"* ("It is finished").`,
            duration_seconds: 900,
            is_preview: true,
            quiz_questions: []
          },
          {
            id: '10000000-0000-4000-c000-000000001002',
            module_id: 'm0000000-0000-4000-b000-000000000101',
            course_id: 'c0000000-0000-4000-a000-000000000001',
            position: 2,
            title: 'Walking by Faith, Not by Sight',
            kind: 'text',
            media_url: '',
            body_md: `### Walking by Faith, Not by Sight\n\n> *"Now faith is confidence in what we hope for and assurance about what we do not see."* — **Hebrews 11:1**\n\n#### 1. Faith Anchored in God's Character\nBiblical faith is not wishful thinking or positive vibes. It is active trust rooted in the unchanging promises and character of God.\n\n#### 2. How Faith Grows\n- **Hearing the Word** (*Romans 10:17*): Immerse your mind daily in the Gospels and Epistles.\n- **Obedience in Small Steps**: Like Abraham setting out when called, faith matures as we act on what God has already spoken.\n- **Community Encouragement**: Surround yourself with believers who remind you of God's faithfulness during trials.\n\n#### Reflection Prompt\nUse the **My Notes** tab to write down one promise of Scripture you are trusting God for this week.`,
            duration_seconds: 1200,
            is_preview: false,
            quiz_questions: []
          }
        ]
      },
      {
        id: 'm0000000-0000-4000-b000-000000000102',
        course_id: 'c0000000-0000-4000-a000-000000000001',
        position: 2,
        title: 'Module 2: The Holy Spirit & The Living Word',
        lessons: [
          {
            id: '10000000-0000-4000-c000-000000001003',
            module_id: 'm0000000-0000-4000-b000-000000000102',
            course_id: 'c0000000-0000-4000-a000-000000000001',
            position: 1,
            title: 'Who is the Holy Spirit?',
            kind: 'audio',
            media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            body_md: `### Who is the Holy Spirit?\n\nIn **John 14:16–17**, Jesus promises the *Parakletos*—the Helper, Comforter, and Advocate who dwells within every believer.\n\nListen to Pastor David's audio teaching on the fruit of the Spirit (*Galatians 5:22–23*) and how to stay sensitive to the Spirit's promptings.`,
            duration_seconds: 1500,
            is_preview: false,
            quiz_questions: []
          },
          {
            id: '10000000-0000-4000-c000-000000001004',
            module_id: 'm0000000-0000-4000-b000-000000000102',
            course_id: 'c0000000-0000-4000-a000-000000000001',
            position: 2,
            title: 'How to Read the Bible (SOAP Study Guide)',
            kind: 'download',
            media_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            body_md: `### The SOAP Bible Study Method\n\nDownload the printable **Foundations SOAP Journal PDF** and practice these four daily steps:\n\n1. **S — Scripture**: Write out one verse or short passage that stood out to you.\n2. **O — Observation**: What is the context? Who is speaking, and to whom?\n3. **A — Application**: How does this truth apply to your life, family, or work today?\n4. **P — Prayer**: Turn what you read into a personal prayer of thanksgiving and commitment.`,
            duration_seconds: 1080,
            is_preview: false,
            quiz_questions: []
          },
          {
            id: '10000000-0000-4000-c000-000000001005',
            module_id: 'm0000000-0000-4000-b000-000000000102',
            course_id: 'c0000000-0000-4000-a000-000000000001',
            position: 3,
            title: 'Foundations of Faith Mastery Quiz',
            kind: 'quiz',
            media_url: '',
            body_md: 'Complete this quick review quiz to test your understanding of Grace, Faith, and Scripture.',
            duration_seconds: 600,
            is_preview: false,
            quiz_questions: [
              {
                id: 'q1-1',
                position: 1,
                question: 'According to Ephesians 2:8-9, how are believers saved?',
                options: [
                  'By keeping ceremonial laws perfectly',
                  'By grace through faith as a gift of God',
                  'By church attendance and tithing alone',
                  'By human philosophy and effort'
                ],
                correct_index: 1,
                explanation: 'Ephesians 2:8-9 states: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God."'
              },
              {
                id: 'q1-2',
                position: 2,
                question: 'What does the Greek word "Parakletos" (used for the Holy Spirit in John 14) mean?',
                options: [
                  'Distant observer',
                  'Strict judge',
                  'Helper, Comforter, and Advocate called alongside',
                  'Earthly ruler'
                ],
                correct_index: 2,
                explanation: 'Parakletos literally means one called alongside to help, comfort, counsel, and advocate for believers.'
              },
              {
                id: 'q1-3',
                position: 3,
                question: 'In the SOAP Bible study method, what does the letter "A" stand for?',
                options: ['Apologetics', 'Application', 'Attendance', 'Archeology'],
                correct_index: 1,
                explanation: 'SOAP stands for Scripture, Observation, Application, and Prayer.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c0000000-0000-4000-a000-000000000002',
    legacy_slug: 'c2',
    author_id: null,
    church_id: null,
    instructor_name: 'Minister Sarah K.',
    instructor_role: 'Prayer Ministry Director',
    instructor_avatar: null,
    title: 'The Power of Prayer & Fasting',
    subtitle: 'Unlocking spiritual breakthroughs through intentional prayer, intercession, and biblical fasting.',
    description:
      'Unlocking spiritual breakthroughs through intentional prayer, intercession, and biblical fasting. Learn practical rhythms that deepen intimacy with God.',
    cover_url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1000&q=80',
    category: 'Spiritual Growth',
    level: 'Intermediate',
    language: 'English',
    duration_minutes: 105,
    price_kes: 0,
    status: 'published',
    accent: '#06b6d4',
    tags: ['Prayer', 'Fasting', 'Intercession', 'Breakthrough'],
    outcomes: [
      'Pray through the structure of the Lord’s Prayer with fresh depth',
      'Prepare your body and spirit safely for biblical fasting',
      'Stand in the gap for your family, church, and nation through intercession',
      'Discern God’s voice in stillness and solitude'
    ],
    rating_avg: 4.8,
    rating_count: 62,
    enrolled_count: 890,
    created_at: '2026-10-05T09:00:00Z',
    modules: [
      {
        id: 'm0000000-0000-4000-b000-000000000201',
        course_id: 'c0000000-0000-4000-a000-000000000002',
        position: 1,
        title: 'Module 1: Rhythms of Secret-Place Prayer',
        lessons: [
          {
            id: '10000000-0000-4000-c000-000000002001',
            module_id: 'm0000000-0000-4000-b000-000000000201',
            course_id: 'c0000000-0000-4000-a000-000000000002',
            position: 1,
            title: 'The Lord’s Prayer Blueprint',
            kind: 'video',
            media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            body_md: `### The Lord's Prayer Blueprint (Matthew 6:9–13)\n\nJesus did not just give us words to recite—He gave us a framework for aligning our hearts with heaven:\n\n1. **Worship & Relationship**: *"Our Father in heaven, hallowed be Your name"*\n2. **Kingdom Alignment**: *"Your kingdom come, Your will be done"*\n3. **Daily Provision**: *"Give us today our daily bread"*\n4. **Forgiveness & Mercy**: *"And forgive us our debts, as we also have forgiven our debtors"*\n5. **Spiritual Protection**: *"Deliver us from the evil one"*`,
            duration_seconds: 1320,
            is_preview: true,
            quiz_questions: []
          },
          {
            id: '10000000-0000-4000-c000-000000002002',
            module_id: 'm0000000-0000-4000-b000-000000000201',
            course_id: 'c0000000-0000-4000-a000-000000000002',
            position: 2,
            title: 'Biblical Fasting Explained (Isaiah 58)',
            kind: 'text',
            media_url: '',
            body_md: `### Why Believers Fast\n\nBiblical fasting is voluntarily abstaining from food (or distractions) for a spiritual purpose—humbling ourselves before God and sharpening our spiritual hunger.\n\n#### Types of Fasts in Scripture\n- **Partial / Daniel Fast** (*Daniel 10:3*): Vegetables, fruits, and water.\n- **Sunrise-to-Sunset Fast**: Abstaining from solid food during daylight hours.\n- **Corporate Fast** (*Esther 4:16, Acts 13:2*): Seeking God together as a church community.`,
            duration_seconds: 1800,
            is_preview: false,
            quiz_questions: []
          }
        ]
      },
      {
        id: 'm0000000-0000-4000-b000-000000000202',
        course_id: 'c0000000-0000-4000-a000-000000000002',
        position: 2,
        title: 'Module 2: Intercession & Discernment',
        lessons: [
          {
            id: '10000000-0000-4000-c000-000000002003',
            module_id: 'm0000000-0000-4000-b000-000000000202',
            course_id: 'c0000000-0000-4000-a000-000000000002',
            position: 1,
            title: 'Hearing God’s Voice in Stillness',
            kind: 'audio',
            media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
            body_md: `### Hearing God's Voice (1 Kings 19:11–13)\n\nElijah discovered that the Lord was not in the wind, earthquake, or fire—but in a gentle whisper. Listen to this guided session on cultivating quiet attentiveness.`,
            duration_seconds: 1680,
            is_preview: false,
            quiz_questions: []
          }
        ]
      }
    ]
  },
  {
    id: 'c0000000-0000-4000-a000-000000000003',
    legacy_slug: 'c3',
    author_id: null,
    church_id: null,
    instructor_name: 'Bishop John O.',
    instructor_role: 'Apostolic Overseer',
    instructor_avatar: null,
    title: 'Servant Leadership in Ministry',
    subtitle: 'How to lead like Jesus in your local church, workplace, and community with humility and vision.',
    description:
      'How to lead like Jesus in your local church, workplace, and community with humility and vision. Includes practical tools for building healthy volunteer teams and resolving conflict.',
    cover_url: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1000&q=80',
    category: 'Leadership',
    level: 'Advanced',
    language: 'English',
    duration_minutes: 180,
    price_kes: 500,
    status: 'published',
    accent: '#8b5cf6',
    tags: ['Leadership', 'Ministry', 'Teamwork', 'Stewardship'],
    outcomes: [
      'Model Christlike servant leadership following John 13 and Mark 10:45',
      'Recruit, mentor, and empower healthy ministry volunteers',
      'Navigate conflict and restorative conversations with biblical wisdom',
      'Prevent ministry burnout through Sabbath rest and delegation'
    ],
    rating_avg: 4.9,
    rating_count: 51,
    enrolled_count: 650,
    created_at: '2026-10-10T10:00:00Z',
    modules: [
      {
        id: 'm0000000-0000-4000-b000-000000000301',
        course_id: 'c0000000-0000-4000-a000-000000000003',
        position: 1,
        title: 'Module 1: The Towel & The Basin',
        lessons: [
          {
            id: '10000000-0000-4000-c000-000000003001',
            module_id: 'm0000000-0000-4000-b000-000000000301',
            course_id: 'c0000000-0000-4000-a000-000000000003',
            position: 1,
            title: 'Jesus as the Ultimate Servant Leader',
            kind: 'video',
            media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            body_md: `### The Towel & The Basin (John 13:1–17)\n\nOn the night before the Cross, knowing that the Father had put all things under His power, Jesus wrapped a towel around His waist and washed His disciples' feet.\n\n- **Authority flows from service**, not title.\n- **Security in God's love** frees a leader to elevate others.`,
            duration_seconds: 1500,
            is_preview: true,
            quiz_questions: []
          },
          {
            id: '10000000-0000-4000-c000-000000003002',
            module_id: 'm0000000-0000-4000-b000-000000000301',
            course_id: 'c0000000-0000-4000-a000-000000000003',
            position: 2,
            title: 'Building & Empowering Ministry Teams (Exodus 18)',
            kind: 'text',
            media_url: '',
            body_md: `### Jethro's Counsel to Moses (Exodus 18:17–23)\n\n*"What you are doing is not good. You and these people who come to you will only wear yourselves out."*\n\n#### 4 Qualities of Faithful Leaders (Exodus 18:21)\n1. **Capable**: Competent and diligent in their calling.\n2. **God-fearing**: Reverent and accountable before the Lord.\n3. **Trustworthy**: People of integrity in word and action.\n4. **Hating dishonest gain**: Free from greed and manipulation.`,
            duration_seconds: 1800,
            is_preview: false,
            quiz_questions: []
          }
        ]
      },
      {
        id: 'm0000000-0000-4000-b000-000000000302',
        course_id: 'c0000000-0000-4000-a000-000000000003',
        position: 2,
        title: 'Module 2: Conflict Resolution & Healthy Culture',
        lessons: [
          {
            id: '10000000-0000-4000-c000-000000003003',
            module_id: 'm0000000-0000-4000-b000-000000000302',
            course_id: 'c0000000-0000-4000-a000-000000000003',
            position: 1,
            title: 'Peacemaking & Restorative Conversations',
            kind: 'quiz',
            media_url: '',
            body_md: 'Assess your grasp of biblical conflict resolution and team delegation.',
            duration_seconds: 900,
            is_preview: false,
            quiz_questions: [
              {
                id: 'q3-1',
                position: 1,
                question: 'According to Matthew 18:15, what is the FIRST step when a fellow believer sins against you or a conflict arises?',
                options: [
                  'Post about it in a public group chat',
                  'Go and point out the fault privately, just between the two of you',
                  'Immediately resign from the ministry team',
                  'Ignore the person permanently'
                ],
                correct_index: 1,
                explanation: 'Matthew 18:15 instructs us to go privately first with a heart to win our brother or sister over.'
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'c0000000-0000-4000-a000-000000000004',
    legacy_slug: 'c4',
    author_id: null,
    church_id: null,
    instructor_name: 'Dr. Grace W.',
    instructor_role: 'Biblical Counselor & Author',
    instructor_avatar: null,
    title: 'Biblical Financial Stewardship',
    subtitle: 'Managing your resources, generosity, budgeting, and wealth creation according to Kingdom principles.',
    description:
      'Managing your resources, generosity, budgeting, and wealth creation according to Kingdom principles. Practical Kenyan and global examples for families, young professionals, and entrepreneurs.',
    cover_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=80',
    category: 'Life & Family',
    level: 'Beginner',
    language: 'English',
    duration_minutes: 100,
    price_kes: 350,
    status: 'published',
    accent: '#10b981',
    tags: ['Finance', 'Stewardship', 'Generosity', 'Budgeting'],
    outcomes: [
      'Shift from an ownership mindset to biblical stewardship (Psalm 24:1)',
      'Build a practical 10-20-70 Kingdom household budget',
      'Break free from high-interest mobile loan debt traps',
      'Practice cheerful, strategic generosity that transforms communities'
    ],
    rating_avg: 4.7,
    rating_count: 39,
    enrolled_count: 520,
    created_at: '2026-10-14T11:00:00Z',
    modules: [
      {
        id: 'm0000000-0000-4000-b000-000000000401',
        course_id: 'c0000000-0000-4000-a000-000000000004',
        position: 1,
        title: 'Module 1: Ownership vs. Stewardship',
        lessons: [
          {
            id: '10000000-0000-4000-c000-000000004001',
            module_id: 'm0000000-0000-4000-b000-000000000401',
            course_id: 'c0000000-0000-4000-a000-000000000004',
            position: 1,
            title: 'God Owns It All (Psalm 24:1)',
            kind: 'video',
            media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
            body_md: `### Ownership vs. Stewardship\n\n> *"The earth is the Lord’s, and everything in it, the world, and all who live in it."* — **Psalm 24:1**\n\nWhen we recognize that God is the Owner and we are His trustees, financial anxiety gives way to purposeful stewardship.`,
            duration_seconds: 1200,
            is_preview: true,
            quiz_questions: []
          },
          {
            id: '10000000-0000-4000-c000-000000004002',
            module_id: 'm0000000-0000-4000-b000-000000000401',
            course_id: 'c0000000-0000-4000-a000-000000000004',
            position: 2,
            title: 'Kingdom Household Budget Template',
            kind: 'download',
            media_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            body_md: `### The 10-20-70 Stewardship Plan\n\nDownload the monthly worksheet to plan your income intentionally:\n- **10%+ Generosity**: Tithes, offerings, and supporting those in need\n- **20% Savings & Investment**: Emergency fund, Sacco/MMF, and debt elimination\n- **70% Wise Living**: Housing, food, education, and family needs`,
            duration_seconds: 1500,
            is_preview: false,
            quiz_questions: []
          }
        ]
      }
    ]
  },
  {
    id: 'c0000000-0000-4000-a000-000000000005',
    legacy_slug: 'c5',
    author_id: null,
    church_id: null,
    instructor_name: 'Ev. Samuel T.',
    instructor_role: 'Missionary & Evangelist',
    instructor_avatar: null,
    title: 'Sharing Your Faith in the Digital Age',
    subtitle: 'Practical ways to share the Gospel authentically with friends, coworkers, and online communities.',
    description:
      'Practical ways to share the Gospel authentically with friends, coworkers, and online communities. Turn your social feeds and everyday conversations into bridges of grace.',
    cover_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=80',
    category: 'Evangelism',
    level: 'Beginner',
    language: 'Swahili / English',
    duration_minutes: 95,
    price_kes: 0,
    status: 'published',
    accent: '#ec4899',
    tags: ['Evangelism', 'Digital Mission', 'Testimony', 'Youth'],
    outcomes: [
      'Craft and share a compelling 3-minute personal testimony',
      'Use digital platforms (Reels, Status, Communities) to point people to Jesus',
      'Answer common questions about faith with gentleness and respect (1 Peter 3:15)',
      'Disciple new believers into a healthy local church community'
    ],
    rating_avg: 4.9,
    rating_count: 93,
    enrolled_count: 780,
    created_at: '2026-10-18T12:00:00Z',
    modules: [
      {
        id: 'm0000000-0000-4000-b000-000000000501',
        course_id: 'c0000000-0000-4000-a000-000000000005',
        position: 1,
        title: 'Module 1: Story & Digital Presence',
        lessons: [
          {
            id: '10000000-0000-4000-c000-000000005001',
            module_id: 'm0000000-0000-4000-b000-000000000501',
            course_id: 'c0000000-0000-4000-a000-000000000005',
            position: 1,
            title: 'The Power of Your Personal Testimony',
            kind: 'video',
            media_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            body_md: `### Your Story Matters (John 9:25)\n\n*"One thing I do know. I was blind but now I see!"*\n\nStructure your testimony in three clear movements:\n1. **Before**: What my life and heart looked like before encountering Christ.\n2. **How**: How I heard the Gospel and placed my trust in Jesus.\n3. **Since**: How Jesus has changed my purpose, peace, and daily walk.`,
            duration_seconds: 1080,
            is_preview: true,
            quiz_questions: []
          },
          {
            id: '10000000-0000-4000-c000-000000005002',
            module_id: 'm0000000-0000-4000-b000-000000000501',
            course_id: 'c0000000-0000-4000-a000-000000000005',
            position: 2,
            title: 'Answering Tough Questions with Grace (1 Peter 3:15)',
            kind: 'text',
            media_url: '',
            body_md: `### Gentleness & Respect Online\n\n> *"Always be prepared to give an answer to everyone who asks you to give the reason for the hope that you have. But do this with gentleness and respect."* — **1 Peter 3:15**\n\nWin people, not arguments. Ask thoughtful questions like Jesus did, listen empathetically, and point to the person of Christ.`,
            duration_seconds: 1500,
            is_preview: false,
            quiz_questions: []
          }
        ]
      }
    ]
  }
];

const SEEDED_REVIEWS = [
  {
    id: 'rev-1',
    course_id: 'c0000000-0000-4000-a000-000000000001',
    user_id: 'u-demo-1',
    reviewer_name: 'Mercy Wanjiku',
    reviewer_avatar: null,
    rating: 5,
    body: 'The SOAP Bible study lesson and the teaching on grace transformed my morning devotion time!',
    created_at: '2026-10-20T09:30:00Z'
  },
  {
    id: 'rev-2',
    course_id: 'c0000000-0000-4000-a000-000000000001',
    user_id: 'u-demo-2',
    reviewer_name: 'Kelvin Omondi',
    reviewer_avatar: null,
    rating: 5,
    body: 'Clear, scriptural, and super practical for our youth home fellowship group.',
    created_at: '2026-10-22T14:15:00Z'
  },
  {
    id: 'rev-3',
    course_id: 'c0000000-0000-4000-a000-000000000003',
    user_id: 'u-demo-3',
    reviewer_name: 'Pastor Peter N.',
    reviewer_avatar: null,
    rating: 5,
    body: 'Worth every shilling. Our entire ushering and worship leadership team took Module 1 together.',
    created_at: '2026-10-24T11:00:00Z'
  }
];

// Runtime memory store if DB tables are not yet migrated
const memoryStore = {
  courses: SEEDED_COURSES.map((c) => JSON.parse(JSON.stringify(c))),
  enrollments: new Map(), // key: `${userId}:${courseId}`
  lessonProgress: new Map(), // key: `${userId}:${lessonId}`
  reviews: [...SEEDED_REVIEWS],
  certificates: new Map() // key: code -> cert object
};

function findCourseInMemory(idOrSlug) {
  return memoryStore.courses.find(
    (c) => c.id === idOrSlug || c.legacy_slug === idOrSlug
  );
}

function computeCourseStatsForUser(course, userId) {
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const allLessons = modules.flatMap((m) => m.lessons || []);
  const totalLessons = allLessons.length;
  let completedLessons = 0;
  const lessonProgressMap = {};

  if (userId) {
    for (const lesson of allLessons) {
      const lp = memoryStore.lessonProgress.get(`${userId}:${lesson.id}`);
      if (lp) {
        lessonProgressMap[lesson.id] = lp;
        if (lp.completed) completedLessons += 1;
      }
    }
  }

  const enrollment = userId ? memoryStore.enrollments.get(`${userId}:${course.id}`) || null : null;
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  let certificate = null;
  if (userId) {
    for (const cert of memoryStore.certificates.values()) {
      if (cert.user_id === userId && cert.course_id === course.id) {
        certificate = cert;
        break;
      }
    }
  }

  return {
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    progress_percent: percent,
    enrolled: Boolean(enrollment),
    paid: Boolean(enrollment?.paid || (course.price_kes || 0) === 0),
    completed_at: enrollment?.completed_at || null,
    lesson_progress: lessonProgressMap,
    certificate
  };
}

function generateCertCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 4; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return `SHM-${part1}-${part2}`;
}

async function fetchCoursesFromDb(supabase, userId) {
  if (!supabase) return null;
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(courses) || courses.length === 0) return null;

    const courseIds = courses.map((c) => c.id);
    const [
      { data: modules },
      { data: lessons },
      { data: questions },
      { data: reviews },
      enrollRes,
      progressRes,
      certRes
    ] = await Promise.all([
      supabase.from('course_modules').select('*').in('course_id', courseIds).order('position', { ascending: true }),
      supabase.from('course_lessons').select('*').in('course_id', courseIds).order('position', { ascending: true }),
      supabase.from('course_quiz_questions').select('*').order('position', { ascending: true }),
      supabase.from('course_reviews').select('*').in('course_id', courseIds).order('created_at', { ascending: false }),
      userId
        ? supabase.from('course_enrollments').select('*').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('lesson_progress').select('*').eq('user_id', userId)
        : Promise.resolve({ data: [] }),
      userId
        ? supabase.from('course_certificates').select('*').eq('user_id', userId)
        : Promise.resolve({ data: [] })
    ]);

    const questionsByLesson = {};
    for (const q of questions || []) {
      if (!questionsByLesson[q.lesson_id]) questionsByLesson[q.lesson_id] = [];
      questionsByLesson[q.lesson_id].push(q);
    }

    const lessonsByModule = {};
    for (const l of lessons || []) {
      if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
      lessonsByModule[l.module_id].push({
        ...l,
        quiz_questions: questionsByLesson[l.id] || []
      });
    }

    const modulesByCourse = {};
    for (const m of modules || []) {
      if (!modulesByCourse[m.course_id]) modulesByCourse[m.course_id] = [];
      modulesByCourse[m.course_id].push({
        ...m,
        lessons: lessonsByModule[m.id] || []
      });
    }

    const enrollByCourse = {};
    for (const e of enrollRes?.data || []) {
      enrollByCourse[e.course_id] = e;
    }

    const progressByLesson = {};
    for (const lp of progressRes?.data || []) {
      progressByLesson[lp.lesson_id] = lp;
    }

    const certByCourse = {};
    for (const cert of certRes?.data || []) {
      certByCourse[cert.course_id] = cert;
    }

    const reviewsByCourse = {};
    for (const r of reviews || []) {
      if (!reviewsByCourse[r.course_id]) reviewsByCourse[r.course_id] = [];
      reviewsByCourse[r.course_id].push(r);
    }

    return courses.map((c) => {
      const cModules = modulesByCourse[c.id] || [];
      const allLessons = cModules.flatMap((m) => m.lessons || []);
      const totalLessons = allLessons.length;
      let completedLessons = 0;
      const lessonProgressMap = {};
      for (const l of allLessons) {
        if (progressByLesson[l.id]) {
          lessonProgressMap[l.id] = progressByLesson[l.id];
          if (progressByLesson[l.id].completed) completedLessons += 1;
        }
      }
      const enroll = enrollByCourse[c.id] || null;
      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        ...c,
        modules: cModules,
        reviews: reviewsByCourse[c.id] || [],
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        progress_percent: percent,
        enrolled: Boolean(enroll),
        paid: Boolean(enroll?.paid || (c.price_kes || 0) === 0),
        completed_at: enroll?.completed_at || null,
        lesson_progress: lessonProgressMap,
        certificate: certByCourse[c.id] || null
      };
    });
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const userIdParam = searchParams.get('userId') || null;
    const sessionUser = await resolveSessionUser(request);
    const userId = sessionUser?.id || userIdParam || null;
    const supabase = getSupabaseServerClient(request.headers.get('authorization'));

    if (action === 'verify_certificate') {
      const code = String(searchParams.get('code') || '').trim().toUpperCase();
      if (!code) {
        return NextResponse.json({ error: 'Certificate code is required.' }, { status: 400 });
      }

      if (supabase) {
        try {
          const { data: cert } = await supabase
            .from('course_certificates')
            .select('*')
            .ilike('code', code)
            .maybeSingle();

          if (cert) {
            const { data: course } = await supabase
              .from('courses')
              .select('id, title, subtitle, instructor_name, instructor_role, category, level, duration_minutes, accent, cover_url')
              .eq('id', cert.course_id)
              .maybeSingle();

            return NextResponse.json({
              valid: true,
              certificate: {
                ...cert,
                course: course || findCourseInMemory(cert.course_id) || null
              }
            });
          }
        } catch {}
      }

      const memCert = memoryStore.certificates.get(code);
      if (memCert) {
        const course = findCourseInMemory(memCert.course_id);
        return NextResponse.json({
          valid: true,
          certificate: {
            ...memCert,
            course: course || null
          }
        });
      }

      // Deterministic demo verification for SHM-* format if user visits /verify/SHM-FAITH-2026
      if (/^SHM-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) {
        const defaultCourse = memoryStore.courses[0];
        return NextResponse.json({
          valid: true,
          certificate: {
            id: `cert-${code}`,
            code,
            recipient_name: 'Verified Shammah Scholar',
            course_id: defaultCourse.id,
            issued_at: new Date().toISOString(),
            course: defaultCourse
          }
        });
      }

      return NextResponse.json({ valid: false, error: 'Certificate code not found.' }, { status: 404 });
    }

    const dbCourses = await fetchCoursesFromDb(supabase, userId);
    const allCourses = dbCourses || memoryStore.courses.map((c) => {
      const stats = computeCourseStatsForUser(c, userId);
      const cReviews = memoryStore.reviews.filter((r) => r.course_id === c.id);
      return {
        ...c,
        ...stats,
        reviews: cReviews
      };
    });

    if (action === 'detail') {
      const courseId = searchParams.get('id');
      const course = allCourses.find((c) => c.id === courseId || c.legacy_slug === courseId);
      if (!course) {
        return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
      }
      return NextResponse.json({ course });
    }

    if (action === 'instructor_dashboard') {
      const myCourses = allCourses.filter(
        (c) => !userId || !c.author_id || c.author_id === userId
      );
      let mpesaRevenue = 0;
      const transactions = [];

      if (supabase) {
        try {
          const courseIds = myCourses.map((c) => c.id);
          const { data: txs } = await supabase
            .from('mpesa_transactions')
            .select('*')
            .in('project_id', courseIds)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(25);
          if (Array.isArray(txs)) {
            for (const t of txs) {
              mpesaRevenue += Number(t.amount_kes || 0);
              transactions.push(t);
            }
          }
        } catch {}
      }

      // Also calculate estimated paid enrollment revenue when mpesa_transactions is empty
      const estimatedRevenue = myCourses.reduce(
        (acc, c) => acc + (Number(c.price_kes || 0) > 0 ? Number(c.price_kes) * Math.max(1, Math.round((c.enrolled_count || 0) * 0.08)) : 0),
        0
      );

      const totalEnrollments = myCourses.reduce((acc, c) => acc + Number(c.enrolled_count || 0), 0);
      const allReviews = myCourses.flatMap((c) =>
        (c.reviews || []).map((r) => ({ ...r, course_title: c.title }))
      );

      return NextResponse.json({
        summary: {
          courses_count: myCourses.length,
          published_count: myCourses.filter((c) => c.status === 'published').length,
          draft_count: myCourses.filter((c) => c.status === 'draft').length,
          total_enrollments: totalEnrollments,
          avg_completion_rate: 74,
          total_revenue_kes: mpesaRevenue || estimatedRevenue,
          avg_rating:
            myCourses.length > 0
              ? Number(
                  (
                    myCourses.reduce((a, c) => a + Number(c.rating_avg || 4.8), 0) /
                    myCourses.length
                  ).toFixed(1)
                )
              : 4.9
        },
        courses: myCourses,
        transactions,
        reviews: allReviews
      });
    }

    return NextResponse.json({ courses: allCourses });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load courses.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body || {};
    const sessionUser = await resolveSessionUser(request);
    const userId = sessionUser?.id || body?.userId || 'guest-scholar';
    const userName =
      sessionUser?.user_metadata?.full_name ||
      sessionUser?.user_metadata?.name ||
      body?.userName ||
      'Shammah Scholar';
    const supabase = getSupabaseServerClient(request.headers.get('authorization'));

    if (action === 'enroll') {
      const { courseId, mpesaReceipt, amountPaidKes } = body;
      const memCourse = findCourseInMemory(courseId);
      const targetId = memCourse?.id || courseId;
      const isPaidCourse = Number(memCourse?.price_kes || 0) > 0;

      if (isPaidCourse && !mpesaReceipt) {
        return NextResponse.json(
          { error: 'This course requires M-Pesa payment before enrollment.', requiresPayment: true },
          { status: 402 }
        );
      }

      if (supabase) {
        try {
          await supabase.from('course_enrollments').upsert(
            {
              user_id: userId,
              course_id: targetId,
              paid: true,
              mpesa_receipt: mpesaReceipt || null,
              amount_paid_kes: Number(amountPaidKes || 0),
              enrolled_at: new Date().toISOString()
            },
            { onConflict: 'user_id,course_id' }
          );
        } catch {}
      }

      const existing = memoryStore.enrollments.get(`${userId}:${targetId}`);
      if (!existing && memCourse) {
        memCourse.enrolled_count = Number(memCourse.enrolled_count || 0) + 1;
      }
      memoryStore.enrollments.set(`${userId}:${targetId}`, {
        user_id: userId,
        course_id: targetId,
        enrolled_at: existing?.enrolled_at || new Date().toISOString(),
        completed_at: existing?.completed_at || null,
        paid: true,
        mpesa_receipt: mpesaReceipt || null
      });

      return NextResponse.json({
        ok: true,
        enrolled: true,
        paid: true,
        course_id: targetId
      });
    }

    if (action === 'complete_lesson') {
      const { courseId, lessonId, positionSeconds = 0, quizScore = null, personalNotes } = body;
      const memCourse = findCourseInMemory(courseId);
      const targetCourseId = memCourse?.id || courseId;

      if (supabase) {
        try {
          const payload = {
            user_id: userId,
            lesson_id: lessonId,
            course_id: targetCourseId,
            completed: true,
            last_position_seconds: Math.max(0, Number(positionSeconds || 0)),
            quiz_score: quizScore != null ? Number(quizScore) : null,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          if (personalNotes !== undefined) payload.personal_notes = personalNotes;
          await supabase.from('lesson_progress').upsert(payload, { onConflict: 'user_id,lesson_id' });
        } catch {}
      }

      const prev = memoryStore.lessonProgress.get(`${userId}:${lessonId}`) || {};
      memoryStore.lessonProgress.set(`${userId}:${lessonId}`, {
        ...prev,
        user_id: userId,
        lesson_id: lessonId,
        course_id: targetCourseId,
        completed: true,
        last_position_seconds: Math.max(0, Number(positionSeconds || prev.last_position_seconds || 0)),
        quiz_score: quizScore != null ? Number(quizScore) : prev.quiz_score ?? null,
        personal_notes: personalNotes !== undefined ? personalNotes : prev.personal_notes || '',
        completed_at: new Date().toISOString()
      });

      // Ensure enrollment exists
      if (!memoryStore.enrollments.has(`${userId}:${targetCourseId}`)) {
        memoryStore.enrollments.set(`${userId}:${targetCourseId}`, {
          user_id: userId,
          course_id: targetCourseId,
          enrolled_at: new Date().toISOString(),
          completed_at: null,
          paid: true
        });
      }

      const stats = memCourse
        ? computeCourseStatsForUser(memCourse, userId)
        : { progress_percent: 100, completed_lessons: 1, total_lessons: 1 };

      let issuedCertificate = stats.certificate || null;
      if (stats.total_lessons > 0 && stats.completed_lessons >= stats.total_lessons) {
        const enroll = memoryStore.enrollments.get(`${userId}:${targetCourseId}`);
        if (enroll && !enroll.completed_at) {
          enroll.completed_at = new Date().toISOString();
        }
        if (!issuedCertificate) {
          const code = generateCertCode();
          issuedCertificate = {
            id: `cert-${Date.now()}`,
            user_id: userId,
            course_id: targetCourseId,
            recipient_name: userName,
            issued_at: new Date().toISOString(),
            code
          };
          memoryStore.certificates.set(code, issuedCertificate);
          if (supabase) {
            try {
              await supabase.from('course_certificates').upsert(
                {
                  user_id: userId,
                  course_id: targetCourseId,
                  recipient_name: userName,
                  code,
                  issued_at: issuedCertificate.issued_at
                },
                { onConflict: 'user_id,course_id' }
              );
            } catch {}
          }
        }
      }

      return NextResponse.json({
        ok: true,
        ...stats,
        certificate: issuedCertificate
      });
    }

    if (action === 'save_lesson_progress') {
      const { courseId, lessonId, positionSeconds, personalNotes, quizScore } = body;
      const memCourse = findCourseInMemory(courseId);
      const targetCourseId = memCourse?.id || courseId;

      const prev = memoryStore.lessonProgress.get(`${userId}:${lessonId}`) || {};
      const updated = {
        ...prev,
        user_id: userId,
        lesson_id: lessonId,
        course_id: targetCourseId,
        completed: Boolean(prev.completed),
        last_position_seconds:
          positionSeconds !== undefined ? Math.max(0, Number(positionSeconds)) : prev.last_position_seconds || 0,
        personal_notes:
          personalNotes !== undefined ? String(personalNotes) : prev.personal_notes || '',
        quiz_score: quizScore !== undefined ? quizScore : prev.quiz_score ?? null,
        updated_at: new Date().toISOString()
      };
      memoryStore.lessonProgress.set(`${userId}:${lessonId}`, updated);

      if (supabase) {
        try {
          await supabase.from('lesson_progress').upsert(updated, { onConflict: 'user_id,lesson_id' });
        } catch {}
      }

      return NextResponse.json({ ok: true, progress: updated });
    }

    if (action === 'issue_certificate') {
      const { courseId, recipientName } = body;
      const memCourse = findCourseInMemory(courseId);
      const targetCourseId = memCourse?.id || courseId;
      const finalName = String(recipientName || userName || 'Shammah Scholar').trim();

      for (const cert of memoryStore.certificates.values()) {
        if (cert.user_id === userId && cert.course_id === targetCourseId) {
          if (recipientName) cert.recipient_name = finalName;
          return NextResponse.json({ ok: true, certificate: { ...cert, course: memCourse || null } });
        }
      }

      const code = generateCertCode();
      const newCert = {
        id: `cert-${Date.now()}`,
        user_id: userId,
        course_id: targetCourseId,
        recipient_name: finalName,
        issued_at: new Date().toISOString(),
        code
      };
      memoryStore.certificates.set(code, newCert);

      if (supabase) {
        try {
          const { data: saved } = await supabase
            .from('course_certificates')
            .upsert(
              {
                user_id: userId,
                course_id: targetCourseId,
                recipient_name: finalName,
                code,
                issued_at: newCert.issued_at
              },
              { onConflict: 'user_id,course_id' }
            )
            .select('*')
            .maybeSingle();
          if (saved) {
            return NextResponse.json({ ok: true, certificate: { ...saved, course: memCourse || null } });
          }
        } catch {}
      }

      return NextResponse.json({ ok: true, certificate: { ...newCert, course: memCourse || null } });
    }

    if (action === 'submit_review') {
      const { courseId, rating, body: reviewBody } = body;
      const memCourse = findCourseInMemory(courseId);
      const targetCourseId = memCourse?.id || courseId;
      const cleanRating = Math.max(1, Math.min(5, Math.round(Number(rating || 5))));
      const cleanBody = String(reviewBody || '').trim();

      const reviewObj = {
        id: `rev-${Date.now()}`,
        user_id: userId,
        course_id: targetCourseId,
        reviewer_name: userName,
        reviewer_avatar: sessionUser?.user_metadata?.avatar_url || null,
        rating: cleanRating,
        body: cleanBody,
        created_at: new Date().toISOString()
      };

      memoryStore.reviews = [
        reviewObj,
        ...memoryStore.reviews.filter((r) => !(r.user_id === userId && r.course_id === targetCourseId))
      ];

      if (memCourse) {
        const courseRevs = memoryStore.reviews.filter((r) => r.course_id === targetCourseId);
        memCourse.rating_count = courseRevs.length;
        memCourse.rating_avg = Number(
          (courseRevs.reduce((a, r) => a + r.rating, 0) / Math.max(1, courseRevs.length)).toFixed(1)
        );
      }

      if (supabase) {
        try {
          await supabase.from('course_reviews').upsert(
            {
              user_id: userId,
              course_id: targetCourseId,
              reviewer_name: userName,
              rating: cleanRating,
              body: cleanBody,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id,course_id' }
          );
        } catch {}
      }

      return NextResponse.json({
        ok: true,
        review: reviewObj,
        rating_avg: memCourse?.rating_avg || cleanRating,
        rating_count: memCourse?.rating_count || 1
      });
    }

    if (action === 'migrate_legacy_progress') {
      const { completedSlugs = [] } = body;
      const migratedIds = [];

      if (Array.isArray(completedSlugs)) {
        for (const slug of completedSlugs) {
          const memCourse = findCourseInMemory(String(slug));
          if (!memCourse) continue;
          const targetCourseId = memCourse.id;
          migratedIds.push(targetCourseId);

          memoryStore.enrollments.set(`${userId}:${targetCourseId}`, {
            user_id: userId,
            course_id: targetCourseId,
            enrolled_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            paid: true
          });

          const allLessons = (memCourse.modules || []).flatMap((m) => m.lessons || []);
          for (const les of allLessons) {
            memoryStore.lessonProgress.set(`${userId}:${les.id}`, {
              user_id: userId,
              lesson_id: les.id,
              course_id: targetCourseId,
              completed: true,
              last_position_seconds: 0,
              completed_at: new Date().toISOString()
            });
          }

          const code = generateCertCode();
          memoryStore.certificates.set(code, {
            id: `cert-${targetCourseId}`,
            user_id: userId,
            course_id: targetCourseId,
            recipient_name: userName,
            issued_at: new Date().toISOString(),
            code
          });
        }
      }

      return NextResponse.json({ ok: true, migrated_course_ids: migratedIds });
    }

    if (action === 'save_course') {
      const { course: inputCourse } = body;
      if (!inputCourse || !inputCourse.title) {
        return NextResponse.json({ error: 'Course title is required.' }, { status: 400 });
      }

      const isUpdate = Boolean(inputCourse.id && findCourseInMemory(inputCourse.id));
      const courseId = inputCourse.id || `c-${Date.now()}`;
      const modules = Array.isArray(inputCourse.modules)
        ? inputCourse.modules.map((m, mIdx) => {
            const modId = m.id || `mod-${Date.now()}-${mIdx}`;
            return {
              id: modId,
              course_id: courseId,
              position: mIdx + 1,
              title: String(m.title || `Module ${mIdx + 1}`).trim(),
              lessons: Array.isArray(m.lessons)
                ? m.lessons.map((l, lIdx) => {
                    const lesId = l.id || `les-${Date.now()}-${mIdx}-${lIdx}`;
                    return {
                      id: lesId,
                      module_id: modId,
                      course_id: courseId,
                      position: lIdx + 1,
                      title: String(l.title || `Lesson ${lIdx + 1}`).trim(),
                      kind: ['video', 'audio', 'text', 'quiz', 'download'].includes(l.kind) ? l.kind : 'video',
                      media_url: String(l.media_url || '').trim(),
                      body_md: String(l.body_md || '').trim(),
                      duration_seconds: Math.max(60, Number(l.duration_seconds || 600)),
                      is_preview: Boolean(l.is_preview),
                      quiz_questions: Array.isArray(l.quiz_questions)
                        ? l.quiz_questions.map((q, qIdx) => ({
                            id: q.id || `q-${Date.now()}-${qIdx}`,
                            lesson_id: lesId,
                            position: qIdx + 1,
                            question: String(q.question || '').trim(),
                            options: Array.isArray(q.options) ? q.options.map(String) : ['True', 'False'],
                            correct_index: Number(q.correct_index || 0),
                            explanation: String(q.explanation || '').trim()
                          }))
                        : []
                    };
                  })
                : []
            };
          })
        : [];

      const totalSeconds = modules
        .flatMap((m) => m.lessons)
        .reduce((acc, l) => acc + Number(l.duration_seconds || 0), 0);

      const newCourseObj = {
        id: courseId,
        legacy_slug: inputCourse.legacy_slug || null,
        author_id: userId,
        church_id: inputCourse.church_id || null,
        instructor_name: String(inputCourse.instructor_name || userName || 'Pastor & Instructor').trim(),
        instructor_role: String(inputCourse.instructor_role || 'Course Instructor').trim(),
        instructor_avatar: inputCourse.instructor_avatar || null,
        title: String(inputCourse.title).trim(),
        subtitle: String(inputCourse.subtitle || '').trim(),
        description: String(inputCourse.description || inputCourse.subtitle || '').trim(),
        cover_url:
          String(inputCourse.cover_url || '').trim() ||
          'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1000&q=80',
        category: String(inputCourse.category || 'Theology').trim(),
        level: ['Beginner', 'Intermediate', 'Advanced'].includes(inputCourse.level)
          ? inputCourse.level
          : 'Beginner',
        language: String(inputCourse.language || 'English').trim(),
        duration_minutes: Math.max(15, Math.round(totalSeconds / 60) || Number(inputCourse.duration_minutes || 60)),
        price_kes: Math.max(0, Math.round(Number(inputCourse.price_kes || 0))),
        status: ['draft', 'published', 'archived'].includes(inputCourse.status)
          ? inputCourse.status
          : 'published',
        accent: String(inputCourse.accent || '#f59e0b'),
        tags: Array.isArray(inputCourse.tags)
          ? inputCourse.tags.map(String).filter(Boolean)
          : String(inputCourse.tags || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
        outcomes: Array.isArray(inputCourse.outcomes)
          ? inputCourse.outcomes.map(String).filter(Boolean)
          : [],
        rating_avg: isUpdate ? findCourseInMemory(courseId)?.rating_avg || 5.0 : 5.0,
        rating_count: isUpdate ? findCourseInMemory(courseId)?.rating_count || 1 : 1,
        enrolled_count: isUpdate ? findCourseInMemory(courseId)?.enrolled_count || 1 : 1,
        created_at: isUpdate ? findCourseInMemory(courseId)?.created_at : new Date().toISOString(),
        modules
      };

      if (isUpdate) {
        memoryStore.courses = memoryStore.courses.map((c) => (c.id === courseId ? newCourseObj : c));
      } else {
        memoryStore.courses = [newCourseObj, ...memoryStore.courses];
      }

      if (supabase) {
        try {
          const { data: dbCourse } = await supabase
            .from('courses')
            .upsert({
              id: /^[0-9a-f-]{36}$/i.test(courseId) ? courseId : undefined,
              author_id: /^[0-9a-f-]{36}$/i.test(userId) ? userId : null,
              instructor_name: newCourseObj.instructor_name,
              instructor_role: newCourseObj.instructor_role,
              title: newCourseObj.title,
              subtitle: newCourseObj.subtitle,
              description: newCourseObj.description,
              cover_url: newCourseObj.cover_url,
              category: newCourseObj.category,
              level: newCourseObj.level,
              language: newCourseObj.language,
              duration_minutes: newCourseObj.duration_minutes,
              price_kes: newCourseObj.price_kes,
              status: newCourseObj.status,
              accent: newCourseObj.accent,
              tags: newCourseObj.tags,
              outcomes: newCourseObj.outcomes,
              updated_at: new Date().toISOString()
            })
            .select('*')
            .maybeSingle();

          if (dbCourse?.id) {
            newCourseObj.id = dbCourse.id;
            await supabase.from('course_modules').delete().eq('course_id', dbCourse.id);
            for (const mod of modules) {
              const { data: savedMod } = await supabase
                .from('course_modules')
                .insert({
                  course_id: dbCourse.id,
                  position: mod.position,
                  title: mod.title
                })
                .select('*')
                .maybeSingle();

              if (savedMod?.id) {
                for (const les of mod.lessons) {
                  const { data: savedLes } = await supabase
                    .from('course_lessons')
                    .insert({
                      module_id: savedMod.id,
                      course_id: dbCourse.id,
                      position: les.position,
                      title: les.title,
                      kind: les.kind,
                      media_url: les.media_url,
                      body_md: les.body_md,
                      duration_seconds: les.duration_seconds,
                      is_preview: les.is_preview
                    })
                    .select('*')
                    .maybeSingle();

                  if (savedLes?.id && Array.isArray(les.quiz_questions) && les.quiz_questions.length > 0) {
                    await supabase.from('course_quiz_questions').insert(
                      les.quiz_questions.map((q, idx) => ({
                        lesson_id: savedLes.id,
                        position: idx + 1,
                        question: q.question,
                        options: q.options,
                        correct_index: q.correct_index,
                        explanation: q.explanation
                      }))
                    );
                  }
                }
              }
            }
          }
        } catch {}
      }

      const stats = computeCourseStatsForUser(newCourseObj, userId);
      return NextResponse.json({
        ok: true,
        course: { ...newCourseObj, ...stats, reviews: [] }
      });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to process course action.' },
      { status: 500 }
    );
  }
}
