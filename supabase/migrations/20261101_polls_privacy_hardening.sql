-- Polls privacy hardening.
-- Polls are read through /api/polls, which enforces visibility and masks quiz answers.
-- Direct table reads would expose voter IDs, anonymous ballot metadata, and quiz answers.

begin;

alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.quiz_scores enable row level security;

drop policy if exists "poll_votes_select_public" on public.poll_votes;
drop policy if exists "Anyone can read poll votes" on public.poll_votes;
drop policy if exists "Users can read poll votes" on public.poll_votes;
drop policy if exists "quiz_scores_select_all" on public.quiz_scores;
drop policy if exists "poll_options_select_all" on public.poll_options;
drop policy if exists "poll options readable by signed-in users" on public.poll_options;

-- No browser role needs direct table SELECT. The API uses the server-side key and
-- returns only data allowed by poll visibility, anonymity, and quiz reveal settings.
revoke all privileges on table public.poll_options, public.poll_votes, public.quiz_scores
  from anon, authenticated;

commit;
