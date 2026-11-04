# Supabase migration inventory

Branch: `work/section-pages-prompt-pack`  
Inventory generated from the branch's `supabase/migrations/` directory on 2026-11-04. **66 SQL migration files found.**

## Important deployment rule

This is a file inventory, **not** a record that all migrations have been applied to the connected Supabase project. Some files intentionally overlap or reconcile earlier schema versions. The user applies database-changing SQL manually. Before release, compare the live schema and the project's migration history to the intended target; do not bulk-run this directory or rerun migrations already confirmed applied.

Known confirmed items from the current project work:
- The user confirmed `20261108_fundraiser_checkout_ledger_idempotency.sql` succeeded.
- The user confirmed `20261109_fundraiser_callback_inbox.sql` succeeded.
- The user confirmed `20261110_mpesa_callback_inbox_all_payments.sql` succeeded. Do not rerun it.
- The user confirmed the course base migration and seed succeeded.
- The user confirmed the promo analytics reconciliation migration succeeded; read-only checks confirmed `promo_events.promo_id` exists and the analytics SELECT policy is admin-only.
- Arcade schema/seed and other older migrations have separate history; verify individually rather than assuming they all ran.

## Files (alphabetical / directory order)

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

## Seeds and non-migration SQL

Seed scripts are not included in the 66-file count. Check each seed's dependencies and whether it has already been run before using it. Prefer the feature-specific seed only after its schema is verified. Never run seeds blindly against production.
