# Archived production-lineage migrations

These SQL files are preserved for traceability from production commit `8cef64502c15f0c52cf9285e7a07640c71634508`. They are not active migrations and must not be pasted or executed against the current project without a separate schema review.

- `20261031_section_pages_schema.sql` uses an older media-items key/schema and is superseded by the active feature migrations.
- `20261102_fix_media_follows_rls.sql` grants broad table-level SELECT on profiles, conflicting with current column-level privacy grants.
- `20261102_security_rate_limits_and_reports.sql` created the legacy rate-limit and moderation-report foundation. The connected database currently has `rate_limits` and `content_reports`; do not rerun it blindly.
- The legacy seed `supabase/seeds/archive/seed_section_content.sql` uses non-UUID course IDs and does not match the current courses schema.

Use `supabase/MIGRATIONS.md` for the active migration procedure. The active migration set has not been certified as a clean-room bootstrap for a brand-new Supabase project.
