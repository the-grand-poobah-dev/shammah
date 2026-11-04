# Shammah release smoke test

Run against the latest **preview** deployment before merging PR #1. Do not use real payments or modify production data for testing.

## Build and routing
- [ ] Latest preview deployment is READY and corresponds to the current PR head.
- [ ] Home loads signed out and signed in; no runtime error overlay or repeated failed API calls.
- [ ] Navigation opens each built section: Videos/Reels, Audio, Polls, Courses, Fundraisers, Faith Challenges, Arcade, Bible, Live, Profile, Messages and Settings.
- [ ] Refresh a deep route (including a live route) and confirm it does not return a 404 or crash.

## Cross-promotion (Prompt 15)
- [ ] Reels rail appears only when reels are available; cards open the reels page.
- [ ] Promo card loads from available data, or quietly disappears when a source is empty.
- [ ] Daily verse uses `verse_of_day.ref/text` when present and fallback verse when absent.
- [ ] Daily arcade promo reads `arcade_daily.game_slug/day/seed` without querying nonexistent columns.
- [ ] Dismissal persists for seven days; session cap is respected.
- [ ] Click and dismiss events insert without blocking the feed; anon cannot SELECT promo analytics.
- [ ] Live promotion opens the corresponding `/live/[id]` route.

## Feature smoke tests
- [ ] Posts, comments, status stories and media uploads work with a small image and a short video.
- [ ] Camera and microphone permissions granted/denied each produce a useful state; test on a real supported device.
- [ ] GIF search and picker degrade gracefully if provider keys are absent.
- [ ] Poll create/vote/change vote/close works; counts and visibility match expectations.
- [ ] Courses catalogue, course detail, free enrollment, quiz completion and certificate eligibility work. Test paid access with a sandbox/test fixture only.
- [ ] Fundraiser detail and donation intent work; callback replay is idempotent. Never use a real charge as a test.
- [ ] Challenge join/check-in/submission and leaderboard render; arcade scoring is server-validated and duplicate submission is rejected.
- [ ] Bible search, reading plan, bookmarks and verse-of-day work; only licensed/public-domain translations are exposed.
- [ ] Live missing-key state is friendly; when configured, join/leave, token authorization and moderation work.

## Responsive and accessibility
- [ ] Follow `docs/RESPONSIVE_QA_MATRIX.md` at minimum 360, 768, 1440 and 1920 CSS pixels, in dark and light themes.
- [ ] No page-level horizontal overflow; media is contained; modals fit the visible viewport and scroll internally.
- [ ] Keyboard focus is visible; icon-only controls have accessible names; reduced-motion preference is respected.

## Database and operations
- [ ] Run the read-only `supabase/tests/rls_checks.sql` and inspect the results, including column-level privileges.
- [ ] Confirm the migration inventory against the actual Supabase migration history. Do not rerun the confirmed M-Pesa callback migration.
- [ ] Verify secrets exist by name only; never print or share secret values.
- [ ] Confirm production target, custom domain, and last-known-good deployment before merge/release.
- [ ] After release, check Vercel runtime errors and Supabase logs; have a rollback/compensating-migration plan.

## Not yet automated
This checklist is a manual acceptance plan. Passing a Vercel build does not mean these interactions, responsive viewports, device permissions or payment callback flows have all been tested.
