-- Seed: seed_section_content.sql
-- Idempotent initial seed data for Shammah faith community sections

-- 1. Courses Catalog
INSERT INTO public.courses (id, title, description, instructor, instructor_title, category, difficulty, estimated_hours, modules)
VALUES
  (
    'course-foundations',
    'Foundations of Believers: Walking in Kingdom Authority',
    'Deepen your understanding of salvation, the Holy Spirit, spiritual warfare, and righteousness in Christ.',
    'Pastor David Mwangi',
    'Senior Pastor, Grace Sanctuary Nairobi',
    'Discipleship',
    'Beginner',
    3,
    '[
      {
        "id": "mod-1",
        "title": "Module 1: The Authority of the Believer",
        "lessons": [
          {"id": "l-1-1", "title": "Lesson 1: In the Name of Jesus", "duration": 18},
          {"id": "l-1-2", "title": "Lesson 2: Wearing the Armor of God", "duration": 22}
        ]
      },
      {
        "id": "mod-2",
        "title": "Module 2: Walking by Faith, Not by Sight",
        "lessons": [
          {"id": "l-2-1", "title": "Lesson 3: The Shield of Faith", "duration": 25},
          {"id": "l-2-2", "title": "Lesson 4: Overcoming Doubt & Fear", "duration": 20}
        ]
      }
    ]'::jsonb
  ),
  (
    'course-prayer',
    'The Secret Place: Strategic Intercession & Prophetic Prayer',
    'Learn how to establish an unshakable prayer altar, discern the voice of the Spirit, and pray effectively for your family, church, and nation.',
    'Pastor Sarah Koech',
    'Director of Prayer, Deliverance Church Eldoret',
    'Prayer & Intercession',
    'Intermediate',
    4,
    '[
      {
        "id": "mod-p1",
        "title": "Module 1: Cultivating Intimacy",
        "lessons": [
          {"id": "l-p-1", "title": "Lesson 1: The Ministry of Abiding", "duration": 20},
          {"id": "l-p-2", "title": "Lesson 2: Praying in the Holy Ghost", "duration": 30}
        ]
      }
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Faith Challenges
INSERT INTO public.challenges (id, title, description, category, duration_days, participants_count)
VALUES
  (
    'chal-psalm91',
    '7-Day Psalm 91 Protection & Peace Consecration',
    'Meditate and speak Psalm 91 aloud every morning before leaving home. Declare God as your refuge and fortress.',
    'scripture',
    7,
    184
  ),
  (
    'chal-fasting',
    '21-Day Daniel Fast for National Revival & Youth Revival',
    'Dedicate personal meal times to corporate prayer and Bible reading, seeking God for spiritual awakening.',
    'fasting',
    21,
    312
  ),
  (
    'chal-proverbs',
    '31-Day Wisdom Walk Through the Book of Proverbs',
    'Read the chapter corresponding to the day of the month. Gain divine wisdom for leadership, finances, and relationships.',
    'scripture',
    30,
    94
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Verified Church Fundraisers
INSERT INTO public.fundraisers (id, title, description, church_name, category, target_amount, raised_amount, donors_count, verified)
VALUES
  (
    'fund-sanctuary-roof',
    'Mavuno South Sanctuary Roof & Acoustic Project',
    'Supporting the roofing and sound treatment for the new 1,500-seat sanctuary in Kitengela.',
    'Mavuno Church South Campus',
    'Church Building',
    1500000.00,
    920400.00,
    184,
    true
  ),
  (
    'fund-turkana-borehole',
    'Turkana Clean Water & Gospel Well Project',
    'Drilling a solar-powered borehole providing clean drinking water alongside gospel outreach to Turkana pastoralist communities.',
    'Deliverance Church Mission Board',
    'Missions & Outreach',
    750000.00,
    582000.00,
    129,
    true
  ),
  (
    'fund-youth-camp',
    'Annual High School Discipleship Camp Scholarships',
    'Sponsoring underprivileged high school students for a week of mentorship, Bible camp, and career guidance in Naivasha.',
    'CITAM Valley Road Youth Ministry',
    'Youth & Children',
    300000.00,
    214500.00,
    76,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Media Items
INSERT INTO public.media_items (id, title, description, speaker_name, church_name, media_type, category, url, duration, views_count, likes_count)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Walking in the Power of the Holy Spirit: Midweek Encounter',
    'A powerful message on receiving and maintaining the tangible presence and fresh anointing of God in your daily walk.',
    'Apostle James Kimani',
    'House of Grace Sanctuary',
    'video',
    'Sermons',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    2100,
    3420,
    145
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Spontaneous Acoustic Worship: Kenya Praise Altar',
    'Gentle acoustic strings and spontaneous prayers recorded live during evening prayer fellowship.',
    'Shammah Worship Collective',
    'CITAM Woodley',
    'audio',
    'Worship',
    'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
    1840,
    1980,
    88
  )
ON CONFLICT (id) DO NOTHING;
