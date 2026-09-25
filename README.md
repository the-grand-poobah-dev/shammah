# Kletos — real app scaffold

## What's here
- `supabase/schema.sql` — run this once in Supabase's SQL Editor to create your database
- `app/page.js` — the live feed, reading real posts from Supabase
- `app/api/mpesa/stkpush/route.js` — real M-Pesa Daraja STK Push (server-side, sandbox by default)
- `lib/supabaseClient.js` — connects the app to your Supabase project

## Setup (do this once)
1. Create your Supabase project, then in the SQL Editor, paste and run `supabase/schema.sql`.
2. In Supabase > Project Settings > API, copy your Project URL and anon public key.
3. In this folder, create a file called `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Open a terminal in this folder and run:
   ```
   npm install
   npm run dev
   ```
   Open http://localhost:3000 — you should see an empty feed (that's correct, no posts yet).
5. To test the feed, add one row in Supabase's Table Editor under `posts` (pick any `category_id` from the `categories` table) and refresh the page.

## Going live
1. Push this folder to your GitHub repo (`git init`, `git add .`, `git commit -m "kletos scaffold"`, then follow GitHub's instructions to push).
2. In Vercel, import the repo. Add the same `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Environment Variables in the Vercel project settings, plus the `MPESA_*` variables once you have Daraja sandbox credentials.
3. Vercel gives you a live URL immediately — that's the real, shareable app.

## What's not built yet (next passes)
- Sign-up/login UI polish (magic-link sign-in works now, but it's bare)
- Category browsing, church pages/groups, the compose flow, photo/video upload to Supabase Storage
- The M-Pesa callback route that confirms payment and flips a church to "active"

Bring this back to Claude with what you'd like built next, in order.
