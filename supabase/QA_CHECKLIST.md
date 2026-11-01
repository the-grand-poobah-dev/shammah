# Shammah Production QA & Security Checklist

This document details the complete end-to-end quality assurance, security verification, and performance test matrix for Shammah.

---

## 1. Security & Row Level Security (RLS) Test Plan

| Test Case | Scenario / Steps | Expected Result | Status |
|---|---|---|:---:|
| **RLS-01** | Anonymous user queries public `media_items` where `status = 'published'` | Returns published records only. | ✅ PASS |
| **RLS-02** | Anonymous user attempts `INSERT` into `media_items`, `posts`, or `content_reports` | Denied by RLS (`42501 permission denied`). | ✅ PASS |
| **RLS-03** | User A creates a video or course draft with `visibility = 'private'` | Visible only to User A; User B cannot see it. | ✅ PASS |
| **RLS-04** | User B attempts `UPDATE` or `DELETE` on User A's post/media (IDOR test) | Blocked by RLS with zero rows affected. | ✅ PASS |
| **RLS-05** | Church pastor or administrator edits church settings | Allowed if creator/admin; denied for non-members. | ✅ PASS |
| **RLS-06** | Moderator/Admin queries `content_reports` queue | Full access to pending and actioned items; non-staff receive empty set. | ✅ PASS |
| **RLS-07** | Automated test suite `supabase/tests/rls_checks.sql` | All transaction assertions pass with clean `ROLLBACK;`. | ✅ PASS |

---

## 2. Money, Donations, Payments & M-Pesa Idempotency

| Test Case | Scenario / Steps | Expected Result | Status |
|---|---|---|:---:|
| **PAY-01** | Believer initiates M-Pesa STK push for KES 500 fundraiser donation | `fundraiser_donations` created with status `pending` and `checkout_request_id`. | ✅ PASS |
| **PAY-02** | Safaricom Daraja sends successful callback to `/api/mpesa/callback` | Atomic RPC `credit_fundraiser_donation` increments `raised_kes` and marks donation `succeeded`. | ✅ PASS |
| **PAY-03** | **Replay Protection**: Safaricom resends the exact same callback payload 30 seconds later | Callback handler detects `tx.status === 'completed'` or `donation.status === 'succeeded'`, returns `200 OK` immediately without double-crediting. | ✅ PASS |
| **PAY-04** | Paid discipleship course enrollment payment (KES 1,200) | `course_enrollments` upserted with `paid: true` and `mpesa_receipt`. User gains access. | ✅ PASS |
| **PAY-05** | Church subscription activation (Workspace Premium KES 7,000/mo) | Church `subscription_status` set to `'active'`. Workspace proxy routes unlocked. | ✅ PASS |

---

## 3. Rate Limiting & Abuse Prevention

| Test Case | Scenario / Steps | Expected Result | Status |
|---|---|---|:---:|
| **RATE-01** | Rapid requests to `/api/gemini/chat` (>15 requests within 60s) | Route returns HTTP `429 Too Many Requests` with `Retry-After: 60`. | ✅ PASS |
| **RATE-02** | Oversized prompt to `/api/gemini/chat` (>2,000 characters) | Route returns HTTP `400 Bad Request` with helpful character limit message. | ✅ PASS |
| **RATE-03** | Rapid requests to `/api/fcm/send` without authorization | Route returns HTTP `401 Unauthorized`. | ✅ PASS |
| **RATE-04** | Rapid valid requests to `/api/fcm/send` (>20 requests within 60s) | Rate limited at HTTP `429`. | ✅ PASS |

---

## 4. Content Moderation & Reporting

| Test Case | Scenario / Steps | Expected Result | Status |
|---|---|---|:---:|
| **MOD-01** | User flags a video, reel, or comment using `UnifiedReportModal` | Reason, details, and target ID saved to `content_reports`. Optimistic feedback shown. | ✅ PASS |
| **MOD-02** | Regular user attempts to visit `/admin/reports` | Shows friendly "Pastoral Access Restricted" screen with link back to feed. | ✅ PASS |
| **MOD-03** | Moderator visits `/admin/reports` | Renders report queue with pending counter and status/type filter chips. | ✅ PASS |
| **MOD-04** | Moderator clicks "Hide Content" on flagged item | Content status updated to `'hidden'`, report updated to `'actioned'`, item removed from public feed. | ✅ PASS |
| **MOD-05** | Moderator clicks "Restore Content" on mistakenly flagged item | Content status restored to `'published'`. | ✅ PASS |

---

## 5. Section Hubs & Media Playback

| Test Case | Scenario / Steps | Expected Result | Status |
|---|---|---|:---:|
| **MEDIA-01** | Open `/videos` or `section === 'videos'` | Renders 7 curated blocks, search, category chips, layout switcher, and reels rail. | ✅ PASS |
| **MEDIA-02** | Click any video card | Opens YouTube-style watch view with scrubber, speed menu, chapters, and comments. | ✅ PASS |
| **MEDIA-03** | Watch video for 45s, pause, and navigate away | `watch_progress` persisted to Supabase; resumes from 45s on return. | ✅ PASS |
| **MEDIA-04** | Open `/reels` or `section === 'reels'` | Renders TikTok-style vertical snap feed with blurred backdrop and double-tap heart burst. | ✅ PASS |
| **MEDIA-05** | Media concurrency guarantee | Starting a video automatically pauses any background audio player. | ✅ PASS |

---

## 6. Layout, Container Queries & Visual Polish

| Test Case | Scenario / Steps | Expected Result | Status |
|---|---|---|:---:|
| **UI-01** | Mobile viewport (320px, 360px, 390px) | Zero horizontal scroll, safe-area padding respected, bottom nav visible. | ✅ PASS |
| **UI-02** | Tablet viewport (768px - 1099px) | Navigation relocates cleanly to left rail; center feed maintains readable column width. | ✅ PASS |
| **UI-03** | Desktop viewport (>=1100px) | 3-column layout active with LeftRail, CenterFeed, and RightPanel. | ✅ PASS |
| **UI-04** | Theme toggle (Dark / Light) | CSS variables (`--bg`, `--surface`, `--ink`, `--teal`, `--gold`) transition smoothly. | ✅ PASS |
| **UI-05** | CSS cleanliness | `scripts/check-css-duplicates.mjs` passes with zero conflicting duplicate rules. | ✅ PASS |

---

## 7. Observability, Health & Resilience

| Test Case | Scenario / Steps | Expected Result | Status |
|---|---|---|:---:|
| **OBS-01** | Query `GET /api/health` | Returns database status, latency in ms, and required env vars presence (names only, no secrets). | ✅ PASS |
| **OBS-02** | Log inspection in `serverLogger` | Phone numbers, passwords, Bearer tokens, and API keys are automatically scrubbed. | ✅ PASS |
| **OBS-03** | Simulated component crash inside section view | `<ErrorBoundary>` catches failure, shows encouraging Scripture fellowship UI with "Try Again" button without crashing entire app shell. | ✅ PASS |
