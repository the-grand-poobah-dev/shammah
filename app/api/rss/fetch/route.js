// Server-only route: fetch active RSS feeds and insert new items as posts.
//
// Call with:
//   POST /api/rss/fetch
//   Header: x-cron-secret: <your CRON_SECRET>
//
// Required env vars (server only):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   ← never put this in the browser
//   CRON_SECRET

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Very lightweight RSS 2.0 / Atom-ish extractor (no extra npm package). */
function parseRssItems(xml) {
  const items = [];
  // Prefer <item>…</item>, fall back to <entry>…</entry> (Atom)
  const blocks = [
    ...xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi),
  ];

  for (const m of blocks) {
    const block = m[1];
    const get = (tag) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
      const match = block.match(re);
      if (!match) return '';
      return match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // link can be <link>url</link> or <link href="url" />
    let link = get('link');
    if (!link) {
      const href = block.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (href) link = href[1];
    }

    const title = get('title');
    const description = get('description') || get('content') || get('summary') || get('content:encoded');
    const guid = get('guid') || get('id') || link;
    const pubDate = get('pubDate') || get('published') || get('updated');

    if (title || description) {
      items.push({ title, link, description, guid, pubDate });
    }
  }
  return items;
}

export async function POST(req) {
  try {
    const secret = req.headers.get('x-cron-secret');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminClient();

    const { data: feeds, error: feedsErr } = await supabase
      .from('rss_feeds')
      .select('*')
      .eq('is_active', true);

    if (feedsErr) {
      return NextResponse.json({ error: feedsErr.message }, { status: 500 });
    }

    let inserted = 0;
    const errors = [];

    for (const feed of feeds || []) {
      try {
        const res = await fetch(feed.feed_url, {
          headers: { 'User-Agent': 'ShammahRSS/1.0' },
          cache: 'no-store',
        });
        if (!res.ok) {
          errors.push({ feed: feed.feed_url, status: res.status });
          continue;
        }
        const xml = await res.text();
        const items = parseRssItems(xml).slice(0, 15); // newest-ish 15

        for (const item of items) {
          if (!item.guid) continue;

          // Keyword filter (case-insensitive)
          if (Array.isArray(feed.keywords) && feed.keywords.length > 0) {
            const hay = `${item.title} ${item.description}`.toLowerCase();
            const hit = feed.keywords.some((k) => hay.includes(String(k).toLowerCase()));
            if (!hit) continue;
          }

          // De-dupe by external_guid
          const { data: existing } = await supabase
            .from('posts')
            .select('id')
            .eq('external_guid', item.guid)
            .maybeSingle();
          if (existing) continue;

          const textParts = [];
          if (item.title) textParts.push(`**${item.title}**`);
          if (item.description) textParts.push(item.description.slice(0, 900));
          if (item.link) textParts.push(`[Read more](${item.link})`);
          const text_content = textParts.join('\n\n').trim() || null;

          const { error: insErr } = await supabase.from('posts').insert({
            author_id: feed.created_by, // may be null; your RLS must allow it or use a system user
            church_id: feed.church_id,
            category_id: feed.category_id || 'resources',
            text_content,
            source: 'rss',
            external_guid: item.guid,
          });

          if (insErr) {
            errors.push({ feed: feed.feed_url, insert: insErr.message });
          } else {
            inserted += 1;
          }
        }

        await supabase
          .from('rss_feeds')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', feed.id);
      } catch (err) {
        errors.push({ feed: feed.feed_url, error: String(err?.message || err) });
      }
    }

    return NextResponse.json({ inserted, errors: errors.length ? errors : undefined });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

// Optional: allow GET for quick manual checks in the browser (still requires the secret as query param)
export async function GET(req) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-cron-secret');
  // Re-use the same logic by faking a Request with the header
  const fake = new Request(req.url, {
    method: 'POST',
    headers: { 'x-cron-secret': secret || '' },
  });
  return POST(fake);
}
