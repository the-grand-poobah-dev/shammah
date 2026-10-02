'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Sparkles,
  Award,
  Play,
  Volume2,
  VolumeX,
  Star,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

const TRIVIA_QUESTIONS = [
  // Kids
  {
    tier: 'kids',
    tierLabel: 'Kids (Sunday School)',
    question: 'Who built the giant wooden ark to save the animals from the great flood?',
    options: ['Moses', 'Noah', 'David', 'Abraham'],
    correct: 1,
    scripture: 'Genesis 6:14 — "Make yourself an ark of gopher wood."',
  },
  {
    tier: 'kids',
    tierLabel: 'Kids (Sunday School)',
    question: 'What weapon did young David use to defeat the giant Goliath?',
    options: ['A heavy sword', 'A golden spear', 'A sling and five smooth stones', 'A bronze bow'],
    correct: 2,
    scripture: '1 Samuel 17:40 — "He took his staff in his hand, chose five smooth stones from the stream..."',
  },
  {
    tier: 'kids',
    tierLabel: 'Kids (Sunday School)',
    question: 'Which prophet was swallowed by a great fish when he tried to run from God?',
    options: ['Elijah', 'Jonah', 'Daniel', 'Samuel'],
    correct: 1,
    scripture: 'Jonah 1:17 — "Now the Lord provided a huge fish to swallow Jonah."',
  },
  {
    tier: 'kids',
    tierLabel: 'Kids (Sunday School)',
    question: 'How many loaves of bread and small fish did Jesus multiply to feed 5,000 men?',
    options: ['5 loaves and 2 fish', '7 loaves and 3 fish', '12 loaves and 1 fish', '2 loaves and 5 fish'],
    correct: 0,
    scripture: 'Matthew 14:17 — "We have here only five loaves of bread and two fish."',
  },

  // Teens
  {
    tier: 'teens',
    tierLabel: 'Teens (Gospels & Acts)',
    question: 'In which river was Jesus baptized by John the Baptist?',
    options: ['Nile River', 'Jordan River', 'Euphrates River', 'Tigris River'],
    correct: 1,
    scripture: 'Mark 1:9 — "Jesus came from Nazareth in Galilee and was baptized by John in the Jordan."',
  },
  {
    tier: 'teens',
    tierLabel: 'Teens (Gospels & Acts)',
    question: 'What was Apostle Paul’s Hebrew name before his miraculous encounter on the Damascus road?',
    options: ['Silas', 'Barnabas', 'Saul', 'Stephen'],
    correct: 2,
    scripture: 'Acts 9:4 — "He fell to the ground and heard a voice say to him, \'Saul, Saul, why do you persecute me?\'"',
  },
  {
    tier: 'teens',
    tierLabel: 'Teens (Gospels & Acts)',
    question: 'Who stepped out of the boat and walked on the stormy water toward Jesus?',
    options: ['John', 'Peter', 'James', 'Andrew'],
    correct: 1,
    scripture: 'Matthew 14:29 — "Then Peter got down out of the boat, walked on the water and came toward Jesus."',
  },
  {
    tier: 'teens',
    tierLabel: 'Teens (Gospels & Acts)',
    question: 'Which fruit of the Spirit is listed first in Galatians 5:22?',
    options: ['Joy', 'Peace', 'Love', 'Patience'],
    correct: 2,
    scripture: 'Galatians 5:22 — "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness..."',
  },

  // Youth & Adults
  {
    tier: 'youth',
    tierLabel: 'Youth & Adults (Theology & Epistles)',
    question: 'According to Hebrews 11:1, what is faith described as?',
    options: [
      'Confidence in what we hope for and assurance about what we do not see',
      'A warm feeling in our heart during worship',
      'Knowledge accumulated through ancient scriptures',
      'Belief without any evidence or trial',
    ],
    correct: 0,
    scripture: 'Hebrews 11:1 — "Now faith is confidence in what we hope for and assurance about what we do not see."',
  },
  {
    tier: 'youth',
    tierLabel: 'Youth & Adults (Theology & Epistles)',
    question: 'In Romans 8:37, believers are declared to be:',
    options: ['Striving servants', 'More than conquerors through Him who loved us', 'Wandering pilgrims', 'Doubtful seekers'],
    correct: 1,
    scripture: 'Romans 8:37 — "No, in all these things we are more than conquerors through him who loved us."',
  },
  {
    tier: 'youth',
    tierLabel: 'Youth & Adults (Theology & Epistles)',
    question: 'Who was the Roman governor that washed his hands during the trial of Jesus?',
    options: ['Pontius Pilate', 'Herod Antipas', 'Felix', 'Festus'],
    correct: 0,
    scripture: 'Matthew 27:24 — "When Pilate saw that he was getting nowhere... he took water and washed his hands before the crowd."',
  },
];

const NOAH_ANIMALS = [
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'sheep', emoji: '🐑', name: 'Sheep' },
  { id: 'dove', emoji: '🕊️', name: 'Dove' },
  { id: 'giraffe', emoji: '🦒', name: 'Giraffe' },
  { id: 'camel', emoji: '🐪', name: 'Camel' },
  { id: 'elephant', emoji: '🐘', name: 'Elephant' },
];

export default function FaithArcadeGamesView() {
  const [selectedGame, setSelectedGame] = useState('trivia'); // 'trivia', 'david', 'ark'
  const [arcadeHighScore, setArcadeHighScore] = useState(0);

  // ------------------- TRIVIA STATE -------------------
  const [triviaCategory, setTriviaCategory] = useState('all'); // 'all', 'kids', 'teens', 'youth'
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaStreak, setTriviaStreak] = useState(0);
  const [triviaFinished, setTriviaFinished] = useState(false);

  // ------------------- DAVID SLING STATE -------------------
  const [slingAngle, setSlingAngle] = useState(45);
  const [slingPower, setSlingPower] = useState(70);
  const [davidScore, setDavidScore] = useState(0);
  const [davidStonesLeft, setDavidStonesLeft] = useState(5);
  const [goliathHitMessage, setGoliathHitMessage] = useState('');
  const [isThrowing, setIsThrowing] = useState(false);
  const [stonePosition, setStonePosition] = useState({ x: 40, y: 180 });
  const [goliathPosition, setGoliathPosition] = useState({ x: 280, y: 130 });

  // ------------------- NOAH'S ARK STATE -------------------
  const [arkCards, setArkCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [arkTimeLeft, setArkTimeLeft] = useState(45);
  const [arkGameOver, setArkGameOver] = useState(false);
  const [arkWon, setArkWon] = useState(false);

  const activeQuestions = TRIVIA_QUESTIONS.filter((q) =>
    triviaCategory === 'all' ? true : q.tier === triviaCategory
  );
  const currentQ = activeQuestions[currentQIndex % activeQuestions.length];

  // Initialize Noah's Ark cards
  function initArkGame() {
    const deck = [...NOAH_ANIMALS, ...NOAH_ANIMALS]
      .map((item, index) => ({
        uniqueId: `${item.id}-${index}`,
        animalId: item.id,
        emoji: item.emoji,
        name: item.name,
      }))
      .sort(() => Math.random() - 0.5);

    setArkCards(deck);
    setFlippedCards([]);
    setMatchedPairs([]);
    setArkTimeLeft(45);
    setArkGameOver(false);
    setArkWon(false);
  }

  useEffect(() => {
    if (selectedGame === 'ark') {
      initArkGame();
    }
  }, [selectedGame]);

  // Ark Timer countdown
  useEffect(() => {
    if (selectedGame !== 'ark' || arkGameOver || arkWon) return;
    const interval = setInterval(() => {
      setArkTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setArkGameOver(true);
          playSound('bell');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedGame, arkGameOver, arkWon]);

  // Handle Trivia Option Click
  function handleSelectOption(idx) {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.correct) {
      playSound('reaction');
      setTriviaScore((s) => s + 100 + triviaStreak * 25);
      setTriviaStreak((st) => st + 1);
    } else {
      playSound('click');
      setTriviaStreak(0);
    }
  }

  function handleNextQuestion() {
    if (currentQIndex + 1 >= activeQuestions.length) {
      setTriviaFinished(true);
      playSound('bell');
    } else {
      setCurrentQIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    }
  }

  function handleRestartTrivia() {
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setTriviaScore(0);
    setTriviaStreak(0);
    setTriviaFinished(false);
  }

  // Handle David vs Goliath Throw
  function handleThrowStone() {
    if (isThrowing || davidStonesLeft <= 0) return;
    setIsThrowing(true);
    playSound('reaction');

    const targetX = 260 + Math.sin(Date.now() / 300) * 40;
    // Calculate if hit: slingAngle between 35 and 55 and power between 60 and 85
    const isHit = slingAngle >= 35 && slingAngle <= 58 && slingPower >= 60 && slingPower <= 88;

    let progress = 0;
    const anim = setInterval(() => {
      progress += 0.08;
      const curX = 40 + (targetX - 40) * progress;
      const curY = 180 - Math.sin(progress * Math.PI) * 110 * (slingPower / 70);
      setStonePosition({ x: curX, y: curY });

      if (progress >= 1) {
        clearInterval(anim);
        setIsThrowing(false);
        setDavidStonesLeft((s) => s - 1);

        if (isHit) {
          playSound('reaction');
          setDavidScore((s) => s + 250);
          setGoliathHitMessage('🎯 DIRECT HIT! Goliath falls! In the name of the Lord of Hosts! (1 Sam 17:45)');
        } else {
          setGoliathHitMessage('💨 Missed! Adjust your sling angle and power for the next stone!');
        }

        setTimeout(() => {
          setStonePosition({ x: 40, y: 180 });
        }, 1200);
      }
    }, 30);
  }

  // Handle Noah's Ark Card Click
  function handleCardClick(card) {
    if (flippedCards.length >= 2 || flippedCards.some((c) => c.uniqueId === card.uniqueId)) return;
    if (matchedPairs.includes(card.animalId)) return;

    playSound('click');
    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      if (newFlipped[0].animalId === newFlipped[1].animalId) {
        playSound('reaction');
        setMatchedPairs((prev) => {
          const next = [...prev, newFlipped[0].animalId];
          if (next.length === NOAH_ANIMALS.length) {
            setArkWon(true);
            playSound('bell');
          }
          return next;
        });
        setTimeout(() => setFlippedCards([]), 450);
      } else {
        setTimeout(() => setFlippedCards([]), 900);
      }
    }
  }

  return (
    <div className="section-feed-view faith-arcade-view">
      {/* Hero Header */}
      <div className="arcade-hero-banner">
        <div className="arcade-hero-tag">
          <Gamepad2 size={16} />
          <span>Christian Youth, Teen & Kids Arcade</span>
        </div>
        <h2 className="arcade-title">Faith Champions Arcade</h2>
        <p className="arcade-subtitle">
          Interactive offline Bible games for Sunday School, youth fellowships, and family fun. Learn scripture while having a blast!
        </p>

        {/* Game Switcher Tabs */}
        <div className="arcade-game-tabs" role="tablist">
          <button
            type="button"
            className={`arcade-tab-btn${selectedGame === 'trivia' ? ' active' : ''}`}
            onClick={() => setSelectedGame('trivia')}
          >
            <Trophy size={16} />
            <span>Bible Champions Quiz</span>
          </button>
          <button
            type="button"
            className={`arcade-tab-btn${selectedGame === 'david' ? ' active' : ''}`}
            onClick={() => setSelectedGame('david')}
          >
            <Sparkles size={16} />
            <span>David vs Goliath Sling</span>
          </button>
          <button
            type="button"
            className={`arcade-tab-btn${selectedGame === 'ark' ? ' active' : ''}`}
            onClick={() => setSelectedGame('ark')}
          >
            <Heart size={16} />
            <span>Noah’s Ark Pair Rescue</span>
          </button>
        </div>
      </div>

      {/* GAME 1: BIBLE CHAMPIONS QUIZ */}
      {selectedGame === 'trivia' && (
        <div className="post-card arcade-game-card">
          <div className="game-card-header">
            <div className="trivia-score-board">
              <span className="trivia-score-chip">
                <Trophy size={14} /> Score: <strong>{triviaScore}</strong>
              </span>
              {triviaStreak > 1 && (
                <span className="trivia-streak-chip">
                  <Flame size={14} /> Streak: <strong>{triviaStreak}x</strong>
                </span>
              )}
            </div>

            <div className="trivia-tier-selector">
              <button
                type="button"
                className={`tier-pill${triviaCategory === 'all' ? ' active' : ''}`}
                onClick={() => {
                  setTriviaCategory('all');
                  handleRestartTrivia();
                }}
              >
                All Ages
              </button>
              <button
                type="button"
                className={`tier-pill${triviaCategory === 'kids' ? ' active' : ''}`}
                onClick={() => {
                  setTriviaCategory('kids');
                  handleRestartTrivia();
                }}
              >
                👶 Kids
              </button>
              <button
                type="button"
                className={`tier-pill${triviaCategory === 'teens' ? ' active' : ''}`}
                onClick={() => {
                  setTriviaCategory('teens');
                  handleRestartTrivia();
                }}
              >
                ⚡ Teens
              </button>
              <button
                type="button"
                className={`tier-pill${triviaCategory === 'youth' ? ' active' : ''}`}
                onClick={() => {
                  setTriviaCategory('youth');
                  handleRestartTrivia();
                }}
              >
                📖 Youth & Adults
              </button>
            </div>
          </div>

          {!triviaFinished ? (
            <div className="trivia-question-body">
              <div className="q-progress-bar">
                <div
                  className="q-progress-fill"
                  style={{ width: `${((currentQIndex + 1) / activeQuestions.length) * 100}%` }}
                />
              </div>

              <div className="q-meta-row">
                <span className="q-tier-tag">{currentQ.tierLabel}</span>
                <span className="q-number-count">
                  Question {currentQIndex + 1} of {activeQuestions.length}
                </span>
              </div>

              <h3 className="trivia-question-text">{currentQ.question}</h3>

              <div className="trivia-options-grid">
                {currentQ.options.map((opt, idx) => {
                  let optClass = 'trivia-option-btn';
                  if (isAnswered) {
                    if (idx === currentQ.correct) optClass += ' correct';
                    else if (selectedOption === idx) optClass += ' wrong';
                    else optClass += ' disabled';
                  } else if (selectedOption === idx) {
                    optClass += ' selected';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={optClass}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswered}
                    >
                      <span className="opt-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="opt-text">{opt}</span>
                      {isAnswered && idx === currentQ.correct && (
                        <CheckCircle2 size={18} className="opt-status-icon success" />
                      )}
                      {isAnswered && selectedOption === idx && idx !== currentQ.correct && (
                        <XCircle size={18} className="opt-status-icon fail" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className="trivia-scripture-explanation">
                  <span className="scrip-label">📖 Scripture Reference:</span>
                  <p>{currentQ.scripture}</p>
                  <button type="button" className="trivia-next-btn" onClick={handleNextQuestion}>
                    <span>{currentQIndex + 1 >= activeQuestions.length ? 'View Results' : 'Next Question'}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="trivia-finished-box">
              <Trophy size={48} className="results-trophy-icon" />
              <h3>Quiz Completed!</h3>
              <p className="results-score-text">
                Your Final Score: <strong>{triviaScore} Points</strong>
              </p>
              <p className="results-subtext">
                {triviaScore >= 300
                  ? '🌟 Outstanding! You are truly a Bible Champion with sharp knowledge of the Word!'
                  : 'Great job! Keep reading and meditating on sacred scripture with your fellowship.'}
              </p>
              <button type="button" className="trivia-restart-btn" onClick={handleRestartTrivia}>
                <RotateCcw size={16} />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME 2: DAVID VS GOLIATH SLING CHALLENGE */}
      {selectedGame === 'david' && (
        <div className="post-card arcade-game-card david-game-card">
          <div className="game-card-header">
            <div className="david-stat-row">
              <span className="david-score-chip">
                <Trophy size={14} /> Score: <strong>{davidScore}</strong>
              </span>
              <span className="david-stones-chip">
                🪨 Smooth Stones Left: <strong>{davidStonesLeft}</strong>
              </span>
            </div>
            <button
              type="button"
              className="david-reset-btn"
              onClick={() => {
                setDavidStonesLeft(5);
                setDavidScore(0);
                setGoliathHitMessage('');
              }}
            >
              <RotateCcw size={14} /> Reset 5 Stones
            </button>
          </div>

          {/* Interactive HTML5 Canvas / Visual Arena */}
          <div className="sling-arena">
            <div className="valley-ground" />

            {/* Young David */}
            <div className="david-character">
              <span className="character-emoji">👦</span>
              <span className="character-label">David</span>
              <div className="sling-indicator" style={{ transform: `rotate(-${slingAngle}deg)` }}>
                <span className="sling-band" />
              </div>
            </div>

            {/* Flying Stone */}
            {isThrowing && (
              <div
                className="sling-stone"
                style={{
                  left: `${stonePosition.x}px`,
                  top: `${stonePosition.y}px`,
                }}
              >
                🪨
              </div>
            )}

            {/* Giant Goliath */}
            <div className="goliath-character">
              <span className="goliath-emoji">🛡️ 👹</span>
              <span className="goliath-label">Goliath of Gath (9ft 9in)</span>
              <div className="goliath-target-ring" />
            </div>
          </div>

          {goliathHitMessage && (
            <div className={`david-message-banner ${goliathHitMessage.includes('HIT') ? 'hit' : 'miss'}`}>
              {goliathHitMessage}
            </div>
          )}

          {/* Sling Controls */}
          <div className="sling-controls-box">
            <div className="control-slider-group">
              <label>
                <span>Angle: <strong>{slingAngle}°</strong> (Optimal: 40° - 55°)</span>
                <input
                  type="range"
                  min="15"
                  max="80"
                  value={slingAngle}
                  disabled={isThrowing || davidStonesLeft <= 0}
                  onChange={(e) => setSlingAngle(Number(e.target.value))}
                />
              </label>

              <label>
                <span>Sling Power: <strong>{slingPower}%</strong> (Optimal: 65% - 85%)</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={slingPower}
                  disabled={isThrowing || davidStonesLeft <= 0}
                  onChange={(e) => setSlingPower(Number(e.target.value))}
                />
              </label>
            </div>

            <button
              type="button"
              className="sling-launch-btn"
              disabled={isThrowing || davidStonesLeft <= 0}
              onClick={handleThrowStone}
            >
              {davidStonesLeft > 0 ? (
                <>
                  <Sparkles size={16} />
                  <span>Launch Stone #{6 - davidStonesLeft}!</span>
                </>
              ) : (
                'Out of Stones! Tap Reset Above'
              )}
            </button>
          </div>
        </div>
      )}

      {/* GAME 3: NOAH'S ARK PAIR MATCH & RESCUE */}
      {selectedGame === 'ark' && (
        <div className="post-card arcade-game-card noah-game-card">
          <div className="game-card-header">
            <div className="ark-status-row">
              <span className="ark-timer-chip">
                ⏱️ Rain Countdown: <strong>{arkTimeLeft}s</strong>
              </span>
              <span className="ark-pairs-chip">
                🚢 Pairs on Ark: <strong>{matchedPairs.length} / {NOAH_ANIMALS.length}</strong>
              </span>
            </div>
            <button type="button" className="ark-restart-btn" onClick={initArkGame}>
              <RotateCcw size={14} /> Restart Board
            </button>
          </div>

          <p className="ark-instructions">
            Find and match animal pairs two-by-two before the torrential rains start to safely board Noah’s Ark!
          </p>

          {!arkGameOver && !arkWon ? (
            <div className="ark-cards-grid">
              {arkCards.map((card) => {
                const isFlipped =
                  flippedCards.some((c) => c.uniqueId === card.uniqueId) ||
                  matchedPairs.includes(card.animalId);
                const isMatched = matchedPairs.includes(card.animalId);

                return (
                  <button
                    key={card.uniqueId}
                    type="button"
                    className={`ark-card${isFlipped ? ' flipped' : ''}${isMatched ? ' matched' : ''}`}
                    onClick={() => handleCardClick(card)}
                  >
                    <span className="ark-card-inner">
                      {isFlipped ? (
                        <span className="ark-animal-emoji">{card.emoji}</span>
                      ) : (
                        <span className="ark-card-back">🌊</span>
                      )}
                    </span>
                    <span className="ark-animal-name">{isFlipped ? card.name : 'Ark'}</span>
                  </button>
                );
              })}
            </div>
          ) : arkWon ? (
            <div className="ark-win-card">
              <span className="ark-rainbow">🌈 🕊️ 🚢</span>
              <h3>All Animals Safely on the Ark!</h3>
              <p>God remembered Noah and every living creature with him on the ark (Genesis 8:1).</p>
              <button type="button" className="ark-restart-btn large" onClick={initArkGame}>
                Play Again
              </button>
            </div>
          ) : (
            <div className="ark-lose-card">
              <span className="ark-rain-cloud">🌧️ ⚡</span>
              <h3>Time’s Up! The Rain Started!</h3>
              <p>Try matching the animal pairs faster to load the ark before time expires.</p>
              <button type="button" className="ark-restart-btn large" onClick={initArkGame}>
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
