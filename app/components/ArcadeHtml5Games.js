'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Fish, Gamepad2, Heart, LoaderCircle, RefreshCw, Target, Trophy, Apple, Ship, Users, Brain, Search, BookOpen, Puzzle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const GAMES = [
  { slug: 'ark-runner', title: 'Ark Runner', age: 'Kids', icon: Ship, accent: '#0ea5e9', goal: 'Help the animals reach the ark. Tap animals, avoid storm clouds.', good: ['🐘','🦒','🦓','🦁','🐑'], bad: ['🌧️','⚡'], start: '🐘' },
  { slug: 'david-target-challenge', title: 'David’s Sling Challenge', age: 'Teens', icon: Target, accent: '#10b981', goal: 'Tap the target stones. Avoid distractions and build your score.', good: ['🎯','🪨','⭐'], bad: ['🌪️','🪵'], start: '🎯' },
  { slug: 'fruit-of-the-spirit-catch', title: 'Fruit of the Spirit Catch', age: 'Kids', icon: Apple, accent: '#f59e0b', goal: 'Collect the fruit of the Spirit and skip the storm clouds.', good: ['🍎','🍇','🍊','🍓','🍐'], bad: ['🌩️','🪨'], start: '🍎' },
  { slug: 'fisher-of-men', title: 'Fisher of Men', age: 'Family', icon: Fish, accent: '#06b6d4', goal: 'Catch fish before time runs out, but leave the boots and rubbish behind.', good: ['🐟','🐠','🐡','🦀'], bad: ['👢','🗑️'], start: '🐟' },
  { slug: 'faith-builder', title: 'Faith Builder', age: 'Adults', icon: Puzzle, accent: '#14b8a6', goal: 'A quick reaction challenge: select the matching symbols and avoid decoys.', good: ['✝️','📖','🕊️','❤️'], bad: ['💣','🌪️'], start: '📖' },
  { slug: 'daily-brain-teaser', title: 'Daily Brain Teaser', age: 'Teens', icon: Brain, accent: '#f97316', goal: 'Train attention and reaction speed with a short symbol challenge.', good: ['🔷','🟡','🟢','⭐'], bad: ['🔺','⚫'], start: '🔷' },
  { slug: 'bible-word-search', title: 'Bible Word Search Dash', age: 'Kids', icon: Search, accent: '#8b5cf6', goal: 'Tap the Bible-themed symbols as they appear. Keep your eyes open for decoys.', good: ['📖','✝️','🕊️','⭐'], bad: ['🌪️','💣'], start: '📖' },
  { slug: 'parable-pairs', title: 'Parable Picture Dash', age: 'Family', icon: Heart, accent: '#ec4899', goal: 'A quick visual challenge inspired by the parables Jesus taught.', good: ['🌱','🐑','🪙','🏠'], bad: ['🌩️','🪨'], start: '🌱' },
  { slug: 'book-order-race', title: 'Books of the Bible Race', age: 'Teens', icon: BookOpen, accent: '#a855f7', goal: 'Tap the Bible book symbols quickly to build your focus and recall.', good: ['📜','📖','✉️','⭐'], bad: ['🌪️','💣'], start: '📜' },
  { slug: 'family-bible-challenge', title: 'Family Bible Challenge', age: 'Family', icon: Users, accent: '#eab308', goal: 'A mixed-age reaction round for family game night. Take turns and cheer each other on.', good: ['❤️','📖','🕊️','⭐'], bad: ['🌩️','🪨'], start: '❤️' },
];

const TILE_COUNT = 16;
const ROUND_SECONDS = 20;
function newBoard(game) {
  const tiles = Array.from({ length: TILE_COUNT }, (_, i) => ({ id: i, item: game.bad[i % game.bad.length] }));
  const positions = new Set();
  while (positions.size < 4) positions.add(Math.floor(Math.random() * TILE_COUNT));
  [...positions].forEach((position, index) => { tiles[position].item = game.good[index % game.good.length]; });
  return tiles;
}

async function tokenFromSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export default function ArcadeHtml5Games() {
  const [active, setActive] = useState(GAMES[0]);
  const [board, setBoard] = useState(() => newBoard(GAMES[0]));
  const [seconds, setSeconds] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('Choose a game and press Start round.');
  const [filter, setFilter] = useState('All ages');
  const timerRef = useRef(null);
  const startedAt = useRef(0);
  const scoreRef = useRef(0);
  const playingRef = useRef(false);

  const finish = useCallback(async (finalScore = scoreRef.current) => {
    if (!playingRef.current) return;
    playingRef.current = false;
    setPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback(`Round finished — ${Math.max(0, finalScore)} points.`);
    setSaving(true);
    try {
      const token = await tokenFromSession();
      if (!token) {
        setFeedback(`Round finished — ${Math.max(0, finalScore)} points. Sign in to save your score.`);
        return;
      }
      const response = await fetch('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameSlug: active.slug,
          score: Math.max(0, Math.min(20000, Math.round(finalScore))),
          durationMs: Math.max(1000, Math.min(7200000, Date.now() - startedAt.current)),
          meta: { completed: true, perfect: finalScore >= 1000, questionsAnswered: 0 },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Score could not be saved.');
      setFeedback(`Score saved! ${Math.max(0, finalScore)} points added to your Arcade profile.`);
    } catch (error) {
      setFeedback(`Round finished. ${error.message || 'Score could not be saved.'}`);
    } finally {
      setSaving(false);
    }
  }, [active]);

  useEffect(() => {
    if (!playing) return undefined;
    timerRef.current = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          clearInterval(timerRef.current);
          setTimeout(() => finish(scoreRef.current), 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, finish]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const start = (game = active) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(game);
    setBoard(newBoard(game));
    setSeconds(ROUND_SECONDS);
    setScore(0);
    scoreRef.current = 0;
    startedAt.current = Date.now();
    playingRef.current = true;
    setPlaying(true);
    setFeedback('Go! Tap as many good targets as you can.');
  };

  const tapTile = (tile) => {
    if (!playingRef.current) return;
    const good = active.good.includes(tile.item);
    const nextScore = Math.max(0, scoreRef.current + (good ? 100 : -25));
    scoreRef.current = nextScore;
    setScore(nextScore);
    setFeedback(good ? '+100 — great choice!' : '−25 — watch out for decoys!');
    setBoard((current) => current.map((item) => item.id === tile.id
      ? { ...item, item: Math.random() > 0.24 ? active.good[Math.floor(Math.random() * active.good.length)] : active.bad[Math.floor(Math.random() * active.bad.length)] }
      : item));
  };

  const visibleGames = filter === 'All ages' ? GAMES : GAMES.filter((game) => game.age === filter || game.age === 'Family');

  return (
    <section className="arcade-html5" aria-labelledby="arcade-html5-title">
      <div className="arcade-html5-heading">
        <div><span className="arcade-online-eyebrow"><Gamepad2 size={15} /> BROWSER ARCADE</span><h2 id="arcade-html5-title">HTML5 Mini-Games</h2><p>Quick, family-friendly games that run right here in your browser — no downloads required.</p></div>
        <div className="arcade-html5-timer"><Trophy size={18} /><strong>{score}</strong><span>points</span></div>
      </div>
      <div className="arcade-html5-filters" role="group" aria-label="Filter games by age">
        {['All ages','Kids','Teens','Adults','Family'].map((age) => <button key={age} type="button" className={filter === age ? 'active' : ''} onClick={() => setFilter(age)}>{age}</button>)}
      </div>
      <div className="arcade-html5-layout">
        <div className="arcade-html5-library">
          {visibleGames.map((game) => {
            const Icon = game.icon;
            return <button key={game.slug} type="button" className={active.slug === game.slug ? 'active' : ''} onClick={() => { setActive(game); setBoard(newBoard(game)); setPlaying(false); playingRef.current = false; if (timerRef.current) clearInterval(timerRef.current); setSeconds(ROUND_SECONDS); setScore(0); scoreRef.current = 0; setFeedback('Press Start round when you are ready.'); }} style={{ '--arcade-accent': game.accent }}>
              <span className="arcade-html5-game-icon"><Icon size={20} /></span><span className="arcade-html5-game-copy"><strong>{game.title}</strong><small>{game.age} · 20-second round</small></span>
            </button>;
          })}
        </div>
        <div className="arcade-html5-stage" style={{ '--arcade-accent': active.accent }}>
          <div className="arcade-html5-stage-head"><div><h3>{active.title}</h3><p>{active.goal}</p></div><div className={seconds <= 5 && playing ? 'urgent' : ''}><strong>{seconds}s</strong><small>remaining</small></div></div>
          <div className={`arcade-html5-board${playing ? ' is-playing' : ''}`} aria-label={`${active.title} game board`}>
            {board.map((tile) => <button key={tile.id} type="button" onClick={() => tapTile(tile)} disabled={!playing} aria-label={playing ? `Tap ${tile.item}` : 'Game tile'}>{playing ? tile.item : '✦'}</button>)}
          </div>
          <div className="arcade-html5-controls"><p role="status">{saving && <LoaderCircle size={15} className="arcade-spin" />}{feedback}</p><button type="button" onClick={() => start(active)} disabled={saving}><RefreshCw size={16} /> {playing ? 'Restart round' : 'Start round'}</button></div>
          <small className="arcade-html5-hint">Good target: {active.good.join(' ')} · Avoid: {active.bad.join(' ')}</small>
        </div>
      </div>
      <div className="arcade-html5-footer"><Heart size={17} /><span>Designed for joyful, age-appropriate play. Be kind, take turns and enjoy learning together.</span><Users size={17} /></div>
    </section>
  );
}
