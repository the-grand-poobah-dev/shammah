'use client';
import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Headphones,
  GraduationCap,
  BookOpen,
  Coins,
  Sparkles,
  Gamepad2,
  ChevronRight,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { AccentCard, SectionBlock } from './layoutkit';
import { playSound } from '../lib/soundEffects';

export function PollsShelfWidget({ onSelectSection }) {
  return (
    <SectionBlock
      title="Community Polls"
      subtitle="Cast your perspective on church and faith discussions"
      accent="#06b6d4"
      icon={BarChart3}
      action={
        <button
          type="button"
          className="section-view-all-btn"
          onClick={() => {
            playSound('reaction');
            onSelectSection ? onSelectSection('polls') : window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'polls' }));
          }}
        >
          <span>All Polls</span>
          <ChevronRight size={14} />
        </button>
      }
    >
      <AccentCard accent="#06b6d4" variant="wash" className="shelf-widget-card">
        <div className="shelf-widget-body">
          <span className="shelf-widget-badge" style={{ color: '#06b6d4' }}>Active Community Poll</span>
          <h4 className="shelf-widget-title">How do you prefer starting your daily devotional prayer time?</h4>
          <p className="shelf-widget-desc">Early dawn stillness (5am), worship music commute, or evening reflection?</p>
          <button
            type="button"
            className="shelf-widget-cta-btn"
            style={{ background: '#06b6d4' }}
            onClick={() => {
              playSound('reaction');
              window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'polls' }));
            }}
          >
            <span>Vote in Poll →</span>
          </button>
        </div>
      </AccentCard>
    </SectionBlock>
  );
}

export function AudioShelfWidget({ onSelectSection }) {
  return (
    <SectionBlock
      title="Worship &amp; Audio Ministry"
      subtitle="Praise songs, sermon recordings, and morning voice devotionals"
      accent="#f59e0b"
      icon={Headphones}
      action={
        <button
          type="button"
          className="section-view-all-btn"
          onClick={() => {
            playSound('reaction');
            window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'podcasts' }));
          }}
        >
          <span>Listen</span>
          <ChevronRight size={14} />
        </button>
      }
    >
      <AccentCard accent="#f59e0b" variant="wash" className="shelf-widget-card">
        <div className="shelf-widget-body">
          <div className="shelf-audio-highlight-row">
            <div className="shelf-audio-art" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Play size={20} fill="#ffffff" color="#ffffff" />
            </div>
            <div className="shelf-audio-text">
              <strong className="shelf-audio-title">Breakthrough Praise Spontaneous Live</strong>
              <span className="shelf-audio-author">Nairobi Worship Center Choir · 28 min</span>
            </div>
          </div>
        </div>
      </AccentCard>
    </SectionBlock>
  );
}

export function CoursesShelfWidget({ onSelectSection }) {
  return (
    <SectionBlock
      title="Discipleship Academy"
      subtitle="Structured biblical training, theology, and leadership certification"
      accent="#8b5cf6"
      icon={GraduationCap}
      action={
        <button
          type="button"
          className="section-view-all-btn"
          onClick={() => {
            playSound('reaction');
            window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'courses' }));
          }}
        >
          <span>Academy</span>
          <ChevronRight size={14} />
        </button>
      }
    >
      <AccentCard accent="#8b5cf6" variant="wash" className="shelf-widget-card">
        <div className="shelf-widget-body">
          <span className="shelf-widget-badge" style={{ color: '#8b5cf6' }}>Featured Course · Free Certificate</span>
          <h4 className="shelf-widget-title">Foundations of Christian Faith &amp; Doctrine</h4>
          <p className="shelf-widget-desc">6 Modules on Grace, Salvation, Holy Spirit, and Biblical Discipleship in African Context.</p>
        </div>
      </AccentCard>
    </SectionBlock>
  );
}

export function DailyVerseShelfWidget({ onSelectSection }) {
  return (
    <SectionBlock
      title="Verse of the Day"
      subtitle="Today's Scripture anchor from the Holy Bible"
      accent="#10b981"
      icon={BookOpen}
      action={
        <button
          type="button"
          className="section-view-all-btn"
          onClick={() => {
            playSound('reaction');
            window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'bible' }));
          }}
        >
          <span>Read Chapter</span>
          <ChevronRight size={14} />
        </button>
      }
    >
      <AccentCard accent="#10b981" variant="wash" className="shelf-widget-card">
        <div className="shelf-widget-body">
          <blockquote className="shelf-verse-quote">
            “The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.”
          </blockquote>
          <cite className="shelf-verse-reference">— Zephaniah 3:17 (NIV)</cite>
        </div>
      </AccentCard>
    </SectionBlock>
  );
}

export function FundraisersShelfWidget({ onSelectSection }) {
  return (
    <SectionBlock
      title="Kingdom Missions &amp; Giving"
      subtitle="Verified church projects and outreach campaigns"
      accent="#10b981"
      icon={Coins}
      action={
        <button
          type="button"
          className="section-view-all-btn"
          onClick={() => {
            playSound('reaction');
            window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'fundraisers' }));
          }}
        >
          <span>View All</span>
          <ChevronRight size={14} />
        </button>
      }
    >
      <AccentCard accent="#10b981" variant="wash" className="shelf-widget-card">
        <div className="shelf-widget-body">
          <span className="shelf-widget-badge" style={{ color: '#10b981' }}>Missions Goal · Safaricom M-Pesa</span>
          <h4 className="shelf-widget-title">Kibera Youth Outreach &amp; Food Pantry Expansion</h4>
          <p className="shelf-widget-desc">KES 524,000 raised of KES 750,000 target · 142 kingdom partners</p>
        </div>
      </AccentCard>
    </SectionBlock>
  );
}

export function FaithChallengesShelfWidget({ onSelectSection }) {
  return (
    <SectionBlock
      title="Faith Challenges"
      subtitle="Daily Scripture streaks and group devotional actions"
      accent="#ec4899"
      icon={Sparkles}
      action={
        <button
          type="button"
          className="section-view-all-btn"
          onClick={() => {
            playSound('reaction');
            window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'challenges' }));
          }}
        >
          <span>Join</span>
          <ChevronRight size={14} />
        </button>
      }
    >
      <AccentCard accent="#ec4899" variant="wash" className="shelf-widget-card">
        <div className="shelf-widget-body">
          <span className="shelf-widget-badge" style={{ color: '#ec4899' }}>21-Day Challenge</span>
          <h4 className="shelf-widget-title">21 Days of Radical Gratitude &amp; Generosity</h4>
          <p className="shelf-widget-desc">Over 480 believers across Nairobi and Mombasa checking in daily.</p>
        </div>
      </AccentCard>
    </SectionBlock>
  );
}

export function ArcadeGamesShelfWidget({ onSelectSection }) {
  return (
    <SectionBlock
      title="Faith Arcade"
      subtitle="Bible trivia and interactive Christian games"
      accent="#06b6d4"
      icon={Gamepad2}
      action={
        <button
          type="button"
          className="section-view-all-btn"
          onClick={() => {
            playSound('reaction');
            window.dispatchEvent(new CustomEvent('shammah:set-section', { detail: 'games' }));
          }}
        >
          <span>Play Games</span>
          <ChevronRight size={14} />
        </button>
      }
    >
      <AccentCard accent="#06b6d4" variant="wash" className="shelf-widget-card">
        <div className="shelf-widget-body">
          <span className="shelf-widget-badge" style={{ color: '#06b6d4' }}>Interactive Game</span>
          <h4 className="shelf-widget-title">Bible Verse Scramble &amp; Old Testament Trivia</h4>
          <p className="shelf-widget-desc">Test your Scripture knowledge, earn badges, and climb the leaderboard.</p>
        </div>
      </AccentCard>
    </SectionBlock>
  );
}
