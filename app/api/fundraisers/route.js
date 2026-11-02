import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PUBLIC_STATUSES = ['active', 'completed', 'paused'];
const CATEGORIES = new Set(['Medical', 'Education', 'Church building', 'Missions', 'Relief', 'Community']);

function getUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw && /^https?:\/\//i.test(raw) && !raw.includes('placeholder')) return raw;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key && key.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8'));
      if (payload?.ref) return 'https://' + payload.ref + '.supabase.co';
    } catch {}
  }
  return null;
}

function db() {
  const url = getUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

function bearer(request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function sessionUser(request) {
  const token = bearer(request);
  const url = getUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !key) return null;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    return !error ? data?.user || null : null;
  } catch {
    return null;
  }
}

async function profile(supabase, userId) {
  if (!userId) return null;
  const { data } = await supabase.from('profiles')
    .select('id, display_name, avatar_url, role, badge, church_id, location_label')
    .eq('id', userId).maybeSingle();
  return data || null;
}

function isAdmin(p) {
  return p?.role === 'admin' || p?.role === 'platform_admin';
}

function normalized(row, owner = null, includePrivate = false) {
  if (!row) return null;
  const result = {
    ...row,
    owner_id: row.owner_id || row.creator_id || null,
    story_md: row.story_md || row.description || '',
    description: row.story_md || row.description || '',
    cover_url: row.cover_url || row.banner_url || row.image_url || null,
    goal_kes: Number(row.goal_kes ?? row.target_amount ?? 0),
    raised_kes: Number(row.raised_kes ?? row.raised_amount ?? 0),
    donors_count: Number(row.donors_count || 0),
    deadline: row.deadline || row.end_date || row.expires_at || null,
    owner: owner || null,
  };
  if (!includePrivate) delete result.verification_doc_url;
  return result;
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(String(value).trim());
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function ownerProfiles(supabase, rows) {
  const ids = [...new Set(rows.map((row) => row.owner_id || row.creator_id).filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase.from('profiles')
    .select('id, display_name, avatar_url, badge, badge_verified, role, church_id, location_label')
    .in('id', ids);
  if (error) throw error;
  return Object.fromEntries((data || []).map((item) => [item.id, item]));
}

async function requireAdmin(supabase, user) {
  if (!user?.id) return { error: 'Please sign in to continue.', status: 401 };
  const p = await profile(supabase, user.id);
  if (!isAdmin(p)) return { error: 'Administrator access is required.', status: 403 };
  return { profile: p };
}

async function campaignDetail(supabase, row, user, userProfile) {
  const ownerId = row.owner_id || row.creator_id;
  const isOwner = Boolean(user?.id && user.id === ownerId);
  const includePrivate = isOwner || isAdmin(userProfile);
  const owners = await ownerProfiles(supabase, [row]);
  const fundraiser = normalized(row, owners[ownerId], includePrivate);
  const [milestonesRes, updatesRes, donationsRes] = await Promise.all([
    supabase.from('fundraiser_milestones').select('*').eq('fundraiser_id', row.id).order('amount_kes', { ascending: true }),
    supabase.from('fundraiser_updates').select('id, fundraiser_id, author_id, body, media_url, created_at')
      .eq('fundraiser_id', row.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('fundraiser_donations')
      .select('id, fundraiser_id, display_name, anonymous, is_anonymous, amount_kes, message, status, created_at')
      .eq('fundraiser_id', row.id).in('status', ['succeeded', 'completed'])
      .order('created_at', { ascending: false }).limit(100),
  ]);
  if (milestonesRes.error) throw milestonesRes.error;
  if (updatesRes.error) throw updatesRes.error;
  if (donationsRes.error) throw donationsRes.error;
  const donations = (donationsRes.data || []).map((d) => {
    const anonymous = Boolean(d.anonymous ?? d.is_anonymous);
    return {
      id: d.id,
      fundraiser_id: d.fundraiser_id,
      display_name: anonymous ? 'Anonymous donor' : (d.display_name || 'A Shammah supporter'),
      anonymous,
      amount_kes: Number(d.amount_kes || 0),
      message: d.message || null,
      created_at: d.created_at,
    };
  });
  const donors = new Map();
  for (const d of donations) {
    if (d.anonymous) continue;
    const current = donors.get(d.display_name) || { id: d.display_name, display_name: d.display_name, amount_kes: 0 };
    current.amount_kes += d.amount_kes;
    donors.set(d.display_name, current);
  }
  return {
    ok: true,
    fundraiser,
    milestones: milestonesRes.data || [],
    updates: updatesRes.data || [],
    donations,
    recentDonors: donations.slice(0, 15),
    topDonors: [...donors.values()].sort((a, b) => b.amount_kes - a.amount_kes).slice(0, 10),
  };
}

export async function GET(request) {
  try {
    const supabase = db();
    if (!supabase) return NextResponse.json({ error: 'Fundraising storage is not configured.' }, { status: 503 });
    const user = await sessionUser(request);
    const userProfile = await profile(supabase, user?.id);
    const params = new URL(request.url).searchParams;
    const action = params.get('action') || 'list';

    if (action === 'check-donation') {
      const checkoutId = params.get('checkoutRequestId');
      const donationId = params.get('donationId');
      if (!checkoutId && !donationId) return NextResponse.json({ error: 'Donation reference is required.' }, { status: 400 });
      let query = supabase.from('fundraiser_donations').select('id, fundraiser_id, status, amount_kes, checkout_request_id, mpesa_transaction_id');
      if (checkoutId) query = query.eq('checkout_request_id', checkoutId);
      if (donationId) query = query.eq('id', donationId);
      const { data: donation, error } = await query.maybeSingle();
      if (error) throw error;
      if (!donation) return NextResponse.json({ error: 'Donation not found.' }, { status: 404 });
      if (params.get('fundraiserId') && params.get('fundraiserId') !== donation.fundraiser_id) {
        return NextResponse.json({ error: 'Donation reference mismatch.' }, { status: 400 });
      }
      const { data: row, error: rowError } = await supabase.from('fundraisers').select('*')
        .eq('id', donation.fundraiser_id).maybeSingle();
      if (rowError) throw rowError;
      return NextResponse.json({
        ok: true,
        status: donation.status === 'completed' ? 'succeeded' : donation.status,
        donationId: donation.id,
        checkoutRequestId: donation.checkout_request_id,
        receiptCode: ['succeeded', 'completed'].includes(donation.status) ? donation.mpesa_transaction_id : null,
        fundraiser: row ? normalized(row) : null,
      });
    }

    if (action === 'detail') {
      const id = params.get('id');
      if (!id) return NextResponse.json({ error: 'Fundraiser ID is required.' }, { status: 400 });
      const { data: row, error } = await supabase.from('fundraisers').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!row) return NextResponse.json({ error: 'Fundraiser not found.' }, { status: 404 });
      const ownerId = row.owner_id || row.creator_id;
      if (!PUBLIC_STATUSES.includes(row.status) && ownerId !== user?.id && !isAdmin(userProfile)) {
        return NextResponse.json({ error: 'Fundraiser not found.' }, { status: 404 });
      }
      return NextResponse.json(await campaignDetail(supabase, row, user, userProfile));
    }

    if (action === 'admin-list') {
      const auth = await requireAdmin(supabase, user);
      if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
      const [{ data: campaigns, error: campaignsError }, { data: withdrawals, error: withdrawalsError }] = await Promise.all([
        supabase.from('fundraisers').select('*').eq('status', 'pending_review').order('created_at', { ascending: true }),
        supabase.from('fundraiser_withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
      ]);
      if (campaignsError) throw campaignsError;
      if (withdrawalsError) throw withdrawalsError;
      const owners = await ownerProfiles(supabase, campaigns || []);
      const pendingCampaigns = await Promise.all((campaigns || []).map(async (row) => {
        let verificationDocSignedUrl = null;
        const ownerId = row.owner_id || row.creator_id;
        const path = String(row.verification_doc_url || '');
        if (path && ownerId && path.startsWith(ownerId + '/') && !path.includes('..')) {
          const { data: signed } = await supabase.storage.from('fundraiser-verification').createSignedUrl(path, 300);
          verificationDocSignedUrl = signed?.signedUrl || null;
        }
        return {
          ...normalized(row, owners[ownerId], true),
          verification_doc_signed_url: verificationDocSignedUrl,
        };
      }));
      const ids = [...new Set((withdrawals || []).map((w) => w.fundraiser_id).filter(Boolean))];
      const { data: related, error: relatedError } = ids.length
        ? await supabase.from('fundraisers').select('id, title').in('id', ids)
        : { data: [], error: null };
      if (relatedError) throw relatedError;
      const titles = Object.fromEntries((related || []).map((row) => [row.id, row.title]));
      return NextResponse.json({
        ok: true,
        pendingCampaigns,
        pendingWithdrawals: (withdrawals || []).map((w) => ({ ...w, fundraiser: { title: titles[w.fundraiser_id] || 'Fundraiser' } })),
      });
    }

    const category = params.get('category') || 'All';
    const sort = params.get('sort') || 'trending';
    const search = (params.get('search') || '').trim().toLowerCase().slice(0, 120);
    const { data: rows, error } = await supabase.from('fundraisers').select('*')
      .in('status', [...PUBLIC_STATUSES, ...(user?.id ? ['draft', 'pending_review', 'rejected'] : [])])
      .order('created_at', { ascending: false }).limit(250);
    if (error) throw error;
    const visibleRows = (rows || []).filter((row) =>
      PUBLIC_STATUSES.includes(row.status) ||
      (user?.id && (row.owner_id || row.creator_id) === user.id) ||
      isAdmin(userProfile)
    );
    const owners = await ownerProfiles(supabase, visibleRows);
    let fundraisers = visibleRows.map((row) => normalized(row, owners[row.owner_id || row.creator_id]));
    if (category !== 'All') fundraisers = fundraisers.filter((row) => row.category?.toLowerCase() === category.toLowerCase());
    if (search) fundraisers = fundraisers.filter((row) =>
      [row.title, row.story_md, row.beneficiary_name, row.location, row.category, row.owner?.display_name]
        .some((value) => String(value || '').toLowerCase().includes(search))
    );
    if (sort === 'newest') fundraisers.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sort === 'ending_soon') fundraisers.sort((a, b) => new Date(a.deadline || '2999-12-31') - new Date(b.deadline || '2999-12-31'));
    else if (sort === 'almost_funded') fundraisers.sort((a, b) => (b.raised_kes / Math.max(1, b.goal_kes)) - (a.raised_kes / Math.max(1, a.goal_kes)));
    else if (sort === 'goal_asc') fundraisers.sort((a, b) => a.goal_kes - b.goal_kes);
    else if (sort === 'goal_desc') fundraisers.sort((a, b) => b.goal_kes - a.goal_kes);
    else fundraisers.sort((a, b) => (b.donors_count - a.donors_count) || (b.raised_kes - a.raised_kes));

    const active = fundraisers.filter((row) => row.status === 'active');
    const daysLeft = (row) => row.deadline ? Math.ceil((new Date(row.deadline).getTime() - Date.now()) / 86400000) : Infinity;
    const urgent = active.filter((row) => daysLeft(row) >= 0 && daysLeft(row) <= 7).sort((a, b) => daysLeft(a) - daysLeft(b)).slice(0, 8);
    const featured = [...active].sort((a, b) => (b.raised_kes / Math.max(1, b.goal_kes)) - (a.raised_kes / Math.max(1, a.goal_kes)))[0] || null;
    const trending = [...active].sort((a, b) => (b.donors_count - a.donors_count) || (b.raised_kes - a.raised_kes)).slice(0, 8);
    const nearYou = userProfile?.church_id ? active.filter((row) => row.church_id === userProfile.church_id).slice(0, 8) : [];
    const myCampaigns = user?.id ? visibleRows.filter((row) => (row.owner_id || row.creator_id) === user.id).map((row) => normalized(row, owners[row.owner_id || row.creator_id], true)) : [];
    return NextResponse.json({ ok: true, fundraisers, urgent, featured, trending, nearYou, myCampaigns, totalCount: fundraisers.length });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unable to load fundraisers.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = db();
    if (!supabase) return NextResponse.json({ error: 'Fundraising storage is not configured.' }, { status: 503 });
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    const user = await sessionUser(request);
    const userProfile = await profile(supabase, user?.id);

    if (action === 'report') {
      const fundraiserId = String(body.fundraiserId || '');
      const reason = String(body.reason || 'other').trim().slice(0, 80);
      const details = String(body.details || '').trim().slice(0, 2000);
      if (!fundraiserId || !reason) return NextResponse.json({ error: 'Campaign and report reason are required.' }, { status: 400 });
      const { data: row, error: rowError } = await supabase.from('fundraisers').select('id').eq('id', fundraiserId).maybeSingle();
      if (rowError) throw rowError;
      if (!row) return NextResponse.json({ error: 'Fundraiser not found.' }, { status: 404 });
      const { data, error } = await supabase.from('fundraiser_reports').insert({
        fundraiser_id: fundraiserId, reporter_id: user?.id || null, reason, details: details || null, status: 'open',
      }).select('id, fundraiser_id, reason, status, created_at').single();
      if (error) throw error;
      return NextResponse.json({ ok: true, report: data }, { status: 201 });
    }

    if (!user?.id) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });

    if (action === 'create') {
      const title = String(body.title || '').trim().slice(0, 160);
      const story = String(body.storyMd || body.story_md || '').trim().slice(0, 20000);
      const category = String(body.category || 'Relief');
      const goal = Math.round(Number(body.goalKes ?? body.goal_kes ?? 0));
      const deadline = body.deadline ? String(body.deadline).slice(0, 10) : null;
      const beneficiary = String(body.beneficiaryName || body.beneficiary_name || '').trim().slice(0, 200);
      const location = String(body.location || '').trim().slice(0, 200);
      const cover = safeUrl(body.coverUrl || body.cover_url) || 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200&auto=format&fit=crop&q=80';
      const gallery = Array.isArray(body.gallery) ? body.gallery.slice(0, 10).map(safeUrl).filter(Boolean) : [cover];
      const verificationDocPath = String(body.verificationDocPath || '').trim();
      const verificationDocUrl = verificationDocPath.startsWith(user.id + '/') && !verificationDocPath.includes('..')
        ? verificationDocPath
        : null;
      const milestones = Array.isArray(body.milestones) ? body.milestones.slice(0, 20) : [];
      if (title.length < 5) return NextResponse.json({ error: 'Campaign title must be at least 5 characters.' }, { status: 400 });
      if (story.length < 25) return NextResponse.json({ error: 'Campaign story must be at least 25 characters.' }, { status: 400 });
      if (!CATEGORIES.has(category)) return NextResponse.json({ error: 'Choose a valid campaign category.' }, { status: 400 });
      if (!Number.isSafeInteger(goal) || goal < 100 || goal > 1000000000) return NextResponse.json({ error: 'Campaign goal must be between KES 100 and KES 1,000,000,000.' }, { status: 400 });
      if (deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(Date.parse(deadline)))) {
        return NextResponse.json({ error: 'Choose a valid campaign deadline.' }, { status: 400 });
      }
      const insertRow = {
        owner_id: user.id, creator_id: user.id, church_id: userProfile?.church_id || null,
        title, story_md: story, description: story, cover_url: cover, banner_url: cover, image_url: cover,
        gallery, category, goal_kes: goal, target_amount: goal, raised_kes: 0, raised_amount: 0,
        donors_count: 0, currency: 'KES', deadline, end_date: deadline ? deadline + 'T23:59:59.000Z' : null,
        expires_at: deadline ? deadline + 'T23:59:59.000Z' : null, status: 'pending_review',
        beneficiary_name: beneficiary || null, verified: false, accent: String(body.accent || '#10b981').slice(0, 20),
        location: location || null, verification_doc_url: verificationDocUrl,
      };
      const { data: row, error } = await supabase.from('fundraisers').insert(insertRow).select('*').single();
      if (error) throw error;
      const validMilestones = milestones.map((item) => ({
        fundraiser_id: row.id, amount_kes: Math.round(Number(item.amount)), label: String(item.label || '').trim().slice(0, 180),
      })).filter((item) => Number.isSafeInteger(item.amount_kes) && item.amount_kes >= 100 && item.label);
      if (validMilestones.length) {
        const { error: milestoneError } = await supabase.from('fundraiser_milestones').upsert(validMilestones, { onConflict: 'fundraiser_id,amount_kes', ignoreDuplicates: true });
        if (milestoneError) {
          await supabase.from('fundraisers').delete().eq('id', row.id).eq('owner_id', user.id);
          throw milestoneError;
        }
      }
      return NextResponse.json({ ok: true, fundraiser: normalized(row, userProfile, true), message: 'Campaign submitted for review.' }, { status: 201 });
    }

    if (action === 'update') {
      const fundraiserId = String(body.fundraiserId || '');
      const text = String(body.body || '').trim().slice(0, 5000);
      const mediaUrl = safeUrl(body.mediaUrl);
      if (!fundraiserId || text.length < 3) return NextResponse.json({ error: 'Campaign and update text are required.' }, { status: 400 });
      const { data: row, error: rowError } = await supabase.from('fundraisers').select('id, owner_id, creator_id')
        .eq('id', fundraiserId).maybeSingle();
      if (rowError) throw rowError;
      if (!row) return NextResponse.json({ error: 'Fundraiser not found.' }, { status: 404 });
      if ((row.owner_id || row.creator_id) !== user.id && !isAdmin(userProfile)) return NextResponse.json({ error: 'Only the campaign owner can post updates.' }, { status: 403 });
      const { data, error } = await supabase.from('fundraiser_updates').insert({
        fundraiser_id: fundraiserId, author_id: user.id, body: text, media_url: mediaUrl,
      }).select('*').single();
      if (error) throw error;
      return NextResponse.json({ ok: true, update: data }, { status: 201 });
    }

    if (action === 'withdrawal') {
      const fundraiserId = String(body.fundraiserId || '');
      const amount = Math.round(Number(body.amountKes || 0));
      const digits = String(body.mpesaPhone || '').replace(/\D/g, '');
      const phone = digits.startsWith('254') && digits.length === 12 ? digits : (digits.startsWith('0') && digits.length === 10 ? '254' + digits.slice(1) : null);
      if (!fundraiserId || !Number.isSafeInteger(amount) || amount < 100 || !phone) return NextResponse.json({ error: 'Enter a valid withdrawal amount and M-Pesa number.' }, { status: 400 });
      const { data: row, error: rowError } = await supabase.from('fundraisers').select('id, owner_id, creator_id, raised_kes, raised_amount')
        .eq('id', fundraiserId).maybeSingle();
      if (rowError) throw rowError;
      if (!row) return NextResponse.json({ error: 'Fundraiser not found.' }, { status: 404 });
      if ((row.owner_id || row.creator_id) !== user.id && !isAdmin(userProfile)) return NextResponse.json({ error: 'Only the campaign owner can request a withdrawal.' }, { status: 403 });
      const { data: existing, error: existingError } = await supabase.from('fundraiser_withdrawals')
        .select('amount_kes, status').eq('fundraiser_id', fundraiserId).in('status', ['pending', 'approved', 'disbursed']);
      if (existingError) throw existingError;
      const committed = (existing || []).reduce((sum, item) => sum + Number(item.amount_kes || 0), 0);
      const available = Math.max(0, Number(row.raised_kes ?? row.raised_amount ?? 0) - committed);
      if (amount > available) return NextResponse.json({ error: 'Withdrawal exceeds the available balance.' }, { status: 400 });
      const { data, error } = await supabase.from('fundraiser_withdrawals').insert({
        fundraiser_id: fundraiserId, amount_kes: amount, requested_by: user.id, mpesa_payout_phone: phone, status: 'pending',
      }).select('*').single();
      if (error) throw error;
      return NextResponse.json({ ok: true, withdrawal: data }, { status: 201 });
    }

    if (action === 'admin-review') {
      const auth = await requireAdmin(supabase, user);
      if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
      const targetType = String(body.targetType || '');
      const targetId = String(body.targetId || '');
      const decision = String(body.decision || '');
      const adminNote = String(body.adminNote || '').trim().slice(0, 2000) || null;
      if (!targetId || !['approve', 'reject'].includes(decision)) return NextResponse.json({ error: 'Choose a valid review decision.' }, { status: 400 });
      if (targetType === 'campaign') {
        const { data, error } = await supabase.from('fundraisers').update({
          status: decision === 'approve' ? 'active' : 'rejected', verified: decision === 'approve', updated_at: new Date().toISOString(),
        }).eq('id', targetId).eq('status', 'pending_review').select('*').maybeSingle();
        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Campaign is no longer awaiting review.' }, { status: 409 });
        return NextResponse.json({ ok: true, fundraiser: normalized(data, null, true) });
      }
      if (targetType === 'withdrawal') {
        const { data, error } = await supabase.from('fundraiser_withdrawals').update({
          status: decision === 'approve' ? 'approved' : 'rejected', admin_note: adminNote, updated_at: new Date().toISOString(),
        }).eq('id', targetId).eq('status', 'pending').select('*').maybeSingle();
        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Withdrawal is no longer awaiting review.' }, { status: 409 });
        return NextResponse.json({ ok: true, withdrawal: data });
      }
      return NextResponse.json({ error: 'Unsupported review target.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unsupported fundraiser action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Unable to process fundraiser request.' }, { status: 500 });
  }
}
