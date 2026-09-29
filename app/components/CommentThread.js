'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { timeAgo } from '../lib/postDisplay';
import Avatar from './Avatar';
import ProfileBadge from './ProfileBadge';
import { detectMentionQuery, insertMention, splitMentions } from '../lib/mentions';
import ReactionBar from './ReactionBar';

export default function CommentThread({ postId, session, onRequireSignIn, onCountChange }) {
  const [state, setState] = useState('loading'); // loading | ready | error
  const [comments, setComments] = useState([]); // flat, newest replies included
  const [nameById, setNameById] = useState({}); // profile id -> display name (authors + mentions)
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, name }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]); // profiles matching the current "@..."
  const [mentionedIds, setMentionedIds] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error: loadErr } = await supabase
        .from('comments')
        .select('id, parent_id, author_id, text_content, mentioned_user_ids, created_at, profiles(display_name, avatar_url, badge, badge_verified)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (loadErr) {
        setState('error');
        return;
      }
      setComments(data || []);
      setState('ready');
      onCountChange((data || []).length);

      const known = {};
      (data || []).forEach((c) => {
        if (c.author_id) known[c.author_id] = (c.profiles && c.profiles.display_name) || 'Someone';
      });
      const missing = new Set();
      (data || []).forEach((c) => (c.mentioned_user_ids || []).forEach((id) => {
        if (!known[id]) missing.add(id);
      }));
      if (missing.size > 0) {
        const { data: extra } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', Array.from(missing));
        (extra || []).forEach((p) => {
          known[p.id] = p.display_name || 'Someone';
        });
      }
      if (!cancelled) setNameById(known);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Which top-level comment a reply ultimately belongs under (keeps the thread just one level deep)
  function rootOf(comment) {
    let current = comment;
    const byId = Object.fromEntries(comments.map((c) => [c.id, c]));
    const seen = new Set();
    while (current && current.parent_id && byId[current.parent_id] && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId[current.parent_id];
    }
    return current ? current.id : comment.id;
  }

  const topLevel = comments.filter((c) => !c.parent_id || !comments.some((x) => x.id === c.parent_id));
  const repliesByRoot = {};
  comments.forEach((c) => {
    if (topLevel.includes(c)) return;
    const rootId = rootOf(c);
    (repliesByRoot[rootId] ||= []).push(c);
  });

  function startReply(comment) {
    if (!session) return onRequireSignIn();
    setReplyTo({ id: rootOf(comment), name: (comment.profiles && comment.profiles.display_name) || 'Someone' });
    const withTag = insertMention('@' + '', 1, (comment.profiles && comment.profiles.display_name) || 'Someone');
    setText(withTag.text);
    if (comment.author_id) setMentionedIds((ids) => Array.from(new Set([...ids, comment.author_id])));
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  }

  async function handleTextChange(e) {
    const value = e.target.value;
    setText(value);
    const cursor = e.target.selectionStart ?? value.length;
    const q = detectMentionQuery(value, cursor);
    if (q === null) {
      setSuggestions([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .ilike('display_name', `${q}%`)
      .limit(5);
    setSuggestions((data || []).filter((p) => p.display_name));
  }

  function pickSuggestion(profile) {
    const cursor = inputRef.current ? inputRef.current.selectionStart : text.length;
    const result = insertMention(text, cursor, profile.display_name);
    setText(result.text);
    setSuggestions([]);
    setMentionedIds((ids) => Array.from(new Set([...ids, profile.id])));
    setNameById((n) => ({ ...n, [profile.id]: profile.display_name }));
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(result.cursorPos, result.cursorPos);
      }
    }, 0);
  }

  async function submit(e) {
    e.preventDefault();
    if (!session) return onRequireSignIn();
    const clean = text.trim();
    if (!clean) return;
    setBusy(true);
    setError('');
    const { data, error: insertErr } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: session.user.id,
        parent_id: replyTo ? replyTo.id : null,
        text_content: clean,
        mentioned_user_ids: mentionedIds,
      })
      .select('id, parent_id, author_id, text_content, mentioned_user_ids, created_at')
      .single();
    setBusy(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    const withProfile = { ...data, profiles: { display_name: null } }; // it's "you" — shown live below
    setComments((prev) => {
      const next = [...prev, withProfile];
      onCountChange(next.length);
      return next;
    });
    setText('');
    setReplyTo(null);
    setMentionedIds([]);
    setSuggestions([]);
  }

  function CommentRow({ comment, isReply }) {
    const authorName =
      (comment.profiles && comment.profiles.display_name) ||
      nameById[comment.author_id] ||
      (session && comment.author_id === session.user.id ? 'You' : 'Someone');
    const mentionNames = (comment.mentioned_user_ids || []).map((id) => nameById[id]).filter(Boolean);
    return (
      <div className={`comment-row${isReply ? ' comment-reply' : ''}`}>
        <Avatar name={authorName} src={comment.profiles?.avatar_url} className="comment-avatar" />
        <div className="comment-body">
          <div className="comment-bubble">
            <span className="comment-author">{authorName}</span>
            <ProfileBadge badge={comment.profiles?.badge} verified={comment.profiles?.badge_verified} />
            <p className="comment-text">
              {splitMentions(comment.text_content, mentionNames).map((piece, i) =>
                typeof piece === 'string' ? (
                  <span key={i}>{piece}</span>
                ) : (
                  <b key={i} className="mention">
                    @{piece.mention}
                  </b>
                )
              )}
            </p>
          </div>
          <div className="comment-meta">
            <span className="mut-light">{timeAgo(comment.created_at)}</span>
            <ReactionBar
              targetType="comment"
              targetId={comment.id}
              session={session}
              onRequireSignIn={onRequireSignIn}
              size="sm"
            />
            {!isReply && (
              <button type="button" className="comment-reply-btn" onClick={() => startReply(comment)}>
                Reply
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="comment-thread">
      {state === 'loading' && <p className="mut-light comment-loading">Loading comments…</p>}
      {state === 'error' && <p className="auth-message">Could not load comments. Try again shortly.</p>}

      {state === 'ready' && topLevel.length === 0 && (
        <p className="mut-light comment-loading">No comments yet — be the first to say something.</p>
      )}

      {state === 'ready' &&
        topLevel.map((c) => (
          <div key={c.id}>
            <CommentRow comment={c} isReply={false} />
            {(repliesByRoot[c.id] || []).map((r) => (
              <CommentRow key={r.id} comment={r} isReply={true} />
            ))}
          </div>
        ))}

      <form className="comment-compose" onSubmit={submit}>
        {replyTo && (
          <div className="comment-replying-to">
            Replying to <b>{replyTo.name}</b>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setText('');
                setMentionedIds([]);
              }}
            >
              Cancel
            </button>
          </div>
        )}
        <div className="comment-input-wrap">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder={session ? 'Write a comment… (@ to mention someone)' : 'Sign in to comment'}
            maxLength={1000}
            disabled={!session}
            onFocus={() => {
              if (!session) onRequireSignIn();
            }}
          />
          <button type="submit" className="comment-send" disabled={busy || !text.trim()}>
            Send
          </button>
          {suggestions.length > 0 && (
            <div className="mention-suggestions" role="listbox">
              {suggestions.map((p) => (
                <button key={p.id} type="button" onClick={() => pickSuggestion(p)}>
                  {p.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
        {error && <p className="auth-message">{error}</p>}
      </form>
    </div>
  );
}
