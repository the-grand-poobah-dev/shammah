begin;

insert into public.reading_plans (id, title, description, days, kind, accent)
values
  ('bible-year','Bible in a Year','A steady journey through the whole story of Scripture.',365,'canonical','#0d9488'),
  ('nt-90','New Testament in 90 Days','Read the life of Jesus, the early church, and the letters.',90,'canonical','#06b6d4'),
  ('psalms-proverbs','Psalms and Proverbs','Build a daily rhythm of prayer, worship, and wisdom.',60,'devotional','#8b5cf6'),
  ('gospels-30','The Gospels in 30 Days','Walk through the four Gospel accounts of Jesus.',30,'gospel','#10b981'),
  ('advent-hope','Advent: Hope and Promise','A 25-day journey through the promises and arrival of Christ.',25,'seasonal','#f59e0b'),
  ('prayer-power','21 Days of Prayer','Scripture-guided reflection for a deeper prayer life.',21,'devotional','#ec4899')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  days = excluded.days,
  kind = excluded.kind,
  accent = excluded.accent;

insert into public.reading_plan_days (plan_id, day, refs)
select p.id, d.day, jsonb_build_array(
  case p.id
    when 'psalms-proverbs' then case when d.day % 2 = 0 then 'Proverbs ' || least(d.day,31) else 'Psalms ' || least(d.day,150) end
    when 'gospels-30' then (array['Matthew','Mark','Luke','John'])[((d.day - 1) % 4) + 1] || ' ' || (((d.day - 1) % 28) + 1)
    when 'advent-hope' then (array['Isaiah 9:2-7','Isaiah 11:1-10','Micah 5:2-5','Luke 1:26-38','Luke 1:39-56','Matthew 1:18-25','Luke 2:1-7','Luke 2:8-20','Matthew 2:1-12','John 1:1-14'])[((d.day - 1) % 10) + 1]
    when 'prayer-power' then (array['Matthew 6:5-13','Psalm 23','Philippians 4:4-9','James 5:13-18','1 Thessalonians 5:16-24','Psalm 51','Luke 11:1-13'])[((d.day - 1) % 7) + 1]
    when 'nt-90' then (array['Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'])[((d.day - 1) % 27) + 1] || ' 1'
    else (array['Genesis 1','Psalm 1','Matthew 1','John 1','Romans 1','Revelation 1'])[((d.day - 1) % 6) + 1]
  end
)
from public.reading_plans p
cross join lateral generate_series(1, p.days) as d(day)
on conflict (plan_id, day) do update set refs = excluded.refs;

update public.reading_plan_days set refs = jsonb_build_array(to_jsonb('Psalms ' || day), to_jsonb('Proverbs ' || (((day - 1) % 31) + 1))) where plan_id = 'psalms-proverbs';

-- Replace placeholder rotations with complete chapter-by-chapter schedules.
with book_catalog(book_order, book_name, chapter_count, testament) as (
  values
  (1,'Genesis',50,'OT'),(2,'Exodus',40,'OT'),(3,'Leviticus',27,'OT'),(4,'Numbers',36,'OT'),(5,'Deuteronomy',34,'OT'),
  (6,'Joshua',24,'OT'),(7,'Judges',21,'OT'),(8,'Ruth',4,'OT'),(9,'1 Samuel',31,'OT'),(10,'2 Samuel',24,'OT'),
  (11,'1 Kings',22,'OT'),(12,'2 Kings',25,'OT'),(13,'1 Chronicles',29,'OT'),(14,'2 Chronicles',36,'OT'),(15,'Ezra',10,'OT'),
  (16,'Nehemiah',13,'OT'),(17,'Esther',10,'OT'),(18,'Job',42,'OT'),(19,'Psalms',150,'OT'),(20,'Proverbs',31,'OT'),
  (21,'Ecclesiastes',12,'OT'),(22,'Song of Solomon',8,'OT'),(23,'Isaiah',66,'OT'),(24,'Jeremiah',52,'OT'),(25,'Lamentations',5,'OT'),
  (26,'Ezekiel',48,'OT'),(27,'Daniel',12,'OT'),(28,'Hosea',14,'OT'),(29,'Joel',3,'OT'),(30,'Amos',9,'OT'),
  (31,'Obadiah',1,'OT'),(32,'Jonah',4,'OT'),(33,'Micah',7,'OT'),(34,'Nahum',3,'OT'),(35,'Habakkuk',3,'OT'),
  (36,'Zephaniah',3,'OT'),(37,'Haggai',2,'OT'),(38,'Zechariah',14,'OT'),(39,'Malachi',4,'OT'),
  (40,'Matthew',28,'NT'),(41,'Mark',16,'NT'),(42,'Luke',24,'NT'),(43,'John',21,'NT'),(44,'Acts',28,'NT'),
  (45,'Romans',16,'NT'),(46,'1 Corinthians',16,'NT'),(47,'2 Corinthians',13,'NT'),(48,'Galatians',6,'NT'),(49,'Ephesians',6,'NT'),
  (50,'Philippians',4,'NT'),(51,'Colossians',4,'NT'),(52,'1 Thessalonians',5,'NT'),(53,'2 Thessalonians',3,'NT'),
  (54,'1 Timothy',6,'NT'),(55,'2 Timothy',4,'NT'),(56,'Titus',3,'NT'),(57,'Philemon',1,'NT'),(58,'Hebrews',13,'NT'),
  (59,'James',5,'NT'),(60,'1 Peter',5,'NT'),(61,'2 Peter',3,'NT'),(62,'1 John',5,'NT'),(63,'2 John',1,'NT'),
  (64,'3 John',1,'NT'),(65,'Jude',1,'NT'),(66,'Revelation',22,'NT')
),
plan_books(plan_id, plan_days, book_order, book_name, chapter_count) as (
  select 'bible-year', 365, book_order, book_name, chapter_count from book_catalog
  union all
  select 'nt-90', 90, book_order, book_name, chapter_count from book_catalog where testament = 'NT'
  union all
  select 'gospels-30', 30, book_order, book_name, chapter_count from book_catalog where book_order between 40 and 43
),
chapters as (
  select p.plan_id, p.plan_days, p.book_order, p.book_name, ch.chapter,
    row_number() over (partition by p.plan_id order by p.book_order, ch.chapter) as seq,
    count(*) over (partition by p.plan_id) as total
  from plan_books p
  cross join lateral generate_series(1, p.chapter_count) as ch(chapter)
),
daily as (
  select plan_id,
    ceil(seq * plan_days::numeric / total)::integer as day,
    jsonb_agg(to_jsonb(book_name || ' ' || chapter) order by seq) as refs
  from chapters
  group by plan_id, ceil(seq * plan_days::numeric / total)
)
update public.reading_plan_days d
set refs = daily.refs
from daily
where d.plan_id = daily.plan_id and d.day = daily.day;

insert into public.verse_of_day (day, ref, translation, text)
values (current_date, 'Psalm 23:1', 'KJV', 'The LORD is my shepherd; I shall not want.')
on conflict (day) do nothing;

commit;
