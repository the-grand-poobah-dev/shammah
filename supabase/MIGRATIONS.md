# Shammah Supabase Migrations & Database Architecture

This document catalogs all database migrations for the Shammah church-community platform. Every migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS ... CREATE POLICY`), enforces Row Level Security (RLS) on all tables, and maintains data integrity with explicit foreign keys and check constraints.

---

## Migration Sequence & Dependency Order

Run migrations in exact numerical/date order:

| # | Migration File | Description | Core Tables / Functions | RLS |
|---|---|---|---|:---:|
| 1 | `001_initial_schema.sql` | Baseline user profiles, churches, posts, and comments | `profiles`, `churches`, `posts`, `comments` | ✅ |
| 2 | `002_user_follows.sql` | Follows graph between believers and church leaders | `follows` | ✅ |
| 3 | `003_mpesa_billing.sql` | M-Pesa transactions and church subscription tiers | `subscriptions`, `mpesa_transactions` | ✅ |
| 4 | `004_church_subscriptions_and_guards.sql` | Server-enforced church subscription triggers & guards | Trigger `enforce_church_subscription_limits` | ✅ |
| 5 | `005_fix_church_profile_fkeys.sql` | Foreign key repair for church creator profiles | Foreign key constraints | ✅ |
| 6 | `006_push_notifications.sql` | FCM push notification tokens and preferences | `fcm_tokens`, `notification_preferences` | ✅ |
| 7 | `007_google_workspace_tables.sql` | Google Workspace integration metadata and tokens | `google_workspace_configs`, `workspace_sync_logs` | ✅ |
| 8 | `008_google_workspace_security_rules.sql` | Workspace proxy authorization & subscription checks | RPC `church_has_workspace_plan` | ✅ |
| 9 | `009_fix_workspace_fkeys_and_rpc.sql` | Workspace foreign keys and access helper functions | RPC `verify_church_admin` | ✅ |
| 10 | `010_direct_messages_and_mentions.sql` | Private church messaging, user mentions, conversations | `direct_messages`, `conversations`, `post_mentions` | ✅ |
| 11 | `011_polls_and_options.sql` | Interactive church polls, options, and vote tallies | `poll_options`, `poll_votes` | ✅ |
| 12 | `012_status_privacy_and_reports.sql` | 24-hr story statuses, viewer privacy, initial reports | `statuses`, `status_views`, `content_reports` | ✅ |
| 13 | `013_fix_statuses_rls_and_storage.sql` | Story status viewer RLS and storage bucket policies | Storage `post-media` bucket rules | ✅ |
| 14 | `20261031_section_pages_schema.sql` | Dedicated schema for section pages | `media_items`, `courses`, `fundraisers`, `challenges`, `arcade_games`, `arcade_leaderboard` | ✅ |
| 15 | `20261101_media_foundation.sql` | Video & audio foundation, series, watch progress, playlists | `media_engagement`, `media_views`, `watch_progress`, `playlists`, `playlist_items` | ✅ |
| 16 | `20261102_security_rate_limits_and_reports.sql` | Rate limiting, token-bucket RPC, unified moderation, donation idempotency, arcade score clamping, composite hot query indexes | `rate_limits`, RPC `check_rate_limit`, `content_reports` upgrade, RPC `credit_fundraiser_donation`, RPC `submit_arcade_score` | ✅ |

---

## Seed Data Sequence

When setting up a local or staging Supabase environment, run seed files after all migrations:

```bash
# Order of seed execution:
1. supabase/seed_institutions.sql  # Churches and ministries across Kenya
2. supabase/seed_section_pages.sql  # Real initial videos, courses, audio sermons, fundraisers, bible devotions
```

---

## How to Apply Migrations

### Method A: Automated Migration Runner
Use the bundled repository script:
```bash
node scripts/push-migration.mjs supabase/migrations/20261102_security_rate_limits_and_reports.sql
```

### Method B: Supabase Dashboard (SQL Editor)
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) for your project.
2. Navigate to **SQL Editor** > **New Query**.
3. Paste the contents of `supabase/migrations/20261102_security_rate_limits_and_reports.sql`.
4. Click **Run**.
5. Check output: `Success. No rows returned.`

---

## Automated Verification Suite

Run the SQL verification test suite to ensure RLS policies, rate limits, and idempotency guards are functioning:
```bash
# Execute in Supabase SQL editor:
cat supabase/tests/rls_checks.sql
```
*Note: The test suite runs inside a transaction and executes `ROLLBACK;` at the end, leaving no test artifacts in your production database.*

---

## Rollback Strategy

Every migration contains idempotent logic and non-destructive alterations:
- If a migration fails mid-run, re-running is safe.
- In the event an RPC or policy requires rollback:
  - Policies can be safely dropped: `DROP POLICY IF EXISTS <policy_name> ON <table_name>;`
  - Functions can be reverted: `DROP FUNCTION IF EXISTS <function_name>;`
  - New columns use `ADD COLUMN IF NOT EXISTS`, preserving existing schemas.
