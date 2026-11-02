begin;

insert into public.reading_plans (id, title, description, days, kind, accent)
values
  ('bible-in-a-year','Bible in a Year','A steady journey through the whole story of Scripture.',365,'canonical','#0d9488'),
  ('new-testament-90','New Testament in 90 Days','Read the life of Jesus, the early church, and the letters.',90,'canonical','#06b6d4'),
  ('psalms-proverbs','Psalms and Proverbs','Build a daily rhythm of prayer, worship, and wisdom.',31,'devotional','#8b5cf6'),
  ('gospels-30','The Gospels in 30 Days','Walk through the four Gospel accounts of Jesus.',30,'gospel','#10b981'),
  ('advent','Advent: Hope and Promise','A 25-day journey through the promises and arrival of Christ.',25,'seasonal','#f59e0b'),
  ('prayer','21 Days of Prayer','Scripture-guided reflection for a deeper prayer life.',21,'devotional','#ec4899')
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
    when 'advent' then (array['Isaiah 9:2-7','Isaiah 11:1-10','Micah 5:2-5','Luke 1:26-38','Luke 1:39-56','Matthew 1:18-25','Luke 2:1-7','Luke 2:8-20','Matthew 2:1-12','John 1:1-14'])[((d.day - 1) % 10) + 1]
    when 'prayer' then (array['Matthew 6:5-13','Psalm 23','Philippians 4:4-9','James 5:13-18','1 Thessalonians 5:16-24','Psalm 51','Luke 11:1-13'])[((d.day - 1) % 7) + 1]
    when 'new-testament-90' then (array['Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'])[((d.day - 1) % 27) + 1] || ' 1'
    else (array['Genesis 1','Psalm 1','Matthew 1','John 1','Romans 1','Revelation 1'])[((d.day - 1) % 6) + 1]
  end
)
from public.reading_plans p
cross join lateral generate_series(1, p.days) as d(day)
on conflict (plan_id, day) do update set refs = excluded.refs;

insert into public.verse_of_day (day, ref, translation)
values (current_date, 'Psalm 23:1', 'KJV')
on conflict (day) do nothing;

commit;
