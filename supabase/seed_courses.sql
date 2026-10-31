-- =============================================================================
-- Shammah Seed File: supabase/seed_courses.sql
-- Purpose: Seeds the 5 Discipleship & Leadership courses from COURSES_CATALOG
--          with modules, multi-modal lessons (video, audio, text, quiz, download),
--          quiz questions, and sample reviews.
-- Safe to run multiple times (100% idempotent via ON CONFLICT DO UPDATE).
-- =============================================================================

DO $$
DECLARE
  v_author_id uuid;
  v_church_id uuid;
BEGIN
  SELECT id, church_id INTO v_author_id, v_church_id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;

  -- ===========================================================================
  -- 1. COURSES
  -- ===========================================================================
  INSERT INTO public.courses (
    id, slug, author_id, church_id, title, subtitle, description, cover_url,
    category, level, language, duration_minutes, price_kes, status, accent,
    tags, outcomes, instructor_name, instructor_avatar, instructor_badge,
    church_name, certificate_title, badge_icon, badge_name,
    rating_avg, rating_count, enrolled_count, created_at
  )
  VALUES
    (
      'a1000000-0000-0000-0000-000000000001',
      'course-foundations',
      v_author_id,
      v_church_id,
      'Foundations of Faith: The Pillars of New Covenant Believers',
      'A 5-module biblical immersion into salvation by grace, spiritual authority, and daily communion with God.',
      'Master the core truths of salvation by grace, believer authority in Christ, water baptism, the Holy Spirit baptism, and continuous communion with God.',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900&auto=format&fit=crop&q=80',
      'discipleship',
      'Foundational',
      'English',
      149,
      0,
      'published',
      '#06b6d4',
      ARRAY['Salvation', 'Holy Spirit', 'Discipleship', 'New Covenant'],
      ARRAY[
        'Understand eternal assurance of salvation through Ephesians 2:8-10 and Romans 8',
        'Walk in the delegated authority of the believer in Christ (Luke 10:19)',
        'Cultivate an unbroken daily prayer and Word rhythm',
        'Operate in the baptism and gifts of the Holy Spirit for church edification'
      ],
      'Pastor David Mwangi',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      'pastor',
      'Nairobi Chapel & Fellowship',
      'Pillars of Faith Foundation Certificate',
      '🔥',
      'Faith Foundation Pillar',
      4.90,
      42,
      248,
      now() - interval '14 days'
    ),
    (
      'a1000000-0000-0000-0000-000000000002',
      'course-intercession',
      v_author_id,
      v_church_id,
      'Spiritual Warfare & Intercession: Guarding the City Gates',
      'Biblical protocols of intercessory prayer watches, spiritual armor, and fasting for breakthrough.',
      'Learn biblical protocols of spiritual warfare, binding and loosing, prayer vigils, praying scripture, and cultivating acute sensitivity to the Holy Spirit.',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&auto=format&fit=crop&q=80',
      'prayer',
      'Intermediate',
      'English & Swahili',
      88,
      0,
      'published',
      '#8b5cf6',
      ARRAY['Intercession', 'Spiritual Warfare', 'Prayer Watches', 'Fasting'],
      ARRAY[
        'Put on every piece of the Armor of God in Ephesians 6 with scriptural precision',
        'Establish effective midnight and dawn prayer watches for family and city',
        'Practice Isaiah 58 biblical fasting for spiritual breakthrough'
      ],
      'Sister Esther Wanjiku',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      'intercessor',
      'Mavuno City Church',
      'Watchman Intercession & Warfare Diploma',
      '🛡️',
      'City Gate Watchman',
      4.85,
      31,
      182,
      now() - interval '10 days'
    ),
    (
      'a1000000-0000-0000-0000-000000000003',
      'course-leadership',
      v_author_id,
      v_church_id,
      'Kingdom Leadership: Servant Heart & Pastoral Wisdom',
      'Executive ministry training for elders, deacons, home cell shepherds, and emerging church leaders.',
      'Essential leadership training for elders, deacons, cell group shepherds, and ministry coordinators. Conflict resolution, delegation, and mentoring emerging ministers.',
      'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=900&auto=format&fit=crop&q=80',
      'leadership',
      'Advanced',
      'English',
      158,
      1500,
      'published',
      '#f59e0b',
      ARRAY['Leadership', 'Pastoral Care', 'Church Governance', 'Stewardship'],
      ARRAY[
        'Model Christ-like servant shepherd leadership from 1 Peter 5:1-4',
        'Navigate church growth transitions and resolve conflict in unity',
        'Preach and teach with spiritual authority and sound exegesis',
        'Institute transparent financial stewardship and church administration'
      ],
      'Bishop Sarah Ndung''u',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      'bishop',
      'Christ Is The Answer Ministries',
      'Executive Kingdom Leadership Credential',
      '👑',
      'Servant Shepherd Leader',
      4.95,
      27,
      134,
      now() - interval '7 days'
    ),
    (
      'a1000000-0000-0000-0000-000000000004',
      'course-marriage',
      v_author_id,
      v_church_id,
      'Covenant Marriage: Building Christ-Centered Homes',
      'Practical biblical blueprints for courtship, lifelong marriage intimacy, and godly parenting.',
      'Biblical blueprints for lifelong marital intimacy, raising godly children, transparent communication, and overcoming financial and emotional hurdles.',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&auto=format&fit=crop&q=80',
      'marriage',
      'Foundational',
      'English',
      92,
      0,
      'published',
      '#ec4899',
      ARRAY['Marriage', 'Family', 'Courtship', 'Finances'],
      ARRAY[
        'Distinguish between a biblical covenant and a worldly contract in marriage',
        'Practice James 1:19 communication, emotional healing, and quick forgiveness',
        'Build a unified family budget rooted in Proverbs 3 stewardship'
      ],
      'Rev. Timothy & Janet Kariuki',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'pastor',
      'All Saints Cathedral',
      'Kingdom Family & Covenant Marriage Award',
      '💍',
      'Covenant Marriage Builder',
      4.88,
      54,
      310,
      now() - interval '5 days'
    ),
    (
      'a1000000-0000-0000-0000-000000000005',
      'course-worship',
      v_author_id,
      v_church_id,
      'Prophetic Worship & Atmosphere: Leading Congregational Praise',
      'Equipping worship leaders, vocalists, and instrumentalists to minister in Spirit and in Truth.',
      'Flow in the Holy Spirit during corporate worship, sensitivity to the prophetic song, spiritual preparation, and songwriting for church revival.',
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=900&auto=format&fit=crop&q=80',
      'worship',
      'Intermediate',
      'English & Swahili',
      68,
      800,
      'published',
      '#10b981',
      ARRAY['Worship', 'Choir', 'Prophetic Praise', 'Songwriting'],
      ARRAY[
        'Lead congregational worship anchored in John 4:23-24 consecration',
        'Cultivate sensitivity to spontaneous prophetic songs and scripture singing',
        'Organize effective vocal and band rehearsals that honor the presence of God'
      ],
      'Minister Mercy Masika & Worship Team',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'worship',
      'Jubilee Christian Church',
      'Prophetic Worship Leader Certificate',
      '🕊️',
      'Prophetic Atmosphere Builder',
      4.92,
      38,
      220,
      now() - interval '2 days'
    )
  ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    cover_url = EXCLUDED.cover_url,
    category = EXCLUDED.category,
    level = EXCLUDED.level,
    language = EXCLUDED.language,
    duration_minutes = EXCLUDED.duration_minutes,
    price_kes = EXCLUDED.price_kes,
    accent = EXCLUDED.accent,
    tags = EXCLUDED.tags,
    outcomes = EXCLUDED.outcomes,
    instructor_name = EXCLUDED.instructor_name,
    instructor_avatar = EXCLUDED.instructor_avatar,
    instructor_badge = EXCLUDED.instructor_badge,
    church_name = EXCLUDED.church_name,
    certificate_title = EXCLUDED.certificate_title,
    badge_icon = EXCLUDED.badge_icon,
    badge_name = EXCLUDED.badge_name;

  -- ===========================================================================
  -- 2. COURSE MODULES
  -- ===========================================================================
  INSERT INTO public.course_modules (id, course_id, position, title)
  VALUES
    -- Course 1: Foundations of Faith
    ('b1000001-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 0, 'Module 1: The Assurance of Eternal Salvation'),
    ('b1000001-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 1, 'Module 2: The Authority of the Believer in Christ'),
    ('b1000001-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 2, 'Module 3: Walking in Communion, Holy Spirit & Assessment'),

    -- Course 2: Spiritual Warfare & Intercession
    ('b1000002-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 0, 'Module 1: The Armor of God in Ephesians 6'),
    ('b1000002-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 1, 'Module 2: Strategic Prayer Watches & Fasting Breakthrough'),

    -- Course 3: Kingdom Leadership (Paid KES 1,500)
    ('b1000003-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 0, 'Module 1: The Heart of a Servant Shepherd'),
    ('b1000003-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 1, 'Module 2: Church Transitions, Preaching & Integrity'),

    -- Course 4: Covenant Marriage
    ('b1000004-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 0, 'Module 1: Covenant vs Contract in Christian Marriage'),
    ('b1000004-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 1, 'Module 2: Communication, Forgiveness & Kingdom Finances'),

    -- Course 5: Prophetic Worship (Paid KES 800)
    ('b1000005-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 0, 'Module 1: Worship in Spirit and in Truth'),
    ('b1000005-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 1, 'Module 2: The New Song & Spontaneous Praise')
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    position = EXCLUDED.position;

  -- ===========================================================================
  -- 3. COURSE LESSONS (video, audio, text, quiz, download)
  -- ===========================================================================
  INSERT INTO public.course_lessons (
    id, module_id, course_id, position, title, kind, media_url, body_md,
    scripture_ref, duration_seconds, is_preview
  )
  VALUES
    -- Course 1 Lessons
    (
      'e1000001-0000-0000-0000-000000000001',
      'b1000001-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000001',
      0,
      'Saved by Grace Through Faith (Video Teaching)',
      'video',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      E'### The Gift of Eternal Salvation\n\n**Scripture Anchor:** *Ephesians 2:8–10 · Romans 8:38–39*\n\nSalvation is a gift received by faith, not earned by human works. When a person believes in the finished work of Jesus Christ on the cross, God seals them with the Holy Spirit of promise.\n\n#### Key Takeaways\n1. **Justification** — Declared righteous before God the Father.\n2. **Regeneration** — Born of the Spirit into a new creation (*2 Corinthians 5:17*).\n3. **Adoption** — Welcomed as sons and daughters who cry *"Abba, Father."*',
      'Ephesians 2:8-10 · Romans 8:38-39',
      720,
      true
    ),
    (
      'e1000001-0000-0000-0000-000000000002',
      'b1000001-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000001',
      1,
      'Seated with Christ: Believer''s Authority Study Guide',
      'text',
      null,
      E'### Understanding Your Delegated Authority in Christ\n\n**Scripture Anchor:** *Luke 10:19 · Ephesians 1:19–23 · Ephesians 2:6*\n\n> "Behold, I give you the authority to trample on serpents and scorpions, and over all the power of the enemy, and nothing shall by any means hurt you." — **Luke 10:19**\n\n#### 1. The Source of Authority\nJesus rose from the dead and was seated at the right hand of the Father, far above all principality and power. Because we are in Christ, we are seated with Him in heavenly places.\n\n#### 2. Speaking the Word in Faith\nBelievers exercise spiritual authority through prayer, proclamation of Scripture, and obedient living.',
      'Luke 10:19 · Ephesians 1:19-23',
      600,
      true
    ),
    (
      'e1000001-0000-0000-0000-000000000003',
      'b1000001-0000-0000-0000-000000000002',
      'a1000000-0000-0000-0000-000000000001',
      0,
      'Walking in Daily Communion & Prayer (Audio Devotional)',
      'audio',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      E'### Abiding in the True Vine\n\n**Scripture Anchor:** *John 15:5–7 · 1 Thessalonians 5:16–18*\n\nCommunion with the Holy Spirit is not restricted to Sunday morning service—it is a continuous, living awareness of God''s presence throughout every hour of your day.',
      'John 15:5-7 · 1 Thessalonians 5:16-18',
      840,
      false
    ),
    (
      'e1000001-0000-0000-0000-000000000004',
      'b1000001-0000-0000-0000-000000000003',
      'a1000000-0000-0000-0000-000000000001',
      0,
      'Downloadable New Believer Scripture Memory Handbook',
      'download',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      E'### 30 Essential Scriptures for Every Believer\n\nDownload this printable handbook for your personal devotion or home cell discipleship group. Includes memory verses on salvation, healing, peace, and the Holy Spirit.',
      'Acts 1:8 · 1 Corinthians 12:4-11',
      300,
      false
    ),
    (
      'e1000001-0000-0000-0000-000000000005',
      'b1000001-0000-0000-0000-000000000003',
      'a1000000-0000-0000-0000-000000000001',
      1,
      'Foundations of Faith Final Mastery Quiz',
      'quiz',
      null,
      E'Complete this doctrinal check to verify your mastery of the 5 Pillars of New Covenant Faith and unlock your official certificate.',
      '2 Timothy 2:15',
      420,
      false
    ),

    -- Course 2 Lessons: Spiritual Warfare
    (
      'e1000002-0000-0000-0000-000000000001',
      'b1000002-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000002',
      0,
      'The Whole Armor of God in Ephesians 6 (Video)',
      'video',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      E'### Standing Firm Against Spiritual Schemes\n\n**Scripture Anchor:** *Ephesians 6:10–18*\n\nWe do not wrestle against flesh and blood, but against principalities and powers. Every piece of armor—Truth, Righteousness, Peace, Faith, Salvation, and the Word—points to Jesus Christ.',
      'Ephesians 6:10-18',
      900,
      true
    ),
    (
      'e1000002-0000-0000-0000-000000000002',
      'b1000002-0000-0000-0000-000000000002',
      'a1000000-0000-0000-0000-000000000002',
      0,
      'Strategic Prayer Watches & Isaiah 58 Fasting',
      'text',
      null,
      E'### Guarding the Gates Through Night & Dawn Watches\n\n**Scripture Anchor:** *Psalm 63:1 · Lamentations 2:19 · Isaiah 58:6–12*\n\n1. **First Watch (6 PM – 9 PM):** Quiet reflection and family altar.\n2. **Midnight Watch (12 AM – 3 AM):** Spiritual warfare and breaking chains (*Acts 16:25*).\n3. **Morning Watch (3 AM – 6 AM):** Commanding the morning and interceding for the nation.',
      'Isaiah 58:6-12 · Lamentations 2:19',
      780,
      false
    ),
    (
      'e1000002-0000-0000-0000-000000000003',
      'b1000002-0000-0000-0000-000000000002',
      'a1000000-0000-0000-0000-000000000002',
      1,
      'Watchman Intercession Assessment Quiz',
      'quiz',
      null,
      E'Test your understanding of Ephesians 6 spiritual armor and biblical fasting.',
      'Ephesians 6:17',
      360,
      false
    ),

    -- Course 3 Lessons: Kingdom Leadership (Paid KES 1,500)
    (
      'e1000003-0000-0000-0000-000000000001',
      'b1000003-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000003',
      0,
      'The Heart of a Servant Shepherd (Preview Lecture)',
      'video',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      E'### Leading Like Jesus\n\n**Scripture Anchor:** *1 Peter 5:1–4 · Mark 10:42–45*\n\nKingdom leadership is never about title or domination—it is about washing feet, feeding the flock willingly, and being an example to the believers.',
      '1 Peter 5:1-4 · Mark 10:42-45',
      1200,
      true
    ),
    (
      'e1000003-0000-0000-0000-000000000002',
      'b1000003-0000-0000-0000-000000000002',
      'a1000000-0000-0000-0000-000000000003',
      0,
      'Financial Integrity, Governance & Pastoral Ethics',
      'text',
      null,
      E'### Above Reproach in Ministry Administration\n\n**Scripture Anchor:** *2 Corinthians 8:20–21 · 1 Timothy 3:1–7*\n\n> "Taking precaution that no one will discredit us in our administration of this generous gift; for we have regard for what is honorable, not only in the sight of the Lord, but also in the sight of men." — **2 Corinthians 8:20–21**',
      '2 Corinthians 8:20-21 · 1 Timothy 3:1-7',
      1080,
      false
    ),
    (
      'e1000003-0000-0000-0000-000000000003',
      'b1000003-0000-0000-0000-000000000002',
      'a1000000-0000-0000-0000-000000000003',
      1,
      'Executive Leadership Certification Quiz',
      'quiz',
      null,
      E'Complete the pastoral leadership assessment to earn your Executive Kingdom Leadership Credential.',
      '1 Peter 5:2-3',
      480,
      false
    ),

    -- Course 4 Lessons: Covenant Marriage
    (
      'e1000004-0000-0000-0000-000000000001',
      'b1000004-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000004',
      0,
      'Covenant vs Contract in Christian Marriage (Video)',
      'video',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoy.mp4',
      E'### God''s Design for Covenant Union\n\n**Scripture Anchor:** *Genesis 2:24 · Ephesians 5:21–33*\n\nA contract protects self-interest and looks for exit clauses; a covenant lays down its life in unconditional agape love, mirroring Christ and the Church.',
      'Genesis 2:24 · Ephesians 5:21-33',
      900,
      true
    ),
    (
      'e1000004-0000-0000-0000-000000000002',
      'b1000004-0000-0000-0000-000000000002',
      'a1000000-0000-0000-0000-000000000004',
      0,
      'Communication, Quick Forgiveness & Family Finances',
      'text',
      null,
      E'### Building Peace and Unity in the Home\n\n**Scripture Anchor:** *Colossians 3:12–14 · James 1:19 · Proverbs 3:9–10*\n\n1. **Quick to Hear, Slow to Speak:** Listen to understand your spouse''s heart before responding.\n2. **Never Let the Sun Go Down on Wrath:** Keep short accounts and forgive daily.\n3. **Unified Stewardship:** Budget together transparently as one flesh.',
      'Colossians 3:12-14 · James 1:19',
      840,
      false
    ),

    -- Course 5 Lessons: Prophetic Worship (Paid KES 800)
    (
      'e1000005-0000-0000-0000-000000000001',
      'b1000005-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000005',
      0,
      'Worship in Spirit and in Truth (Audio Masterclass)',
      'audio',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      E'### The Heart of the True Worshiper\n\n**Scripture Anchor:** *John 4:23–24 · Psalm 100*\n\nTrue prophetic worship flows from private intimacy with the Father long before stepping onto the sanctuary platform.',
      'John 4:23-24 · Psalm 100',
      960,
      true
    ),
    (
      'e1000005-0000-0000-0000-000000000002',
      'b1000005-0000-0000-0000-000000000002',
      'a1000000-0000-0000-0000-000000000005',
      0,
      'The New Song & Prophetic Spontaneous Praise',
      'text',
      null,
      E'### Singing the Scriptures Over the Congregation\n\n**Scripture Anchor:** *Psalm 40:3 · Revelation 5:9 · Colossians 3:16*\n\nLearn how to transition smoothly from structured worship anthems into spontaneous scripture-based ministration.',
      'Psalm 40:3 · Revelation 5:9',
      900,
      false
    )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    kind = EXCLUDED.kind,
    media_url = EXCLUDED.media_url,
    body_md = EXCLUDED.body_md,
    scripture_ref = EXCLUDED.scripture_ref,
    duration_seconds = EXCLUDED.duration_seconds,
    is_preview = EXCLUDED.is_preview;

  -- ===========================================================================
  -- 4. COURSE QUIZ QUESTIONS
  -- ===========================================================================
  INSERT INTO public.course_quiz_questions (
    id, lesson_id, position, question, options, correct_index, explanation
  )
  VALUES
    (
      'f1000001-0000-0000-0000-000000000001',
      'e1000001-0000-0000-0000-000000000005',
      0,
      'According to Ephesians 2:8-9, how is a person saved?',
      '["By keeping the ceremonial law perfectly", "By grace through faith, as a gift of God, not of works", "By church attendance and charitable giving alone", "By human philosophical wisdom"]'::jsonb,
      1,
      'Ephesians 2:8-9 declares: "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, lest anyone should boast."'
    ),
    (
      'f1000001-0000-0000-0000-000000000002',
      'e1000001-0000-0000-0000-000000000005',
      1,
      'In Luke 10:19, what has Jesus given believers authority over?',
      '["Earthly political kingdoms", "Angels in heaven", "All the power of the enemy, so that nothing shall by any means hurt them", "Other believers in the church"]'::jsonb,
      2,
      'Luke 10:19 confirms that Jesus delegates authority to believers over all the power of the enemy.'
    ),
    (
      'f1000002-0000-0000-0000-000000000001',
      'e1000002-0000-0000-0000-000000000003',
      0,
      'In Ephesians 6:17, which piece of the Armor of God is explicitly called the Word of God?',
      '["The Shield of Faith", "The Breastplate of Righteousness", "The Sword of the Spirit", "The Helmet of Salvation"]'::jsonb,
      2,
      'Ephesians 6:17 states: "And take the helmet of salvation, and the sword of the Spirit, which is the word of God."'
    ),
    (
      'f1000003-0000-0000-0000-000000000001',
      'e1000003-0000-0000-0000-000000000003',
      0,
      'According to 1 Peter 5:2-3, how should elders shepherd the flock of God?',
      '["By compulsion and lording over those entrusted to them", "Willingly, eagerly, and by being examples to the flock", "By delegating all pastoral care to external committees", "Only when compensated with high honors"]'::jsonb,
      1,
      '1 Peter 5:2-3 instructs elders to shepherd the flock willingly, not for dishonest gain, nor lording over them, but being examples to the flock.'
    )
  ON CONFLICT (id) DO UPDATE SET
    question = EXCLUDED.question,
    options = EXCLUDED.options,
    correct_index = EXCLUDED.correct_index,
    explanation = EXCLUDED.explanation;

END $$;
