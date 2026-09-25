-- Kletos database schema — run this in Supabase's SQL Editor (Dashboard > SQL Editor > New query)

create table categories (
  id text primary key,            -- e.g. 'prayer', 'teen'
  name text not null
);

insert into categories (id, name) values
 ('lessons','Lessons & Icebreakers'),('stories','Stories & Experiences'),
 ('podcasts','Podcasts & Videos'),('events','Events'),('involved','Get Involved'),
 ('resources','Resources'),('parent','Parent Corner'),('worship','Worship & Creative Arts'),
 ('teen','Teen Talks'),('kids','Kids'' Corner'),('volunteer','Volunteer Spotlight'),
 ('hacks','Ministry Hacks'),('prayer','Prayer Requests & Praise Reports'),
 ('seasonal','Seasonal Specials'),('faq','FAQ for Parents/Volunteers'),('field','From the Mission Field');

create table churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  subscription_status text default 'unpaid',  -- unpaid | trial | active
  onboarded_at timestamptz
);

-- one row per person (extends Supabase's built-in auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text default 'member',          -- member | church_admin | platform_admin
  church_id uuid references churches(id),
  created_at timestamptz default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete cascade,
  church_id uuid references churches(id),
  category_id text references categories(id) not null,
  text_content text,
  media_url text,             -- Supabase Storage URL, if any
  media_type text,            -- 'image' | 'video' | 'audio' | null
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id) not null,
  amount_kes integer not null,
  mpesa_receipt text,
  phone text,
  status text default 'pending',   -- pending | confirmed | failed
  created_at timestamptz default now()
);

-- Row Level Security: posts are readable by anyone signed in, writable only by their author
alter table posts enable row level security;
create policy "posts are readable by signed-in users" on posts for select using (auth.role() = 'authenticated');
create policy "users can insert their own posts" on posts for insert with check (auth.uid() = author_id);

alter table profiles enable row level security;
create policy "profiles are readable by signed-in users" on profiles for select using (auth.role() = 'authenticated');
create policy "users manage their own profile" on profiles for update using (auth.uid() = id);
