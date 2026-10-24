# Onboarding & Profile — what was built

## What you get

1. **Mandatory onboarding wizard** after first sign-in/sign-up  
   - Steps: Display name → Member badge → Photos (optional) → About (optional) → DOB + location (optional)  
   - **Required to finish:** name + badge  
   - Photos / about / DOB / location are skippable so a failed upload never traps the user  

2. **Member badges** (locked after choice)  
   Believer, Student, Teacher, Missionary, Pastor, Bishop, Reverend, Deacon, Elder, Evangelist, Worship Leader, Volunteer  
   - Shown next to the name in the feed, comments, top bar, and profile  
   - Enforced in the database: once set, only a `platform_admin` can change it  

3. **Display name**  
   - Changeable once every 90 days (DB trigger + clear UI message)  

4. **Profile settings**  
   - Cover + avatar, name (with lock messaging), about (≤250 chars), DOB, location  
   - Location uses **OpenStreetMap Nominatim** (free, no API key)  

5. **Storage**  
   - Public buckets `avatars` and `covers` (SQL creates them + RLS policies)  

---

## Steps for you (Git Bash on Windows)

```bash
# 1. Go to your project
cd /c/kletos/shammah

# 2. If you pulled these files as a zip, copy them over your tree, then:
git status

# 3. Run the migration in Supabase
#    Dashboard → SQL Editor → New query → paste entire contents of:
#    supabase/migration_onboarding.sql
#    → Run

# 4. Confirm Storage buckets exist
#    Dashboard → Storage → you should see "avatars" and "covers" (public)
#    If the SQL insert failed (permissions), create them manually as public buckets.

# 5. Install (no new npm packages required) and run
npm install
npm run dev
```

Open http://localhost:3000, sign up (or sign in as a user who has never completed onboarding). The wizard appears immediately and blocks the rest of the app until name + badge are set.

---

## Files added / changed

| Path | Purpose |
|------|---------|
| `supabase/migration_onboarding.sql` | Schema + triggers + storage policies |
| `app/lib/badges.js` | Badge list + name-change helper |
| `app/components/MemberBadge.js` | Badge chip |
| `app/components/MemberName.js` | Name + badge together |
| `app/components/LocationPicker.js` | Nominatim place search |
| `app/components/OnboardingWizard.js` | Multi-step first-run flow |
| `app/components/ProfileSettings.js` | Full settings UI |
| `app/components/PostCard.js` | Shows badge + avatar on posts |
| `app/components/CommentThread.js` | Shows badge + avatar on comments |
| `app/page.js` | Wires onboarding, settings, richer profile query |
| `app/globals.css` | Styles for wizard, badges, settings |

---

## Design choices (aligned with prior advice)

- **Badge lock is in Postgres**, not only the UI.  
- **Name + badge required**; everything else skippable.  
- **Nominatim** for location (swap to Google Maps later is a contained change inside `LocationPicker.js`).  
- Badge list is a simple config array — add more in `app/lib/badges.js` anytime.

---

## Making yourself platform_admin (to edit someone’s badge)

In Supabase SQL Editor:

```sql
update profiles set role = 'platform_admin' where id = 'YOUR-USER-UUID';
```

Then you can update another user’s `badge` column directly in the Table Editor (or via SQL). Ordinary users will hit the trigger exception if they try.

---

## Existing users

Anyone who already has a `profiles` row but `onboarded_at` is null will see the wizard on next login. To skip the wizard for test accounts:

```sql
update profiles set onboarded_at = now(), badge = 'believer' where id = 'USER-UUID';
```
