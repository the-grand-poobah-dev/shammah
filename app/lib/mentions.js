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
