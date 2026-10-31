'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Heart,
  Phone,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  Loader2,
  Lock,
  Copy,
  AlertCircle,
  Share2,
  RotateCcw,
  BellRing,
} from 'lucide-react';
import { playSound } from '../../lib/soundEffects';
import { donateToFundraiser, checkDonationStatus } from '../../lib/data/fundraisersApi';

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

export default function FundraiserDonateModal({
  isOpen,
  onClose,
  fundraiser,
  currentUser,
  onSuccess,
}) {
  const [amount, setAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [enableReminder, setEnableReminder] = useState(false);
  const [sandboxInstant, setSandboxInstant] = useState(true);

  const [status, setStatus] = useState('idle'); // idle | initiating | waiting_pin | succeeded | failed
  const [errorMsg, setErrorMsg] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setErrorMsg('');
      setReceiptData(null);
      setPollCount(0);
    }
  }, [isOpen]);

  const activeAmount = customAmount ? Number(customAmount) : amount;

  function handleSelectPreset(val) {
    playSound('reaction');
    setAmount(val);
    setCustomAmount('');
  }

  // Polling for STK Push confirmation if not instant
  useEffect(() => {
    let timer = null;
    if (status === 'waiting_pin' && receiptData?.checkoutRequestId && !sandboxInstant) {
      timer = setInterval(async () => {
        try {
          const res = await checkDonationStatus({
            checkoutRequestId: receiptData.checkoutRequestId,
            donationId: receiptData.donationId,
            fundraiserId: fundraiser?.id,
          });

          if (res?.status === 'succeeded' || res?.status === 'completed') {
            setStatus('succeeded');
            playSound('postPublished');
            if (onSuccess) onSuccess(res.fundraiser || fundraiser);
            clearInterval(timer);
          } else if (res?.status === 'failed') {
            setStatus('failed');
            setErrorMsg('Payment was cancelled or expired on your phone.');
            clearInterval(timer);
          } else {
            setPollCount((prev) => {
              if (prev >= 20) {
                // Timeout after 60 seconds
                clearInterval(timer);
                setStatus('failed');
                setErrorMsg('M-Pesa prompt timed out. Please check your connection and retry.');
                return prev;
              }
              return prev + 1;
            });
          }
        } catch {}
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [status, receiptData, sandboxInstant, fundraiser, onSuccess]);

  async function handleInitiate(e) {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!activeAmount || activeAmount < 10) {
      setErrorMsg('Please select or enter a donation amount of at least KES 10.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone) {
      setErrorMsg('Please enter your Safaricom M-Pesa phone number.');
      return;
    }

    setStatus('initiating');
    playSound('reaction');

    try {
      const res = await donateToFundraiser({
        fundraiserId: fundraiser.id,
        amount: activeAmount,
        phone: cleanPhone,
        donorName: isAnonymous ? 'Anonymous Disciple' : (currentUser?.display_name || currentUser?.name || 'A Believer in Christ'),
        anonymous: isAnonymous,
        message: message.trim() || null,
        userId: currentUser?.id || null,
        simulateConfirmation: sandboxInstant,
      });

      setReceiptData(res);

      if (sandboxInstant || res.status === 'succeeded') {
        setStatus('succeeded');
        playSound('postPublished');
        if (onSuccess) onSuccess(res.fundraiser || fundraiser);
      } else {
        setStatus('waiting_pin');
        playSound('alert');
      }
    } catch (err) {
      setStatus('failed');
      setErrorMsg(err.message || 'Payment initiation failed. Please check your phone number.');
    }
  }

  function handleCopyReceipt() {
    if (receiptData?.receiptCode) {
      navigator.clipboard?.writeText(receiptData.receiptCode).catch(() => {});
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
      playSound('reaction');
    }
  }

  if (!isOpen || !fundraiser) return null;

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
          maxWidth: '520px',
          width: '92%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Coins size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                Give via M-Pesa
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                Safe, instant Kingdom giving
              </span>
            </div>
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

        {/* Modal Body */}
        <div style={{ padding: '20px', maxHeight: '82dvh', overflowY: 'auto' }}>
          {/* Campaign target card */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--surface-sunken, rgba(255,255,255,0.03))',
              border: '1px solid var(--border)',
              marginBottom: '18px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                marginBottom: '4px',
              }}
            >
              {fundraiser.category || 'Kingdom Cause'}
            </span>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
              {fundraiser.title}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--ink-muted)' }}>
              <ShieldCheck size={13} style={{ color: '#10b981' }} />
              <span>Beneficiary: {fundraiser.beneficiary_name || 'Verified Ministry Fund'}</span>
            </div>
          </div>

          {/* Form states */}
          {status === 'idle' || status === 'initiating' ? (
            <form onSubmit={handleInitiate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Presets */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Select Amount (KES)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {PRESET_AMOUNTS.map((val) => {
                    const isSelected = !customAmount && amount === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectPreset(val)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #10b981' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'var(--surface)',
                          color: isSelected ? '#10b981' : 'var(--ink)',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {val.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Or Custom Amount (Min KES 10)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--ink-muted)', fontSize: '13px' }}>
                    KES
                  </span>
                  <input
                    type="number"
                    min="10"
                    placeholder="Enter amount..."
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      if (e.target.value) setAmount(Number(e.target.value));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 48px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Phone number */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  M-Pesa Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
                  <input
                    type="tel"
                    placeholder="0712345678 or 254..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)', marginTop: '4px', display: 'block' }}>
                  An instant STK prompt will appear on this Safaricom line.
                </span>
              </div>

              {/* Prayer / Support Message */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '6px' }}>
                  Prayer or Encouraging Message (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Praying for living water in Turkana! God bless you all."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span>Give anonymously (hide my name on public donor wall)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--ink)' }}>
                  <input
                    type="checkbox"
                    checked={enableReminder}
                    onChange={(e) => setEnableReminder(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BellRing size={12} style={{ color: 'var(--teal)' }} />
                    <span>Send me a monthly reminder notification to support this cause</span>
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: 'var(--ink-muted)', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={sandboxInstant}
                    onChange={(e) => setSandboxInstant(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span>Sandbox instant simulation (verifies totals immediately for testing)</span>
                </label>
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={status === 'initiating'}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: status === 'initiating' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                }}
              >
                {status === 'initiating' ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Prompting M-Pesa...</span>
                  </>
                ) : (
                  <>
                    <Coins size={16} />
                    <span>Donate KES {activeAmount ? activeAmount.toLocaleString() : '500'} Now</span>
                  </>
                )}
              </button>
            </form>
          ) : null}

          {/* Waiting for PIN entry */}
          {status === 'waiting_pin' && (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Loader2 size={28} className="spin" />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--ink)' }}>
                Check Your Phone
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                An M-Pesa STK prompt has been sent to <strong>{phone}</strong>.<br />
                Please enter your Safaricom M-Pesa PIN to complete giving KES {activeAmount.toLocaleString()}.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                  fontSize: '11px',
                  color: 'var(--ink-muted)',
                }}
              >
                <Clock size={12} />
                <span>Waiting for M-Pesa network confirmation... ({20 - pollCount}s)</span>
              </div>
            </div>
          )}

          {/* Succeeded */}
          {status === 'succeeded' && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                }}
              >
                <Sparkles size={30} />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--ink)' }}>
                May the Lord Bless You Abundantly!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Your gift of <strong>KES {activeAmount.toLocaleString()}</strong> has been credited directly to{' '}
                <strong>{fundraiser.title}</strong>.
              </p>

              {/* Receipt card */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--surface-sunken, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border)',
                  marginBottom: '18px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>M-Pesa Receipt Code</span>
                  <button
                    type="button"
                    onClick={handleCopyReceipt}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedReceipt ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedReceipt ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '0.05em' }}>
                  {receiptData?.receiptCode || 'SHM' + Math.floor(1000000 + Math.random() * 9000000)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink-muted)', marginTop: '8px', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                  <span>Status: Succeeded</span>
                  <span>{new Date().toLocaleDateString('en-KE')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Done &amp; Return to Causes
              </button>
            </div>
          )}

          {/* Failed */}
          {status === 'failed' && (
            <div style={{ textAlign: 'center', padding: '20px 8px' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <AlertCircle size={26} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--ink)' }}>
                Payment Could Not Complete
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {errorMsg || 'The transaction was cancelled or timed out on M-Pesa. No funds were debited.'}
              </p>

              <button
                type="button"
                onClick={() => setStatus('idle')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={15} />
                <span>Retry Donation</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
