-- Shammah Fundraisers: legacy-schema compatibility, safe donation crediting and RLS.
-- Idempotent. Apply manually in Supabase SQL Editor; do not use supabase db push.

begin;

create extension if not exists pgcrypto;

alter table public.fundraisers
  add column if not exists owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists story_md text not null default '',
  add column if not exists cover_url text,
  add column if not exists gallery jsonb not null default '[]'::jsonb,
  add column if not exists goal_kes bigint not null default 10000,
  add column if not exists raised_kes bigint not null default 0,
  add column if not exists donors_count integer not null default 0,
  add column if not exists deadline date,
  add column if not exists beneficiary_name text,
  add column if not exists verified boolean not null default false,
  add column if not exists accent text default '#10b981',
  add column if not exists location text,
  add column if not exists verification_doc_url text,
  add column if not exists church_name text,
  add column if not exists image_url text,
  add column if not exists expires_at timestamptz,
  add column if not exists gallery_updated_at timestamptz;

alter table public.fundraiser_donations
  add column if not exists idempotency_key text,
  add column if not exists merchant_request_id text,
  add column if not exists mpesa_receipt text,
  add column if not exists amount numeric not null default 100,
  add column if not exists currency text not null default 'KES',
  add column if not exists is_anonymous boolean not null default false;

alter table public.fundraiser_reports
  add column if not exists status text not null default 'open',
  add column if not exists actioned_by uuid references public.profiles(id) on delete set null,
  add column if not exists actioned_at timestamptz;

alter table public.fundraiser_withdrawals
  add column if not exists mpesa_payout_phone text not null default '',
  add column if not exists admin_note text,
  add column if not exists updated_at timestamptz not null default now();

-- Keep the new and legacy column names synchronized. The existing schema has
-- NOT NULL legacy columns (creator_id, description, target_amount, currency).
create or replace function public.sync_fundraiser_legacy_columns()
returns trigger
language plpgsql
set search_path = public
as $sync_fundraiser$
begin
  if tg_op = 'INSERT' then
    new.owner_id := coalesce(new.owner_id, new.creator_id);
    new.creator_id := coalesce(new.creator_id, new.owner_id);

    if nullif(btrim(coalesce(new.story_md, '')), '') is null then
      new.story_md := coalesce(new.description, '');
    end if;
    if nullif(btrim(coalesce(new.description, '')), '') is null then
      new.description := coalesce(new.story_md, '');
    end if;
    if new.story_md is distinct from new.description then
      if nullif(btrim(coalesce(new.story_md, '')), '') is not null then
        new.description := new.story_md;
      else
        new.story_md := new.description;
      end if;
    end if;

    if new.target_amount is not null and (new.goal_kes is null or new.goal_kes = 10000) then
      new.goal_kes := round(new.target_amount)::bigint;
    end if;
    new.goal_kes := coalesce(new.goal_kes, round(new.target_amount)::bigint, 10000);
    new.target_amount := coalesce(new.target_amount, new.goal_kes::numeric);

    if new.raised_amount is not null and (new.raised_kes is null or new.raised_kes = 0) then
      new.raised_kes := round(new.raised_amount)::bigint;
    end if;
    new.raised_kes := coalesce(new.raised_kes, round(new.raised_amount)::bigint, 0);
    new.raised_amount := coalesce(new.raised_amount, new.raised_kes::numeric);

    new.cover_url := coalesce(new.cover_url, new.banner_url, new.image_url);
    new.banner_url := coalesce(new.banner_url, new.cover_url);
    new.image_url := coalesce(new.image_url, new.cover_url);
    new.deadline := coalesce(new.deadline, new.end_date::date, new.expires_at::date);
    new.end_date := coalesce(new.end_date, new.deadline::timestamptz);
    new.expires_at := coalesce(new.expires_at, new.deadline::timestamptz);
    new.gallery := coalesce(new.gallery, '[]'::jsonb);
    new.currency := coalesce(nullif(new.currency, ''), 'KES');
    new.donors_count := greatest(coalesce(new.donors_count, 0), 0);
    new.accent := coalesce(new.accent, '#10b981');
  else
    if new.owner_id is distinct from old.owner_id then
      new.creator_id := new.owner_id;
    elsif new.creator_id is distinct from old.creator_id then
      new.owner_id := new.creator_id;
    else
      new.owner_id := coalesce(new.owner_id, new.creator_id);
      new.creator_id := coalesce(new.creator_id, new.owner_id);
    end if;

    if new.story_md is distinct from old.story_md then
      new.description := new.story_md;
    elsif new.description is distinct from old.description then
      new.story_md := new.description;
    end if;

    if new.goal_kes is distinct from old.goal_kes then
      new.target_amount := new.goal_kes::numeric;
    elsif new.target_amount is distinct from old.target_amount then
      new.goal_kes := round(new.target_amount)::bigint;
    end if;

    if new.raised_kes is distinct from old.raised_kes then
      new.raised_amount := new.raised_kes::numeric;
    elsif new.raised_amount is distinct from old.raised_amount then
      new.raised_kes := round(new.raised_amount)::bigint;
    end if;

    if new.cover_url is distinct from old.cover_url then
      new.banner_url := new.cover_url;
      new.image_url := new.cover_url;
    elsif new.banner_url is distinct from old.banner_url then
      new.cover_url := new.banner_url;
      new.image_url := new.banner_url;
    end if;

    if new.deadline is distinct from old.deadline then
      new.end_date := new.deadline::timestamptz;
      new.expires_at := new.deadline::timestamptz;
    elsif new.end_date is distinct from old.end_date then
      new.deadline := new.end_date::date;
      new.expires_at := new.end_date;
    elsif new.expires_at is distinct from old.expires_at then
      new.deadline := new.expires_at::date;
      new.end_date := new.expires_at;
    end if;
  end if;

  return new;
end;
$sync_fundraiser$;

drop trigger if exists sync_fundraiser_legacy_columns on public.fundraisers;
create trigger sync_fundraiser_legacy_columns
before insert or update on public.fundraisers
for each row execute function public.sync_fundraiser_legacy_columns();

create or replace function public.sync_fundraiser_donation_legacy_columns()
returns trigger
language plpgsql
set search_path = public
as $sync_donation$
begin
  if tg_op = 'INSERT' then
    if new.amount_kes is null or (new.amount_kes = 10 and new.amount is not null and new.amount <> 100) then
      new.amount_kes := greatest(10, round(coalesce(new.amount, new.amount_kes, 10))::bigint);
    end if;
    new.amount := coalesce(new.amount, new.amount_kes::numeric);
    if new.amount <> new.amount_kes::numeric then
      new.amount := new.amount_kes::numeric;
    end if;
    new.anonymous := coalesce(new.anonymous, new.is_anonymous, false);
    new.is_anonymous := coalesce(new.anonymous, new.is_anonymous, false);
    new.mpesa_transaction_id := coalesce(new.mpesa_transaction_id, new.mpesa_receipt);
    new.mpesa_receipt := coalesce(new.mpesa_receipt, new.mpesa_transaction_id);
    new.currency := coalesce(nullif(new.currency, ''), 'KES');
  else
    if new.amount_kes is distinct from old.amount_kes then
      new.amount := new.amount_kes::numeric;
    elsif new.amount is distinct from old.amount then
      new.amount_kes := greatest(10, round(new.amount)::bigint);
    end if;
    if new.anonymous is distinct from old.anonymous then
      new.is_anonymous := new.anonymous;
    elsif new.is_anonymous is distinct from old.is_anonymous then
      new.anonymous := new.is_anonymous;
    end if;
    if new.mpesa_transaction_id is distinct from old.mpesa_transaction_id then
      new.mpesa_receipt := new.mpesa_transaction_id;
    elsif new.mpesa_receipt is distinct from old.mpesa_receipt then
      new.mpesa_transaction_id := new.mpesa_receipt;
    end if;
  end if;
  return new;
end;
$sync_donation$;

drop trigger if exists sync_fundraiser_donation_legacy_columns on public.fundraiser_donations;
create trigger sync_fundraiser_donation_legacy_columns
before insert or update on public.fundraiser_donations
for each row execute function public.sync_fundraiser_donation_legacy_columns();

-- Reconcile the zero-row/legacy schema before installing the current checks.
update public.fundraisers
set owner_id = coalesce(owner_id, creator_id),
    creator_id = coalesce(creator_id, owner_id),
    story_md = coalesce(nullif(story_md, ''), description, ''),
    description = coalesce(nullif(description, ''), story_md, ''),
    goal_kes = coalesce(goal_kes, round(target_amount)::bigint, 10000),
    target_amount = coalesce(target_amount, goal_kes::numeric),
    raised_kes = coalesce(raised_kes, round(raised_amount)::bigint, 0),
    raised_amount = coalesce(raised_amount, raised_kes::numeric),
    cover_url = coalesce(cover_url, banner_url, image_url),
    banner_url = coalesce(banner_url, cover_url, image_url),
    image_url = coalesce(image_url, cover_url, banner_url),
    deadline = coalesce(deadline, end_date::date, expires_at::date),
    end_date = coalesce(end_date, deadline::timestamptz, expires_at),
    expires_at = coalesce(expires_at, deadline::timestamptz, end_date),
    donors_count = greatest(coalesce(donors_count, 0), 0),
    gallery = coalesce(gallery, '[]'::jsonb),
    currency = coalesce(nullif(currency, ''), 'KES');

update public.fundraiser_donations
set amount_kes = greatest(10, round(coalesce(amount_kes, amount, 10))::bigint),
    amount = greatest(10, round(coalesce(amount_kes, amount, 10))::bigint),
    anonymous = coalesce(anonymous, is_anonymous, false),
    is_anonymous = coalesce(anonymous, is_anonymous, false),
    mpesa_transaction_id = coalesce(mpesa_transaction_id, mpesa_receipt),
    mpesa_receipt = coalesce(mpesa_receipt, mpesa_transaction_id),
    currency = coalesce(nullif(currency, ''), 'KES');

alter table public.fundraisers drop constraint if exists fundraisers_category_check;
alter table public.fundraisers add constraint fundraisers_category_check
  check (category in ('Medical', 'Education', 'Church building', 'Missions', 'Relief', 'Community',
                      'Church Build', 'Youth', 'Community Outreach', 'General')) not valid;
alter table public.fundraisers validate constraint fundraisers_category_check;

alter table public.fundraisers drop constraint if exists fundraisers_status_check;
alter table public.fundraisers add constraint fundraisers_status_check
  check (status in ('draft', 'pending_review', 'active', 'paused', 'completed', 'rejected', 'cancelled')) not valid;
alter table public.fundraisers validate constraint fundraisers_status_check;

alter table public.fundraiser_donations drop constraint if exists fundraiser_donations_status_check;
alter table public.fundraiser_donations add constraint fundraiser_donations_status_check
  check (status in ('pending', 'succeeded', 'failed', 'completed')) not valid;
alter table public.fundraiser_donations validate constraint fundraiser_donations_status_check;

alter table public.fundraiser_withdrawals drop constraint if exists fundraiser_withdrawals_status_check;
alter table public.fundraiser_withdrawals add constraint fundraiser_withdrawals_status_check
  check (status in ('pending', 'approved', 'rejected', 'disbursed')) not valid;
alter table public.fundraiser_withdrawals validate constraint fundraiser_withdrawals_status_check;

alter table public.fundraiser_reports drop constraint if exists fundraiser_reports_status_check;
alter table public.fundraiser_reports add constraint fundraiser_reports_status_check
  check (status in ('open', 'reviewing', 'resolved', 'dismissed')) not valid;
alter table public.fundraiser_reports validate constraint fundraiser_reports_status_check;

create unique index if not exists fundraiser_donations_idempotency_key_uidx
  on public.fundraiser_donations(idempotency_key) where idempotency_key is not null;
create unique index if not exists fundraiser_donations_checkout_request_uidx
  on public.fundraiser_donations(checkout_request_id) where checkout_request_id is not null;
create unique index if not exists fundraiser_milestones_fundraiser_amount_uidx
  on public.fundraiser_milestones(fundraiser_id, amount_kes);
create index if not exists fundraisers_public_sort_idx
  on public.fundraisers(status, created_at desc);
create index if not exists fundraiser_donations_public_wall_idx
  on public.fundraiser_donations(fundraiser_id, status, created_at desc);
create index if not exists fundraiser_updates_feed_idx
  on public.fundraiser_updates(fundraiser_id, created_at desc);
create index if not exists fundraiser_withdrawals_owner_idx
  on public.fundraiser_withdrawals(fundraiser_id, status);

-- Database-backed donation rate limit: five attempts per phone/IP key in 15 minutes.
create table if not exists public.fundraiser_donation_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.fundraiser_donation_rate_limits enable row level security;
revoke all on public.fundraiser_donation_rate_limits from anon, authenticated;

create or replace function public.reserve_fundraiser_donation_attempt(
  p_rate_key text,
  p_max_attempts integer default 5,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $rate_limit$
declare
  v_attempts integer;
begin
  if p_rate_key is null or length(p_rate_key) < 20 then
    return false;
  end if;
  insert into public.fundraiser_donation_rate_limits(rate_key, window_started_at, attempts, updated_at)
  values (p_rate_key, now(), 1, now())
  on conflict (rate_key) do update
  set attempts = case
        when public.fundraiser_donation_rate_limits.window_started_at
             < now() - make_interval(secs => greatest(1, p_window_seconds))
          then 1
        else public.fundraiser_donation_rate_limits.attempts + 1
      end,
      window_started_at = case
        when public.fundraiser_donation_rate_limits.window_started_at
             < now() - make_interval(secs => greatest(1, p_window_seconds))
          then now()
        else public.fundraiser_donation_rate_limits.window_started_at
      end,
      updated_at = now()
  returning attempts into v_attempts;
  return v_attempts <= greatest(1, p_max_attempts);
end;
$rate_limit$;

revoke all on function public.reserve_fundraiser_donation_attempt(text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_fundraiser_donation_attempt(text, integer, integer) to service_role;

-- Atomic and replay-safe: only the trusted callback may call this through service_role.
create or replace function public.credit_donation(
  p_donation_id uuid,
  p_mpesa_receipt text,
  p_amount_kes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $credit_donation$
declare
  v_donation public.fundraiser_donations%rowtype;
  v_fundraiser public.fundraisers%rowtype;
  v_new_raised bigint;
  v_new_donors integer;
  v_completed boolean := false;
begin
  select * into v_donation
  from public.fundraiser_donations
  where id = p_donation_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Donation record not found.');
  end if;

  if v_donation.status in ('succeeded', 'completed') then
    return jsonb_build_object('success', true, 'replayed', true, 'status', 'succeeded',
      'donation_id', v_donation.id, 'fundraiser_id', v_donation.fundraiser_id);
  end if;

  if v_donation.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'Donation is not pending.');
  end if;

  if p_mpesa_receipt is null or btrim(p_mpesa_receipt) = '' then
    return jsonb_build_object('success', false, 'error', 'A verified M-Pesa receipt is required.');
  end if;

  if p_amount_kes is null or p_amount_kes < 10 or p_amount_kes <> v_donation.amount_kes then
    return jsonb_build_object('success', false, 'error', 'Callback amount does not match the pending donation.');
  end if;

  select * into v_fundraiser
  from public.fundraisers
  where id = v_donation.fundraiser_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Associated fundraiser not found.');
  end if;

  update public.fundraiser_donations
  set status = 'succeeded',
      mpesa_transaction_id = p_mpesa_receipt,
      mpesa_receipt = p_mpesa_receipt,
      amount_kes = p_amount_kes,
      amount = p_amount_kes::numeric
  where id = p_donation_id;

  v_new_raised := coalesce(v_fundraiser.raised_kes, 0) + p_amount_kes;
  v_new_donors := coalesce(v_fundraiser.donors_count, 0) + 1;
  v_completed := v_new_raised >= coalesce(v_fundraiser.goal_kes, v_fundraiser.target_amount::bigint, 10000);

  update public.fundraisers
  set raised_kes = v_new_raised,
      raised_amount = v_new_raised::numeric,
      donors_count = v_new_donors,
      status = case when v_completed and status = 'active' then 'completed' else status end,
      updated_at = now()
  where id = v_fundraiser.id;

  update public.fundraiser_milestones
  set reached_at = now()
  where fundraiser_id = v_fundraiser.id
    and amount_kes <= v_new_raised
    and reached_at is null;

  return jsonb_build_object(
    'success', true,
    'donation_id', p_donation_id,
    'fundraiser_id', v_fundraiser.id,
    'new_raised_kes', v_new_raised,
    'new_donors_count', v_new_donors,
    'completed', v_completed
  );
end;
$credit_donation$;

create or replace function public.credit_fundraiser_donation(
  p_donation_id text,
  p_mpesa_receipt text,
  p_amount_kes numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $credit_legacy$
begin
  return public.credit_donation(p_donation_id::uuid, p_mpesa_receipt, round(p_amount_kes)::bigint);
exception when invalid_text_representation then
  return jsonb_build_object('success', false, 'error', 'Invalid donation ID.');
end;
$credit_legacy$;

revoke all on function public.credit_donation(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.credit_donation(uuid, text, bigint) to service_role;
revoke all on function public.credit_fundraiser_donation(text, text, numeric) from public, anon, authenticated;
grant execute on function public.credit_fundraiser_donation(text, text, numeric) to service_role;

-- Replace the previously permissive policies with read-only policies. All writes
-- flow through server routes/RPCs using the service role and validated ownership.
do $policy_cleanup$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'fundraisers', 'fundraiser_donations', 'fundraiser_milestones',
        'fundraiser_updates', 'fundraiser_withdrawals', 'fundraiser_reports',
        'fundraiser_contributions'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end;
$policy_cleanup$;

alter table public.fundraisers enable row level security;
alter table public.fundraiser_donations enable row level security;
alter table public.fundraiser_milestones enable row level security;
alter table public.fundraiser_updates enable row level security;
alter table public.fundraiser_withdrawals enable row level security;
alter table public.fundraiser_reports enable row level security;
alter table public.fundraiser_contributions enable row level security;

create policy "Public can read active fundraiser summaries"
on public.fundraisers for select to anon, authenticated
using (
  status in ('active', 'completed', 'paused')
  or owner_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'platform_admin'))
);

create policy "Public can read milestones for visible fundraisers"
on public.fundraiser_milestones for select to anon, authenticated
using (
  exists (
    select 1 from public.fundraisers f
    where f.id = fundraiser_id
      and (f.status in ('active', 'completed', 'paused') or f.owner_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'platform_admin')))
  )
);

create policy "Public can read updates for visible fundraisers"
on public.fundraiser_updates for select to anon, authenticated
using (
  exists (
    select 1 from public.fundraisers f
    where f.id = fundraiser_id
      and (f.status in ('active', 'completed', 'paused') or f.owner_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'platform_admin')))
  )
);

create policy "Owners and admins can read fundraiser withdrawals"
on public.fundraiser_withdrawals for select to authenticated
using (
  exists (select 1 from public.fundraisers f where f.id = fundraiser_id and f.owner_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'platform_admin'))
);

create policy "Admins can read fundraiser reports"
on public.fundraiser_reports for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'platform_admin')));

-- No direct client access to sensitive donation/ledger rows or legacy contribution rows.
revoke all on public.fundraiser_donations from anon, authenticated;
revoke all on public.fundraiser_contributions from anon, authenticated;
revoke insert, update, delete on public.fundraisers from anon, authenticated;
revoke insert, update, delete on public.fundraiser_milestones from anon, authenticated;
revoke insert, update, delete on public.fundraiser_updates from anon, authenticated;
revoke insert, update, delete on public.fundraiser_withdrawals from anon, authenticated;
revoke insert, update, delete on public.fundraiser_reports from anon, authenticated;

-- Private storage for campaign verification documents.
insert into storage.buckets (id, name, public)
values ('fundraiser-verification', 'fundraiser-verification', false)
on conflict (id) do update set public = false;

drop policy if exists "Fundraiser owners upload verification documents" on storage.objects;
create policy "Fundraiser owners upload verification documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fundraiser-verification'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Fundraiser owners and admins read verification documents" on storage.objects;
create policy "Fundraiser owners and admins read verification documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'fundraiser-verification'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'platform_admin'))
  )
);

commit;
