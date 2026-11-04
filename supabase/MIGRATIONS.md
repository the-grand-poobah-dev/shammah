# Supabase migration inventory and release procedure

Branch: `work/section-pages-prompt-pack`  
Inventory generated from `supabase/migrations/` on 2026-11-04. **66 active SQL migration files found.** Archived production-lineage migrations are listed separately below and are not part of the active migration set.

## Important: inventory is not an applied-migration ledger

This list proves only which files are present in Git. It does not mean all files have been run against Supabase. Several migrations deliberately reconcile evolving schemas or alter the same table/policy. The user runs database-changing SQL manually. Do not bulk-run the folder, and never rerun a migration already confirmed applied.

Confirmed by the user or read-only checks in the current project:
- `20261108_fundraiser_checkout_ledger_idempotency.sql` succeeded.
- `20261109_fundraiser_callback_inbox.sql` succeeded.
- `20261110_mpesa_callback_inbox_all_payments.sql` succeeded; do not rerun it.
- Course base migration and seed succeeded.
- `20261111_promo_events.sql` was reported successful; read-only checks confirm `promo_events.promo_id` exists and anonymous SELECT is not granted by the current analytics policy/ACL.

## Suggested dependency groups (verify live state before applying)

| Feature group | Relevant migrations / dependencies | Seed or follow-up |
|---|---|---|
| Core identity/church/feed | `001_onboarding`, `007_churches_and_categories`, `008_post_media_and_rss`, `010_pinned_posts`, `012_status_privacy_and_reports`, `013_comment_media`, `014_post_location_feeling_tags`, `015_user_shortcuts` | Verify existing base tables first |
| Polls and quizzes | `20261030_polls_and_quizzes`, `20261030_polls_hub`, `20261030_update_media_type_constraints`, `20261101_polls_privacy_hardening`, `20261102_authenticated_poll_rpc_hardening` | `seed_polls.sql` only after schema and RPCs are verified |
| Media, audio and reels | `20261101_media_foundation`, `20261101_audio_series_follow`, media-comments access/visibility migrations, `20261102_media_types`, `20261102_reels_and_media_comments`, `20261103_fix_follows_and_media_grants` | `seed_media.sql` only after media schema is verified |
| Courses | `20261030_courses`, `20261101_courses_security_hardening`, `20261102_courses_quiz_completion` | `seed_courses.sql`; user confirmed base migration and seed succeeded |
| Faith challenges | `20261102_faith_challenges`, `20261105_faith_challenges` | Review the later schema reconciliation before considering `seed_challenges.sql` or `seed_faith_challenges.sql` |
| Arcade | `20261102_arcade`, `20261103_arcade_schema_reconcile`, then applicable privilege migrations | `seed_arcade.sql` after live schema verification |
| Bible | `20261102_bible` | `seed_bible_plans.sql` after Bible schema verification |
| Fundraisers / M-Pesa | `20261102_fundraisers`, `20261104_fundraisers`, `20261105_fundraiser_financial_integrity`, `20261106_fundraiser_payout_reconciliation`, `20261107_fundraiser_owner_compatibility`, `20261108_fundraiser_checkout_ledger_idempotency`, `20261109_fundraiser_callback_inbox`, `20261110_mpesa_callback_inbox_all_payments` | `seed_fundraisers.sql` only if needed; payment callback migration is already confirmed applied |
| Live | `20261102_live`, `20261102_live_chat_visibility_fix` | Verify provider environment keys separately; no secrets in SQL |
| Privacy and privilege hardening | `20261102_profile_column_privacy_hardening`, `20261102_profile_private_anon_acl_hardening`, RPC/trigger/privacy cleanup migrations, `20261103_security_privilege_hardening`, `20261103_payment_and_arcade_client_privileges`, `20261103_profile_privilege_escalation_hardening`, `20261103_church_membership_update_integrity`, `20261103_mpesa_transactions_server_only` | Do not re-run blindly; inspect grants and column-level grants, not table-level grants alone |
| Cross-promotion | `20261111_promo_events` | Migration reported successful; promo queries have been aligned with live `verse_of_day` and `arcade_daily` columns |

## All migration files

- `supabase/migrations/001_onboarding.sql`
- `supabase/migrations/002_fix_posts_policy.sql`
- `supabase/migrations/005_badge_requests.sql`
- `supabase/migrations/006_profile_private_grants.sql`
- `supabase/migrations/007_churches_and_categories.sql`
- `supabase/migrations/008_post_media_and_rss.sql`
- `supabase/migrations/009_subscriptions_plans.sql`
- `supabase/migrations/010_pinned_posts.sql`
- `supabase/migrations/012_status_privacy_and_reports.sql`
- `supabase/migrations/013_comment_media.sql`
- `supabase/migrations/014_post_location_feeling_tags.sql`
- `supabase/migrations/015_user_shortcuts.sql`
- `supabase/migrations/20261008_production_readiness.sql`
- `supabase/migrations/20261023_poll_expiration_enforcement.sql`
- `supabase/migrations/20261023_post_reposts_persistence.sql`
- `supabase/migrations/20261026_church_follows_and_members.sql`
- `supabase/migrations/20261026_church_workspace_items_and_plans.sql`
- `supabase/migrations/20261026_statuses_schema_and_media.sql`
- `supabase/migrations/20261030_courses.sql`
- `supabase/migrations/20261030_polls_and_quizzes.sql`
- `supabase/migrations/20261030_polls_hub.sql`
- `supabase/migrations/20261030_update_media_type_constraints.sql`
- `supabase/migrations/20261101_audio_series_follow.sql`
- `supabase/migrations/20261101_courses_security_hardening.sql`
- `supabase/migrations/20261101_media_comments_access_hardening.sql`
- `supabase/migrations/20261101_media_comments_visibility_policy_fix.sql`
- `supabase/migrations/20261101_media_foundation.sql`
- `supabase/migrations/20261101_platform_admin_bootstrap.sql`
- `supabase/migrations/20261101_polls_privacy_hardening.sql`
- `supabase/migrations/20261101_reels_feed_hardening.sql`
- `supabase/migrations/20261102_arcade.sql`
- `supabase/migrations/20261102_authenticated_poll_rpc_hardening.sql`
- `supabase/migrations/20261102_bible.sql`
- `supabase/migrations/20261102_courses_quiz_completion.sql`
- `supabase/migrations/20261102_faith_challenges.sql`
- `supabase/migrations/20261102_feed_visibility_policy_fix.sql`
- `supabase/migrations/20261102_fundraisers.sql`
- `supabase/migrations/20261102_live.sql`
- `supabase/migrations/20261102_live_chat_visibility_fix.sql`
- `supabase/migrations/20261102_media_types.sql`
- `supabase/migrations/20261102_profile_column_privacy_hardening.sql`
- `supabase/migrations/20261102_profile_private_anon_acl_hardening.sql`
- `supabase/migrations/20261102_reels_and_media_comments.sql`
- `supabase/migrations/20261102_revoke_unused_privileged_rpcs.sql`
- `supabase/migrations/20261102_rpc_execute_hardening.sql`
- `supabase/migrations/20261102_trigger_function_security_hardening.sql`
- `supabase/migrations/20261102_z_data_privacy_policy_cleanup.sql`
- `supabase/migrations/20261102_zz_direct_messages_foundation.sql`
- `supabase/migrations/20261102_zz_rpc_subject_scope_hardening.sql`
- `supabase/migrations/20261102_zzz_locked_profile_visibility.sql`
- `supabase/migrations/20261103_arcade_schema_reconcile.sql`
- `supabase/migrations/20261103_church_membership_update_integrity.sql`
- `supabase/migrations/20261103_fix_follows_and_media_grants.sql`
- `supabase/migrations/20261103_mpesa_transactions_server_only.sql`
- `supabase/migrations/20261103_payment_and_arcade_client_privileges.sql`
- `supabase/migrations/20261103_profile_privilege_escalation_hardening.sql`
- `supabase/migrations/20261103_security_privilege_hardening.sql`
- `supabase/migrations/20261104_fundraisers.sql`
- `supabase/migrations/20261105_faith_challenges.sql`
- `supabase/migrations/20261105_fundraiser_financial_integrity.sql`
- `supabase/migrations/20261106_fundraiser_payout_reconciliation.sql`
- `supabase/migrations/20261107_fundraiser_owner_compatibility.sql`
- `supabase/migrations/20261108_fundraiser_checkout_ledger_idempotency.sql`
- `supabase/migrations/20261109_fundraiser_callback_inbox.sql`
- `supabase/migrations/20261110_mpesa_callback_inbox_all_payments.sql`
- `supabase/migrations/20261111_promo_events.sql`

## Seed and supporting SQL files

- `supabase/MIGRATIONS.md`
- `supabase/full_media_migration.sql`
- `supabase/migration_user_shortcuts.sql`
- `supabase/push-migration.mjs`
- `supabase/schema.sql`
- `supabase/seed_arcade.sql`
- `supabase/seed_bible_plans.sql`
- `supabase/seed_challenges.sql`
- `supabase/seed_courses.sql`
- `supabase/seed_faith_challenges.sql`
- `supabase/seed_fundraisers.sql`
- `supabase/seed_media.sql`
- `supabase/seed_polls.sql`

## Applying a migration safely

1. Check the current Supabase schema, policies, grants and function signatures using read-only catalog queries. Confirm the exact file has not already been applied.
2. Open a new Supabase SQL Editor query and paste the **entire contents of the single intended migration file**. Do not concatenate unrelated migrations or seeds.
3. Run it once, save the exact success/error output, and verify the resulting objects with read-only queries.
4. Run a seed only after its schema dependencies are present; verify counts and sample rows afterward.
5. For release, record each file as `applied`, `pending`, or `not required` in the project’s deployment record.

### About `supabase/push-migration.mjs`

The current script hardcodes `supabase/migrations/20261008_production_readiness.sql`; it is **not** a general migration runner. It can submit raw SQL through the Supabase Management API when `SUPABASE_ACCESS_TOKEN` is configured. Do not use it to run an arbitrary migration or on production without first changing and reviewing that behavior. The agreed workflow for this release remains manual execution of one exact SQL file in the Supabase SQL Editor.

## Verification and rollback

- Use `supabase/tests/rls_checks.sql` for read-only RLS/policy and privilege observations. It does not write data and does not simulate every authenticated-user scenario.
- Verify critical RPC permissions, payment/callback idempotency, and seed dependencies separately.
- There is no universal automatic rollback for these migrations. Before any production DDL, take a database backup or confirm the project's recovery point. For mistakes, prefer a reviewed compensating migration that preserves user data; restore from backup only when the impact warrants it. Do not drop tables or delete rows as a generic rollback.


## Archived production-lineage SQL (reference only — do not run directly)

The current release branch is reconciled with deployed production commit `8cef64502c15f0c52cf9285e7a07640c71634508`. These older files are retained under `supabase/migrations/archive/legacy_production/` for traceability, not as active migrations:

- `20261031_section_pages_schema.sql` — legacy schema uses a text primary key for `media_items.id`; current database uses UUID and later feature-specific migrations.
- `20261102_fix_media_follows_rls.sql` — grants table-level SELECT on `profiles`, which conflicts with the current column-level profile privacy grants. Do not run.
- `20261102_security_rate_limits_and_reports.sql` — legacy setup for `rate_limits`, `content_reports` and related RPCs. Read-only checks confirm both tables currently exist in the connected database. Do not rerun; inspect the current function/policy state first.
- `supabase/seeds/archive/seed_section_content.sql` — legacy seed uses non-UUID course identifiers and does not match the current courses schema. Do not run.

These archived files are not counted among the 66 active migrations. The active migration set and fresh-project bootstrap still require a separate dependency review before using them to initialize a brand-new database.
