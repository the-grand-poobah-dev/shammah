'use client';

import { supabase } from '../../lib/supabaseClient';
import { WORKSPACE_PLAN_KEY, WORKSPACE_PLAN_PRICE_KES } from './churchConfig';

/**
 * Fetch church workspace items that the current user is permitted to see.
 * RLS enforces visibility: public, members, followers, or church admin.
 */
export async function fetchChurchWorkspaceItems({ churchId = null, kind = null } = {}) {
  try {
    let query = supabase
      .from('church_workspace_items')
      .select('id, church_id, kind, title, description, google_id, share_url, visibility, starts_at, ends_at, created_by, created_at')
      .order('created_at', { ascending: false });

    if (churchId) {
      query = query.eq('church_id', churchId);
    }
    if (kind) {
      query = query.eq('kind', kind);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Could not fetch church workspace items:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Error fetching workspace items:', err);
    return [];
  }
}

/**
 * Save a newly created Google Workspace item to the church's shared repository.
 */
export async function saveChurchWorkspaceItem({
  churchId,
  kind,
  title,
  description = '',
  googleId = '',
  shareUrl,
  visibility = 'public',
  startsAt = null,
  endsAt = null,
  userId = null,
}) {
  if (!churchId || !kind || !title || !shareUrl) {
    throw new Error('Missing required fields for church workspace item.');
  }

  const payload = {
    church_id: String(churchId),
    kind,
    title: title.trim(),
    description: description ? description.trim() : null,
    google_id: googleId || null,
    share_url: shareUrl.trim(),
    visibility: ['public', 'members', 'followers'].includes(visibility) ? visibility : 'public',
    starts_at: startsAt || null,
    ends_at: endsAt || null,
    created_by: userId || null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('church_workspace_items')
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to save workspace item to church repository.');
  }

  return data;
}

/**
 * Delete a shared church workspace item.
 */
export async function deleteChurchWorkspaceItem(itemId) {
  if (!itemId) return;
  const { error } = await supabase
    .from('church_workspace_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    throw new Error(error.message || 'Failed to delete church workspace item.');
  }
}

/**
 * Check if a church has an active Workspace Premium plan.
 * Verified against Supabase database function & subscriptions table.
 */
export async function checkChurchWorkspacePlan(churchId) {
  if (!churchId) return false;

  try {
    // 1. Database RPC check
    const { data: rpcHasPlan, error: rpcErr } = await supabase.rpc(
      'church_has_workspace_plan',
      { p_church_id: String(churchId) }
    );
    if (!rpcErr && rpcHasPlan != null) {
      return Boolean(rpcHasPlan);
    }
  } catch {
    // Fall back to direct query
  }

  try {
    // 2. Direct query check on subscriptions
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, plan_id, status, period_ends_at')
      .eq('church_id', churchId)
      .in('status', ['confirmed', 'active'])
      .maybeSingle();

    if (sub) {
      const isUnexpired = !sub.period_ends_at || new Date(sub.period_ends_at) > new Date();
      if (isUnexpired) return true;
    }

    // 3. Church table status check
    const { data: church } = await supabase
      .from('churches')
      .select('subscription_status, subscription_plan')
      .eq('id', churchId)
      .maybeSingle();

    if (church && church.subscription_status === 'active') {
      if (
        church.subscription_plan === WORKSPACE_PLAN_KEY ||
        church.subscription_plan === 'advanced' ||
        church.subscription_plan === 'popular'
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
