'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Calendar,
  Coins,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Loader2,
  AlertCircle,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { createFundraiser } from '../../lib/data/fundraisersApi';

const CATEGORIES = [
  { id: 'Relief', label: 'Relief & Mercy', icon: '💧', accent: '#10b981' },
  { id: 'Church building', label: 'Church Building', icon: '⛪', accent: '#f59e0b' },
  { id: 'Medical', label: 'Medical & Health', icon: '🩺', accent: '#ef4444' },
  { id: 'Education', label: 'Christian Education', icon: '📚', accent: '#8b5cf6' },
  { id: 'Missions', label: 'Gospel Missions', icon: '🌍', accent: '#06b6d4' },
  { id: 'Community', label: 'Community Outreach', icon: '🤝', accent: '#ec4899' },
];

const SAMPLE_COVERS = [
  'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&auto=format&fit=crop&q=80',
];

export default function FundraiserCreatorModal({
  isOpen,
  onClose,
  currentUser,
  onCreated,
}) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Relief');
  const [location, setLocation] = useState('Nairobi, Kenya');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [goalKes, setGoalKes] = useState(250000);
  const [deadline, setDeadline] = useState('');
  const [storyMd, setStoryMd] = useState('');
  const [coverUrl, setCoverUrl] = useState(SAMPLE_COVERS[0]);
  const [verificationDocUrl, setVerificationDocUrl] = useState('');
  const [milestone1Label, setMilestone1Label] = useState('Phase 1 Launch & Mobilization');
  const [milestone1Amount, setMilestone1Amount] = useState(80000);

  if (!isOpen) return null;

  function handleNext() {
    setErrorMsg('');
    if (step === 1) {
      if (!title.trim() || title.trim().length < 5) {
        setErrorMsg('Please enter a clear campaign title (at least 5 characters).');
        return;
      }
      if (!beneficiaryName.trim()) {
        setErrorMsg('Please specify the beneficiary person, committee, or local church.');
        return;
      }
    } else if (step === 2) {
      if (!goalKes || Number(goalKes) < 100) {
        setErrorMsg('Please enter a valid target goal of at least KES 100.');
        return;
      }
    } else if (step === 3) {
      if (!storyMd.trim() || storyMd.trim().length < 25) {
        setErrorMsg('Please write a short story explaining the need and purpose (at least 25 characters).');
        return;
      }
    }
    playSound('reaction');
    setStep((prev) => Math.min(4, prev + 1));
  }

  function handleBack() {
    setErrorMsg('');
    playSound('reaction');
    setStep((prev) => Math.max(1, prev - 1));
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    playSound('reaction');

    try {
      const milestones = [];
      if (milestone1Label && milestone1Amount) {
        milestones.push({ amount: milestone1Amount, label: milestone1Label });
      }

      const res = await createFundraiser({
        title: title.trim(),
        category,
        location: location.trim(),
        beneficiaryName: beneficiaryName.trim(),
        goalKes: Number(goalKes),
        deadline: deadline || null,
        storyMd: storyMd.trim(),
        coverUrl,
        gallery: [coverUrl],
        verificationDocUrl: verificationDocUrl.trim() || null,
        milestones,
      });

      playSound('postPublished');
      if (onCreated) onCreated(res);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit campaign. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="author-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 100 }}
    >
      <div
        className="inst-profile-modal-card neon-glow-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '580px',
          width: '92%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'color-mix(in srgb, var(--teal) 8%, var(--surface))',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
              Start a Kingdom Fundraiser
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
              Step {step} of 4 · Mobilize the Body of Christ
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="topbar-toggle-btn"
            style={{ width: 32, height: 32, borderRadius: '50%' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stepper bar */}
        <div style={{ display: 'flex', height: 4, background: 'var(--border)' }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                background: s <= step ? '#10b981' : 'transparent',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Body content */}
        <div style={{ padding: '20px', maxHeight: '75dvh', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: BASICS */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Campaign Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Turkana Clean Water Borehole & Solar Pump"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '8px' }}>
                  Cause Category *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCategory(c.id);
                          playSound('reaction');
                        }}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: isSelected ? `2px solid ${c.accent}` : '1px solid var(--border)',
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)',
                          color: isSelected ? c.accent : 'var(--ink)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{c.icon}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Beneficiary Committee or Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Turkana Pastoral Fellowship & Elders Council"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Location / County
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lodwar, Turkana County"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 2: FINANCIAL & TIMELINE */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Target Goal (KES) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--ink-muted)', fontSize: '13px' }}>
                    KES
                  </span>
                  <input
                    type="number"
                    min="100"
                    placeholder="250000"
                    value={goalKes}
                    onChange={(e) => setGoalKes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 48px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '15px',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Campaign Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Milestone setup */}
              <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--surface-sunken)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: '8px' }}>
                  Key Milestone (Tracked on public timeline)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Milestone label, e.g. Drilling rig mobilization"
                    value={milestone1Label}
                    onChange={(e) => setMilestone1Label(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Milestone threshold KES, e.g. 80000"
                    value={milestone1Amount}
                    onChange={(e) => setMilestone1Amount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: STORY & MEDIA */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Campaign Story &amp; Biblical Calling *
                </label>
                <textarea
                  rows={5}
                  placeholder="Explain why this cause matters, scripture inspiration, who will be helped, and how funds will be spent..."
                  value={storyMd}
                  onChange={(e) => setStoryMd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Cover Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    marginBottom: '8px',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', marginBottom: '6px' }}>
                  Or select a preset faith cover:
                </span>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {SAMPLE_COVERS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCoverUrl(url)}
                      style={{
                        width: 64,
                        height: 48,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: coverUrl === url ? '2px solid #10b981' : '1px solid var(--border)',
                        padding: 0,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <img src={url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & VERIFICATION */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                  Live Preview
                </span>
                <h4 style={{ margin: '4px 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                  {title}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  <span>Goal: KES {Number(goalKes || 0).toLocaleString()}</span>
                  <span>{category} · {location}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-muted)', maxHeight: 60, overflow: 'hidden' }}>
                  {storyMd}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Verification Document / Church Recommendation Letter (URL)
                </label>
                <input
                  type="url"
                  placeholder="https://... (Optional pastoral letter or committee ID)"
                  value={verificationDocUrl}
                  onChange={(e) => setVerificationDocUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '12px', color: 'var(--ink-muted)' }}>
                <ShieldCheck size={14} style={{ color: '#10b981', display: 'inline', marginRight: '6px' }} />
                <span>
                  By creating this campaign, you confirm that 100% of M-Pesa donations will be applied transparently to the stated beneficiary.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface)',
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Continue</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="spin" />
                  <span>Launching...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Publish Campaign</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
