// Mentions & Post Tagging Utilities
// Preserves and extends core mention parsing with post tagging,
// feelings catalog, and privacy eligibility checks.

import { supabase } from '../../lib/supabaseClient';

// Looks at the text up to the cursor and returns the partial name being typed
// after an "@", or null if the cursor isn't in the middle of typing a mention.
// "Hey @gr" -> "gr"   |   "Hey @grace, thanks" (cursor after "thanks") -> null
export function detectMentionQuery(text, cursorPos) {
  const head = text.slice(0, cursorPos);
  const match = head.match(/(^|\s)@([^\s@]{0,30})$/);
  return match ? match[2] : null;
}

// Replaces the partial "@quer" the person just typed with the full "@Name ",
// and returns where the cursor should land afterwards.
export function insertMention(text, cursorPos, displayName) {
  const head = text.slice(0, cursorPos);
  const tail = text.slice(cursorPos);
  const match = head.match(/(^|\s)@([^\s@]{0,30})$/);
  if (!match) return { text, cursorPos };
  const start = match.index + match[1].length;
  const inserted = '@' + displayName + ' ';
  const newHead = head.slice(0, start) + inserted;
  return { text: newHead + tail, cursorPos: newHead.length };
}

// Splits comment text into plain strings and { mention: name } markers, so a
// component can render the names in bold without re-parsing the text itself.
// Longer names are matched first so "Grace Wanjiku" isn't cut off by a
// coincidental separate mention of "Grace".
export function splitMentions(text, names) {
  const unique = Array.from(new Set((names || []).filter(Boolean)));
  if (unique.length === 0) return [text];
  unique.sort((a, b) => b.length - a.length);
  const pattern = unique.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp('@(' + pattern + ')(?=[\\s.,!?;:]|$)', 'g');
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ mention: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ============================================================================
// Post Feelings Catalog (Curated Faith-Centered Feelings + Custom Text Support)
// ============================================================================
export const FEELINGS_LIST = [
  { id: 'blessed', label: 'Blessed', emoji: '🙏' },
  { id: 'grateful', label: 'Grateful', emoji: '✨' },
  { id: 'prayerful', label: 'Prayerful', emoji: '🕊️' },
  { id: 'joyful', label: 'Joyful', emoji: '😊' },
  { id: 'peaceful', label: 'Peaceful', emoji: '🌿' },
  { id: 'inspired', label: 'Inspired', emoji: '💡' },
  { id: 'victorious', label: 'Victorious', emoji: '🏆' },
  { id: 'hopeful', label: 'Hopeful', emoji: '🌅' },
  { id: 'loved', label: 'Loved', emoji: '❤️' },
  { id: 'worshipful', label: 'Worshipful', emoji: '🎶' },
  { id: 'reflective', label: 'Reflective', emoji: '📖' },
  { id: 'strengthened', label: 'Strengthened', emoji: '💪' },
  { id: 'comforted', label: 'Comforted', emoji: '🫂' },
  { id: 'encouraged', label: 'Encouraged', emoji: '🔥' },
];

export function formatFeelingString(feeling) {
  if (!feeling) return null;
  if (typeof feeling === 'string') return feeling;
  const label = feeling.label || '';
  const emoji = feeling.emoji || '';
  return `${label} ${emoji}`.trim();
}

// ============================================================================
// Member Tagging Privacy & Eligibility Rules
// ============================================================================

/**
 * Checks whether an author can tag targetProfile based on targetProfile's privacy rules:
 * - who_can_tag_me: 'everyone' | 'following' | 'no_one'
 * - review_tags: boolean
 */
export function canTagMember(targetProfile, authorId, targetFollowsAuthor = false) {
  if (!targetProfile || !targetProfile.id) {
    return { allowed: false, reason: 'Invalid member' };
  }
  if (targetProfile.id === authorId) {
    return { allowed: false, reason: 'You cannot tag yourself' };
  }
  const pref = targetProfile.who_can_tag_me || 'everyone';
  if (pref === 'no_one') {
    return { allowed: false, reason: 'Does not allow tagging' };
  }
  if (pref === 'following' && !targetFollowsAuthor) {
    return { allowed: false, reason: 'Only accepts tags from people they follow' };
  }
  return {
    allowed: true,
    requiresReview: Boolean(targetProfile.review_tags),
  };
}

const LOCAL_POST_TAGS_KEY = 'shammah_local_post_tags_v1';

function getLocalPostTags() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_POST_TAGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPostTags(tags) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_POST_TAGS_KEY, JSON.stringify(tags));
    window.dispatchEvent(new CustomEvent('shammah:post-tags-updated'));
  } catch {}
}

/**
 * Fetches eligible members for tagging:
 * Author can tag members they follow or who follow them.
 */
export async function fetchEligibleTagMembers(authorId) {
  if (!authorId) return [];

  try {
    // 1. Fetch both directions from follows table
    const [followingRes, followersRes] = await Promise.all([
      supabase.from('follows').select('followed_id').eq('follower_id', authorId),
      supabase.from('follows').select('follower_id').eq('followed_id', authorId),
    ]);

    const targetFollowsAuthorSet = new Set((followersRes.data || []).map((r) => r.follower_id));
    const allUserIds = new Set([
      ...(followingRes.data || []).map((r) => r.followed_id),
      ...targetFollowsAuthorSet,
    ]);
    allUserIds.delete(authorId);

    const ids = Array.from(allUserIds);
    if (ids.length === 0) return [];

    // 2. Fetch profiles of eligible users
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, badge, badge_verified, role, who_can_tag_me, review_tags')
      .in('id', ids);

    if (error || !profiles) {
      console.warn('Failed to load eligible profiles for tagging from Supabase:', error?.message);
      return [];
    }

    return profiles.map((p) => {
      const targetFollows = targetFollowsAuthorSet.has(p.id);
      const check = canTagMember(p, authorId, targetFollows);
      return {
        ...p,
        targetFollowsAuthor: targetFollows,
        allowed: check.allowed,
        reason: check.reason || null,
        requiresReview: check.requiresReview || false,
      };
    });
  } catch (err) {
    console.error('Error in fetchEligibleTagMembers:', err);
    return [];
  }
}

/**
 * Inserts post tags into Supabase post_tags table (and mirrors to local storage cache)
 */
export async function createPostTags({ postId, authorId, taggedUsers }) {
  if (!postId || !authorId || !Array.isArray(taggedUsers) || taggedUsers.length === 0) {
    return [];
  }

  const tagsToInsert = taggedUsers.map((u) => ({
    post_id: postId,
    tagged_user: u.id,
    tagged_by: authorId,
    status: u.requiresReview ? 'pending' : 'accepted',
    created_at: new Date().toISOString(),
  }));

  // Update local cache immediately
  const localList = getLocalPostTags();
  const existingFiltered = localList.filter((t) => t.post_id !== postId);
  const hydratedLocalTags = tagsToInsert.map((t, idx) => {
    const userMeta = taggedUsers.find((u) => u.id === t.tagged_user) || {};
    return {
      ...t,
      id: `tag-${postId}-${t.tagged_user}`,
      profiles: {
        id: userMeta.id,
        display_name: userMeta.display_name || userMeta.name || 'Member',
        avatar_url: userMeta.avatar_url || null,
        badge: userMeta.badge || null,
        badge_verified: Boolean(userMeta.badge_verified),
        role: userMeta.role || 'member',
      },
    };
  });
  saveLocalPostTags([...hydratedLocalTags, ...existingFiltered]);

  try {
    const { data, error } = await supabase
      .from('post_tags')
      .insert(tagsToInsert)
      .select('id, post_id, tagged_user, tagged_by, status, created_at');

    if (error) {
      console.warn('post_tags insert returned error (using local cache):', error.message);
    }
    return data || hydratedLocalTags;
  } catch (err) {
    console.error('Failed to insert post_tags in Supabase:', err);
    return hydratedLocalTags;
  }
}

/**
 * Fetches tags for a specific post (joined with tagged profile)
 */
export async function fetchTagsForPost(postId, currentUserId = null) {
  if (!postId) return [];

  // Check Supabase first
  try {
    const { data, error } = await supabase
      .from('post_tags')
      .select('id, post_id, tagged_user, tagged_by, status, created_at, profiles!tagged_user(id, display_name, avatar_url, badge, badge_verified, role)')
      .eq('post_id', postId);

    if (!error && Array.isArray(data) && data.length > 0) {
      // Filter according to visibility rules:
      // - accepted tags are public
      // - pending or declined are visible ONLY to the tagged user or author
      return data.filter((t) => {
        if (t.status === 'accepted') return true;
        if (currentUserId && (t.tagged_user === currentUserId || t.tagged_by === currentUserId)) {
          return true;
        }
        return false;
      });
    }

    if (error) {
      // Fallback query without relationship join
      const { data: rawTags, error: rawError } = await supabase
        .from('post_tags')
        .select('id, post_id, tagged_user, tagged_by, status, created_at')
        .eq('post_id', postId);
      if (!rawError && Array.isArray(rawTags) && rawTags.length > 0) {
        const uids = rawTags.map((t) => t.tagged_user);
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, badge, badge_verified, role')
          .in('id', uids);
        const profMap = new Map((profs || []).map((p) => [p.id, p]));
        const enriched = rawTags.map((t) => ({ ...t, profiles: profMap.get(t.tagged_user) || null }));
        return enriched.filter((t) => {
          if (t.status === 'accepted') return true;
          if (currentUserId && (t.tagged_user === currentUserId || t.tagged_by === currentUserId)) {
            return true;
          }
          return false;
        });
      }
    }
  } catch (err) {
    // fallback below
  }

  // Local fallback
  const localList = getLocalPostTags().filter((t) => t.post_id === postId);
  return localList.filter((t) => {
    if (t.status === 'accepted') return true;
    if (currentUserId && (t.tagged_user === currentUserId || t.tagged_by === currentUserId)) {
      return true;
    }
    return false;
  });
}

/**
 * Updates tag status (Accept or Decline) by the tagged user
 */
export async function updatePostTagStatus(tagId, status, currentUserId, postId = null) {
  if (!tagId || !status || !currentUserId) return false;

  // Update local cache
  const localList = getLocalPostTags();
  let targetPostId = postId;
  const nextList = localList.map((t) => {
    if (t.id === tagId && t.tagged_user === currentUserId) {
      if (!targetPostId) targetPostId = t.post_id;
      return { ...t, status };
    }
    return t;
  });
  saveLocalPostTags(nextList);

  try {
    const { error } = await supabase
      .from('post_tags')
      .update({ status })
      .eq('id', tagId)
      .eq('tagged_user', currentUserId);

    if (error) {
      console.warn('updatePostTagStatus in Supabase returned error:', error.message);
    }
    window.dispatchEvent(
      new CustomEvent('shammah:post-tag-status-changed', {
        detail: { tagId, status, userId: currentUserId, postId: targetPostId },
      })
    );
    window.dispatchEvent(
      new CustomEvent('shammah:post-tags-updated', {
        detail: { tagId, status, userId: currentUserId, postId: targetPostId },
      })
    );
    return true;
  } catch (err) {
    console.error('Error updating tag status:', err);
    return true;
  }
}

/**
 * Formats summary string for accepted tagged members
 */
export function formatTaggedMembersSummary(tags = []) {
  const accepted = (tags || []).filter((t) => t.status === 'accepted');
  if (accepted.length === 0) return '';

  const names = accepted.map((t) => t.profiles?.display_name || 'Member');
  if (names.length === 1) {
    return `with ${names[0]}`;
  }
  if (names.length === 2) {
    return `with ${names[0]} and ${names[1]}`;
  }
  return `with ${names[0]} and ${names.length - 1} others`;
}
