# Step 3 — Real Media Uploads + RSS Autofill

**For:** Shammah (Next.js + Supabase)  
**Your local path (Git Bash):** `/c/kletos/shammah`  
**Date:** 2026-09-30

This pack adds:
1. Real media uploads for posts (images, videos/reels, audio/songs/podcasts) via Supabase Storage.
2. RSS feed ingestion so content can be auto-filled into the feed from URL + keywords.

---

## Files in this pack

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | **Reference only** — full picture of the live database (all tables you listed + media/RSS). Do **not** re-run this on an existing project. |
| `supabase/migrations/008_post_media_and_rss.sql` | **Run this** in Supabase SQL Editor. Safe, additive, idempotent. |
| `app/lib/mediaUpload.js` | New helper — copy into your project. |
| `app/api/rss/fetch/route.js` | New API route that fetches RSS feeds. |
| `docs/page-js-changes.md` | Exact places to edit in `app/page.js`. |
| `docs/postcard-js-changes.md` | Exact places to edit in `app/components/PostCard.js`. |
| `docs/css-additions.css` | Styles to append to `app/globals.css`. |

---

## Git Bash commands (do these in order)

```bash
# 1. Go to your project
cd /c/kletos/shammah

# 2. Create folders if they don't exist
mkdir -p app/lib
mkdir -p app/api/rss/fetch

# 3. Copy the new files from the download pack into the project
#    (After you download the zip or individual files from the chat)

# Example if you put the pack on Desktop:
# cp ~/Desktop/shammah-step3/app/lib/mediaUpload.js          app/lib/
# cp ~/Desktop/shammah-step3/app/api/rss/fetch/route.js      app/api/rss/fetch/
# cp ~/Desktop/shammah-step3/supabase/migrations/008_*.sql   supabase/migrations/
# cp ~/Desktop/shammah-step3/supabase/schema.sql             supabase/schema.sql

# 4. Add the two new environment variables
#    Open .env.local in your editor and add:
#    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
#    CRON_SECRET=make-up-a-long-random-string

# 5. Install (no new packages required) and restart
npm install
npm run dev
```

---

## 1. Run the migration (Supabase Dashboard)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the **entire** contents of `supabase/migrations/008_post_media_and_rss.sql`.
3. Click **Run**.
4. Confirm:
   - Storage → you now see a **post-media** bucket (public).
   - Table Editor → new table **rss_feeds**.
   - `posts` table has new columns: `source`, `external_guid`, `media_duration_seconds`, `media_thumbnail_url`.

---

## 2. Get your Service Role Key

Supabase Dashboard → **Project Settings** → **API** → copy the **service_role** key (the secret one).  
Put it only in `.env.local` and in Vercel Environment Variables.  
**Never** put it in client-side code or commit it to GitHub.

---

## 3. Test media upload

1. Open http://localhost:3000 and sign in.
2. In the compose box, click **Add media** and pick a small photo or short video/audio file.
3. Write some text and post.
4. The feed should show the media under the post.

If upload fails, check the browser console and the Network tab for the Supabase Storage request.

---

## 4. Test RSS (optional for now)

```bash
# From Git Bash, while npm run dev is running:
curl -X POST http://localhost:3000/api/rss/fetch \
  -H "x-cron-secret: YOUR_CRON_SECRET_HERE"
```

You should get back `{"inserted": N}`.  
To add a feed, insert a row into `rss_feeds` in the Table Editor (or we can build an admin UI next).

---

## What was already in your project (no change needed)

- `posts.media_url` and `posts.media_type` columns already existed.
- Profile avatars/covers and poll images already use Storage.
- The new `post-media` bucket follows the same pattern (folder named after the user id).

---

## Next after Step 3

- Progress bar / upload percentage.
- Client-side image compression (you already have `imageTools.js`).
- Multiple media attachments per post.
- RSS admin screen under Settings or Church edit.
- Vercel Cron so RSS is fetched automatically every hour.

Bring the next piece you want built and we continue.
