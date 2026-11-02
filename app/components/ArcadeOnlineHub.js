'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, BookOpen, Brain, CircleHelp, Flame, Gamepad2, LoaderCircle, RefreshCw, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const API = '/api/arcade';
const GAME_OPTIONS = [
  { slug: 'scripture-scramble', label: 'Scripture Scramble', icon: BookOpen, accent: '#8b5cf6', description: 'Put a KJV verse back in order.' },
  { slug: 'memory-verse-match', label: 'Memory Verse Match', icon: Brain, accent: '#ec4899', description: 'Pair verse references with their text.' },
  { slug: 'bible-trivia', label: 'Bible Trivia', icon: CircleHelp, accent: '#f97316', description: 'Test your knowledge of Scripture.' },
];

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function apiGet(query, token) {
  const response = await fetch(`${API}?${new URLSearchParams(query)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load Arcade data.');
  return data;
}

export default function ArcadeOnlineHub() {
  const [activeGame, setActiveGame] = useState('scripture-scramble');
  const [token, setToken] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [verses, setVerses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [scrambleVerse, setScrambleVerse] = useState(null);
  const [scrambledWords, setScrambledWords] = useState([]);
  const [matchCards, setMatchCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedRefs, setMatchedRefs] = useState([]);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaAnswers, setTriviaAnswers] = useState([]);
  const [triviaChoice, setTriviaChoice] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [dailySeed, setDailySeed] = useState('');
  const [leaderScope, setLeaderScope] = useState('weekly');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const startedAt = useRef(Date.now());
  const submitted = useRef(false);
  const matchTimer = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const currentToken = await getToken();
      setToken(currentToken);
      setSignedIn(Boolean(currentToken));
      const [verseData, questionData] = await Promise.all([
        apiGet({ action: 'verses' }, currentToken),
        apiGet({ action: 'questions' }, currentToken),
      ]);
      setVerses(verseData.verses || []);
      setQuestions(questionData.questions || []);
    } catch (e) {
      setError(e.message || 'Could not load the games.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => { if (matchTimer.current) clearTimeout(matchTimer.current); };
  }, [loadData]);

  const startGame = useCallback((slug = activeGame) => {
    setActiveGame(slug);
    setMessage('');
    setError('');
    setResult(null);
    setSaving(false);
    submitted.current = false;
    startedAt.current = Date.now();
    setAnswer('');
    setSelectedCards([]);
    setMatchedRefs([]);
    setTriviaIndex(0);
    setTriviaAnswers([]);
    setTriviaChoice(null);
    if (slug === 'scripture-scramble' && verses.length) {
      const chosenVerse = verses[Math.floor(Math.random() * verses.length)];
      setScrambleVerse(chosenVerse);
      setScrambledWords(shuffle(String(chosenVerse.text || '').split(/\\s+/)));
    }
    if (slug === 'memory-verse-match' && verses.length) {
      const chosen = shuffle(verses).slice(0, 4);
      setMatchCards(shuffle(chosen.flatMap((verse, index) => [
        { id: `ref-${index}`, pair: verse.ref, kind: 'ref', label: verse.ref },
        { id: `text-${index}`, pair: verse.ref, kind: 'text', label: verse.text },
      ])));
    }
  }, [activeGame, verses]);

  useEffect(() => {
    if (!verses.length) return;
    if (activeGame === 'scripture-scramble' && !scrambleVerse) {
      setScrambleVerse(verses[0]);
      setScrambledWords(shuffle(String(verses[0].text || '').split(/\\s+/)));
    }
    if (activeGame === 'memory-verse-match' && !matchCards.length) {
      const chosen = shuffle(verses).slice(0, 4);
      setMatchCards(shuffle(chosen.flatMap((verse, index) => [
        { id: `ref-${index}`, pair: verse.ref, kind: 'ref', label: verse.ref },
        { id: `text-${index}`, pair: verse.ref, kind: 'text', label: verse.text },
      ])));
    }
  }, [verses, activeGame, scrambleVerse, matchCards.length]);

  const saveScore = useCallback(async (gameSlug, score, meta = {}, answers = null) => {
    if (submitted.current) return;
    submitted.current = true;
    setSaving(true);
    setError('');
    try {
      const currentToken = token || await getToken();
      if (!currentToken) throw new Error('Sign in to save scores and join the leaderboard.');
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({
          gameSlug,
          score,
          durationMs: Math.max(1000, Date.now() - startedAt.current),
          meta: { ...meta, completed: true },
          ...(answers ? { answers } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your score could not be saved.');
      setResult({ score: data.score ?? score, result: data.result, gradeResults: data.gradeResults || null });
      setMessage('Score saved securely. Your progress and achievements have been updated.');
      await loadLeaderboard(gameSlug, leaderScope, currentToken);
    } catch (e) {
      submitted.current = false;
      setError(e.message || 'Could not save score.');
    } finally {
      setSaving(false);
    }
  }, [token, leaderScope]);

  const loadLeaderboard = useCallback(async (game = activeGame, scope = leaderScope, currentToken = token) => {
    try {
      const authToken = currentToken || await getToken();
      if (!authToken) { setLeaderboard([]); return; }
      const data = await apiGet({ action: 'leaderboard', game, scope }, authToken);
      setLeaderboard(data.leaderboard || []);
    } catch (e) {
      setLeaderboard([]);
      if (e.message && !/sign in/i.test(e.message)) setError(e.message);
    }
  }, [activeGame, leaderScope, token]);

  const submitScramble = async (event) => {
    event.preventDefault();
    if (!scrambleVerse) return;
    const clean = (value) => value.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const correct = clean(answer) === clean(scrambleVerse.text);
    if (!correct) { setMessage('Not quite. Check the word order and try again.'); return; }
    setMessage('Correct! Well done.');
    await saveScore('scripture-scramble', 500, { perfect: true });
  };

  const chooseMatchCard = (card) => {
    if (saving || result || selectedCards.includes(card.id) || matchedRefs.includes(card.pair)) return;
    const next = [...selectedCards, card.id];
    setSelectedCards(next);
    if (next.length === 2) {
      const first = matchCards.find((item) => item.id === next[0]);
      const second = matchCards.find((item) => item.id === next[1]);
      if (first && second && first.pair === second.pair && first.kind !== second.kind) {
        const matched = [...matchedRefs, first.pair];
        setMatchedRefs(matched);
        setSelectedCards([]);
        if (matched.length === 4) {
          const score = Math.max(100, 1000 - Math.round((Date.now() - startedAt.current) / 1000) * 10);
          saveScore('memory-verse-match', score, { perfect: true });
        }
      } else {
        if (matchTimer.current) clearTimeout(matchTimer.current);
        matchTimer.current = setTimeout(() => setSelectedCards([]), 750);
      }
    }
  };

  const currentQuestion = questions[triviaIndex];
  const answerTrivia = (selectedIndex) => {
    if (!currentQuestion || triviaChoice !== null || saving) return;
    setTriviaChoice(selectedIndex);
    const nextAnswers = [...triviaAnswers, { id: currentQuestion.id, selectedIndex }];
    setTriviaAnswers(nextAnswers);
    if (triviaIndex + 1 >= Math.min(10, questions.length)) {
      saveScore('bible-trivia', 0, { questionsAnswered: nextAnswers.length }, nextAnswers);
    } else {
      setTimeout(() => {
        setTriviaIndex((index) => index + 1);
        setTriviaChoice(null);
      }, 550);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadDailySeed() {
      if (!token) { setDailySeed(''); return; }
      try {
        const data = await apiGet({ action: 'daily_seed', game: activeGame }, token);
        if (!cancelled) setDailySeed(data.seed || '');
      } catch {
        if (!cancelled) setDailySeed('');
      }
    }
    loadDailySeed();
    return () => { cancelled = true; };
  }, [activeGame, token]);

  const currentOption = GAME_OPTIONS.find((game) => game.slug === activeGame) || GAME_OPTIONS[0];

  return (
    <section className="arcade-online-hub" aria-labelledby="arcade-online-title">
      <div className="arcade-online-heading">
        <div>
          <span className="arcade-online-eyebrow"><Gamepad2 size={15} /> PLAY, LEARN, GROW</span>
          <h2 id="arcade-online-title">Daily Faith Arcade</h2>
          <p>New games with scores, streaks and leaderboards saved to your account.</p>
        </div>
        <div className="arcade-online-trophy"><Trophy size={23} /><span>Play with purpose</span></div>
      </div>

      {loading ? (
        <div className="arcade-online-state"><LoaderCircle className="arcade-spin" size={24} /> Loading games and Scripture…</div>
      ) : error && !verses.length ? (
        <div className="arcade-online-state is-error" role="alert">{error}<button type="button" onClick={loadData}><RefreshCw size={15} /> Retry</button></div>
      ) : (
        <>
          <div className="arcade-online-game-tabs" role="tablist" aria-label="Arcade games">
            {GAME_OPTIONS.map((game) => {
              const Icon = game.icon;
              return <button key={game.slug} type="button" role="tab" aria-selected={activeGame === game.slug}
                className={activeGame === game.slug ? 'active' : ''} style={{ '--arcade-accent': game.accent }}
                onClick={() => startGame(game.slug)}>
                <Icon size={18} /><span>{game.label}</span>
              </button>;
            })}
          </div>

          <div className="arcade-online-game" style={{ '--arcade-accent': currentOption.accent }}>
            <div className="arcade-online-game-title">
              <div><span className="arcade-online-icon"><currentOption.icon size={22} /></span><div><h3>{currentOption.label}</h3><p>{currentOption.description}</p></div></div>
              <button type="button" className="arcade-online-reset" onClick={() => startGame(activeGame)}><RefreshCw size={15} /> Restart</button>
            </div>

            {activeGame === 'scripture-scramble' && scrambleVerse && (
              <form className="arcade-scramble-form" onSubmit={submitScramble}>
                <p className="arcade-online-prompt">Rebuild the verse in the correct order, then enter it below.</p>
                <div className="arcade-word-cloud">{shuffle(scrambleVerse.text.split(/\s+/)).map((word, index) => <span key={`${word}-${index}`}>{word.replace(/[.,;:]/g, '')}</span>)}</div>
                <label htmlFor="arcade-scramble-answer">Your verse</label>
                <textarea id="arcade-scramble-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type the verse here…" rows={3} disabled={Boolean(result) || saving} />
                <button type="submit" disabled={!answer.trim() || saving || Boolean(result)}>{saving ? 'Saving score…' : 'Check verse'}</button>
                <small>Reference: {scrambleVerse.ref}</small>
              </form>
            )}

            {activeGame === 'memory-verse-match' && (
              <div className="arcade-memory-board" aria-label="Verse matching cards">
                {matchCards.map((card) => {
                  const visible = selectedCards.includes(card.id) || matchedRefs.includes(card.pair);
                  return <button key={card.id} type="button" className={`arcade-memory-card${visible ? ' revealed' : ''}${matchedRefs.includes(card.pair) ? ' matched' : ''}`}
                    onClick={() => chooseMatchCard(card)} disabled={saving || Boolean(result) || matchedRefs.includes(card.pair)} aria-pressed={visible}>
                    {visible ? card.label : 'Reveal card'}
                  </button>;
                })}
                <p>{matchedRefs.length} of 4 pairs matched</p>
              </div>
            )}

            {activeGame === 'bible-trivia' && currentQuestion && !result && (
              <div className="arcade-trivia-panel">
                <div className="arcade-trivia-meta"><span>{currentQuestion.book} · {currentQuestion.testament}</span><span>Question {triviaIndex + 1} of {Math.min(10, questions.length)}</span></div>
                <h4>{currentQuestion.question}</h4>
                <div className="arcade-trivia-options">{(currentQuestion.options || []).map((option, index) =>
                  <button key={`${currentQuestion.id}-${index}`} type="button" onClick={() => answerTrivia(index)} disabled={triviaChoice !== null || saving}>{option}</button>
                )}</div>
                {saving && <p>Checking your answers securely…</p>}
              </div>
            )}

            {result && (
              <div className="arcade-online-result" role="status">
                <Trophy size={30} /><h4>Round complete!</h4><p>Your score: <strong>{result.score}</strong></p>
                {result.gradeResults && <p>{result.gradeResults.filter((item) => item.correct).length} correct out of {result.gradeResults.length} questions.</p>}
                <button type="button" onClick={() => startGame(activeGame)}>Play again</button>
              </div>
            )}
            {message && <p className="arcade-online-message" role="status">{message}</p>}
            {error && <p className="arcade-online-error" role="alert">{error}<button type="button" onClick={() => setError('')}>Dismiss</button></p>}
          </div>

          <div className="arcade-online-bottom">
            <div className="arcade-online-achievements"><Award size={19} /><div><strong>Achievements and streaks</strong><p>{signedIn ? 'Scores and progress are linked to your account.' : 'Sign in to save scores, earn achievements and appear on leaderboards.'}</p></div></div>
            <div className="arcade-online-leaderboard">
              <div className="arcade-online-leaderboard-head"><h3><Trophy size={18} /> Leaderboard</h3>
                <select value={leaderScope} onChange={(event) => { setLeaderScope(event.target.value); loadLeaderboard(activeGame, event.target.value); }} aria-label="Leaderboard period">
                  <option value="daily">Today</option><option value="weekly">This week</option><option value="all">All time</option>
                </select>
              </div>
              {signedIn ? <button type="button" className="arcade-online-load-leaderboard" onClick={() => loadLeaderboard(activeGame, leaderScope)}><RefreshCw size={14} /> Refresh leaderboard</button> : <p>Sign in to see ranked players.</p>}
              {leaderboard.length > 0 && <ol>{leaderboard.slice(0, 5).map((row, index) => <li key={row.user_id}><span className="arcade-rank">{index + 1}</span><span>{row.display_name || 'Faithful player'}</span><strong>{row.score}</strong></li>)}</ol>}
              {signedIn && leaderboard.length === 0 && <p>No scores for this period yet. Be the first!</p>}
            </div>
          </div>
          {error && <div className="arcade-online-state is-error" role="alert">{error}<button type="button" onClick={loadData}>Retry loading data</button></div>}
        </>
      )}
    </section>
  );
}
