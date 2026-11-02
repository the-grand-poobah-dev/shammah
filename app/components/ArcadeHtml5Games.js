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
const WORD_SEARCH_ROWS = ['FAITHX', 'GRACEQ', 'JESUSW', 'PRAYZM', 'LOVECT', 'BIBLED'];
const WORD_SEARCH_WORDS = ['FAITH', 'GRACE', 'JESUS', 'PRAY', 'LOVE', 'BIBLE'];
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
  const [roundKey, setRoundKey] = useState(0);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('Choose a game and press Start round.');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardMessage, setLeaderboardMessage] = useState('Sign in to view the weekly leaderboard.');
  const [wordSelection, setWordSelection] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [filter, setFilter] = useState('All ages');
  const timerRef = useRef(null);
  const startedAt = useRef(0);
  const scoreRef = useRef(0);
  const playingRef = useRef(false);

  const refreshLeaderboard = useCallback(async (gameSlug = active.slug) => {
    try {
      const token = await tokenFromSession();
      if (!token) {
        setLeaderboard([]);
        setLeaderboardMessage('Sign in to view the weekly leaderboard.');
        return;
      }
      const response = await fetch(`/api/arcade?action=leaderboard&game=${encodeURIComponent(gameSlug)}&scope=weekly`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Leaderboard is unavailable.');
      setLeaderboard(data.leaderboard || []);
      setLeaderboardMessage(data.leaderboard?.length ? '' : 'No scores yet this week. Be the first!');
    } catch (error) {
      setLeaderboard([]);
      setLeaderboardMessage(error.message || 'Leaderboard is unavailable.');
    }
  }, [active.slug]);

  useEffect(() => { refreshLeaderboard(active.slug); }, [active.slug, refreshLeaderboard]);

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
      await refreshLeaderboard(active.slug);
    } catch (error) {
      setFeedback(`Round finished. ${error.message || 'Score could not be saved.'}`);
    } finally {
      setSaving(false);
    }
  }, [active, refreshLeaderboard]);

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
  }, [playing, finish, roundKey]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const start = (game = active) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(game);
    setBoard(newBoard(game));
    setWordSelection([]);
    setFoundWords([]);
    setSeconds(ROUND_SECONDS);
    setRoundKey((current) => current + 1);
    setScore(0);
    scoreRef.current = 0;
    startedAt.current = Date.now();
    playingRef.current = true;
    setPlaying(true);
    setFeedback('Go! Tap as many good targets as you can.');
  };

  const selectWordCell = (row, col, letter) => {
    if (!playingRef.current) return;
    const next = wordSelection.length && wordSelection[0].row === row && wordSelection[wordSelection.length - 1].col === col - 1
      ? [...wordSelection, { row, col, letter }]
      : [{ row, col, letter }];
    const formed = next.map((cell) => cell.letter).join('');
    const possible = WORD_SEARCH_WORDS.some((word) => word.startsWith(formed));
    if (!possible) {
      setWordSelection(letter && WORD_SEARCH_WORDS.some((word) => word.startsWith(letter)) ? [{ row, col, letter }] : []);
      return;
    }
    setWordSelection(next);
    if (WORD_SEARCH_WORDS.includes(formed) && !foundWords.includes(formed)) {
      const found = [...foundWords, formed];
      setFoundWords(found);
      setWordSelection([]);
      const nextScore = scoreRef.current + 100;
      scoreRef.current = nextScore;
      setScore(nextScore);
      setFeedback(`Found ${formed}! +100 points.`);
      if (found.length === WORD_SEARCH_WORDS.length) setTimeout(() => finish(nextScore), 0);
    }
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
          {active.slug === 'bible-word-search' ? (
            <div className="arcade-word-search">
              <p>Find all six words by tapping their letters from left to right.</p>
              <div className="arcade-word-search-words">{WORD_SEARCH_WORDS.map((word) => <span key={word} className={foundWords.includes(word) ? 'found' : ''}>{word}</span>)}</div>
              <div className="arcade-word-search-grid" aria-label="Bible word search grid">
                {WORD_SEARCH_ROWS.map((line, row) => line.split('').map((letter, col) => {
                  const selected = wordSelection.some((cell) => cell.row === row && cell.col === col);
                  const found = foundWords.some((word) => row >= 0 && WORD_SEARCH_ROWS[row].slice(0, word.length) === word && col < word.length);
                  return <button key={`${row}-${col}`} type="button" onClick={() => selectWordCell(row, col, letter)} disabled={!playing || foundWords.some((word) => WORD_SEARCH_ROWS[row].startsWith(word) && col < word.length)} className={selected ? 'selected' : found ? 'found' : ''} aria-label={`Row ${row + 1}, column ${col + 1}, letter ${letter}`}>{letter}</button>;
                }))}
              </div>
            </div>
          ) : (
            <div className={`arcade-html5-board${playing ? ' is-playing' : ''}`} aria-label={`${active.title} game board`}>
              {board.map((tile) => <button key={tile.id} type="button" onClick={() => tapTile(tile)} disabled={!playing} aria-label={playing ? `Tap ${tile.item}` : 'Game tile'}>{playing ? tile.item : '✦'}</button>)}
            </div>
          )}
          <div className="arcade-html5-controls"><p role="status">{saving && <LoaderCircle size={15} className="arcade-spin" />}{feedback}</p><button type="button" onClick={() => start(active)} disabled={saving}><RefreshCw size={16} /> {playing ? 'Restart round' : 'Start round'}</button></div>
          <small className="arcade-html5-hint">Good target: {active.good.join(' ')} · Avoid: {active.bad.join(' ')}</small>
        </div>
      </div>
      <div className="arcade-html5-leaderboard">
        <div><h3><Trophy size={17} /> Weekly leaderboard</h3><button type="button" onClick={() => refreshLeaderboard(active.slug)}><RefreshCw size={14} /> Refresh</button></div>
        {leaderboardMessage && <p>{leaderboardMessage}</p>}
        {leaderboard.length > 0 && <ol>{leaderboard.slice(0, 5).map((row, index) => <li key={row.user_id}><span>{index + 1}</span><strong>{row.display_name || 'Faithful player'}</strong><b>{row.score}</b></li>)}</ol>}
      </div>
      <div className="arcade-html5-footer"><Heart size={17} /><span>Designed for joyful, age-appropriate play. Be kind, take turns and enjoy learning together.</span><Users size={17} /></div>
    </section>
  );
}
