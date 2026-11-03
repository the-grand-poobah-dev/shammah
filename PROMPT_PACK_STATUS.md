# Shammah Prompt Pack Completion Tracker

Branch: `work/section-pages-prompt-pack`  
Source of truth: `Shammah Section Pages, Media Pickers & Backend AI Studio Prompt Pack.md` in the ChatGPT Library.  
Rule: a file existing is not proof that the feature is complete. "Needs verification" means code is present but acceptance tests have not been demonstrated. Update this tracker as work is finished.

## Prompt status

| # | Prompt | Evidence in branch | Status | Remaining acceptance work |
|---|---|---|---|---|
| 1 | Audit and plan | Original prompt pack records the audit findings; implementation now spans the migrations and route files | Needs reconciliation | Reconcile current schema, RLS, routes and migrations into one final inventory |
| 2 | Layout Kit | `app/components/layoutkit/*`, `app/layout-kit/*` | Needs verification | Confirm every required layout/state, container reflow, theme and playground behavior |
| 3 | Backend foundation | `20261101_media_foundation.sql`, `app/lib/data/mediaApi.js`, `app/components/MediaUploadModal.js`, `supabase/seed_media.sql` | Needs verification | Confirm migration/seed application, storage policies, counters, RLS and real upload |
| 4 | Videos and Reels | `VideosView.js`, `app/reels/page.js`, `app/watch/[id]/page.js`, Reel components and media API | Needs verification | Exercise list/search/filter/sort, player/progress, engagement, reel feed and persistence |
| 5 | Audio | `AudioView.js` and persistent player components | Needs verification | Complete the outstanding migration/smoke-test review; verify queue, progress and one-player-at-a-time behavior |
| 6 | Polls | `PollsView.js` and poll privacy/RPC hardening migrations | Needs verification | Verify create/vote/change-vote/close flows, authorization and counts |
| 7 | Courses | `CoursesView.js`, course migrations and seed | Needs preview testing | Base migration and seed were reported successful; test enrollment, quiz completion, certificates and paid access when preview is available |
| 8 | Fundraisers | Fundraiser migrations, payment routes and callback inbox migrations | Needs verification | Latest callback inbox migration succeeded; verify donation, callback replay/idempotency, course and subscription reconciliation without real payments |
| 9 | Faith Challenges | `FaithChallengesView.js`, challenge migrations | Needs verification | Verify join/check-in streak math, submissions, voting, leaderboard and permissions |
| 10 | Arcade | `FaithArcadeGamesView.js`, arcade migrations/seeds and server APIs | Needs verification | Verify all seeded HTML5 games, server-scored results, duplicate submission protections and leaderboards |
| 11 | Bible | `BibleReaderView.js`, `20261102_bible.sql`, Bible manager/library files | Needs verification | Verify text availability, reading plans, verse-of-day, search, bookmarks and licensed-version behavior |
| 12 | Media core (camera, voice, GIF) | `app/components/media/CameraCaptureModal.js`, `VoiceRecorderBar.js`, `GifPicker.js`, `app/lib/voiceRecorder.js` | Needs verification | Device-level camera/mic tests, pause/resume, MIME fallbacks, GIF provider and upload behavior |
| 13 | Wire pickers into post/comments/status | `CreatePostBox.js`, `CommentThread.js`, `StatusCreatorModal.js` | Needs verification | Confirm one coherent toolbar and test all three contexts with images, portrait/landscape video, audio and GIF |
| 14 | Create Reel and Live | `ReelCreatorModal.js`, `ReelViewerModal.js`, `app/api` live routes and live migration | Needs verification | Verify Reel publish/view plus LiveKit configuration, token security, join/leave, moderation and missing-key graceful state |
| 15 | Cross-promotion widgets | `app/components/promos/ReelsRail.js`, `PromoSlot.js`, `app/lib/promoData.js`, `app/promos.css`, `20261111_promo_events.sql` | Needs migration and testing | Home feed wiring is committed; apply the exact migration to reconcile the existing analytics table and remove anonymous access to analytics reads; verify deep-links and UI when preview is available |
| 16 | Responsive and consistency pass | `app/section-pages.css`, `app/desktop-layout.css`, section components and Layout Kit exist | Needs verification | Produce the required page × breakpoint × theme matrix; fix measured issues and test 360–1920px layouts |
| 17 | Backend hardening and QA | Numerous hardening migrations and API routes exist; no `supabase/MIGRATIONS.md` or `supabase/tests/rls_checks.sql` found in the branch tree | Incomplete | Inventory all migrations/seeds and dependencies; add RLS regression tests, route/security review, health diagnostics, moderation audit and manual QA script |

## Current stopping point

- The user confirmed the latest `20261110_mpesa_callback_inbox_all_payments.sql` migration ran successfully in Supabase.
- Read-only verification confirms `process_fundraiser_callback_inbox(text)` exists as SECURITY DEFINER, is executable by `service_role`, and is not executable by `anon` or `authenticated`.
- Do not rerun that migration. If further changes are required, add a new migration.
- Vercel preview testing is currently blocked by the daily deployment limit. Keep changes on this branch and label untested behavior clearly.
- Never modify `main` or production without explicit user authorization.

## Working rules

1. Reconcile current code before changing it; do not rebuild completed features.
2. Batch related code changes and inspect diffs/acceptance criteria before committing.
3. User runs database-changing SQL manually in Supabase SQL Editor. Provide one exact, version-pinned SQL file/link and never ask the user to run DDL/DML through a tool.
4. Use read-only database queries for verification where possible.
5. Each batch ends with commit(s), changed files, exact SQL required (if any), tests actually performed, and the next outstanding prompt.
