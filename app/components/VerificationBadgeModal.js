'use client';
import { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  Sparkles,
  Smartphone,
  CreditCard,
  Church,
  Award,
} from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';
import {
  VERIFICATION_TIERS,
  getVerificationSubscription,
  requestVerificationSubscription,
  cancelVerificationSubscription,
} from '../lib/profileManager';
import { playSound } from '../lib/soundEffects';

export default function VerificationBadgeModal({ session, profile, onClose }) {
  const [selectedTier, setSelectedTier] = useState('quarterly');
  const [role, setRole] = useState('pastor');
  const [phoneNumber, setPhoneNumber] = useState('254712345678');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [churchName, setChurchName] = useState(profile?.church_name || '');
  const [currentSub, setCurrentSub] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      setCurrentSub(getVerificationSubscription(session.user.id));
    }
  }, [session?.user?.id]);

  const activeTier = VERIFICATION_TIERS.find((t) => t.id === selectedTier) || VERIFICATION_TIERS[0];

  function handleSubscribe(e) {
    e.preventDefault();
    setProcessing(true);

    setTimeout(() => {
      const sub = requestVerificationSubscription(session?.user?.id, selectedTier, role);
      setCurrentSub(sub);
      setProcessing(false);
      setSuccessMsg(`Congratulations! Your ${activeTier.name} is active with official ${role} badge.`);
      playSound('postPublished');
    }, 900);
  }

  function handleCancel() {
    if (confirm('Are you sure you want to cancel your verification badge subscription?')) {
      cancelVerificationSubscription(session?.user?.id);
      setCurrentSub(null);
      setSuccessMsg('Verification subscription cancelled.');
    }
  }

  return (
    <div className="verification-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="verification-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="verification-modal-header">
          <div className="verif-title-row">
            <span className="verif-icon-box">
              <ShieldCheck size={20} className="verif-icon" />
            </span>
            <div>
              <h3>Ministry &amp; Member Verification</h3>
              <p className="verif-sub">Official blue checkmark &amp; pastoral verification badge</p>
            </div>
          </div>
          <button type="button" className="verif-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Live Badge Preview Banner */}
        <div className="verif-preview-banner">
          <div className="verif-avatar-preview">
            <VerifiedBadge badge={role} size={28} />
          </div>
          <div className="verif-preview-text">
            <div className="preview-name-row">
              <strong>{profile?.display_name || session?.user?.email || 'Pastor / Member'}</strong>
              <VerifiedBadge badge={role} size={16} />
            </div>
            <span>Verified {role === 'pastor' ? 'Pastor' : role === 'worship' ? 'Worship Leader' : role === 'church_admin' ? 'Church Administrator' : 'Ministry Partner'}</span>
          </div>
        </div>

        {currentSub ? (
          <div className="verif-active-status-card">
            <div className="active-status-left">
              <Sparkles size={20} className="sparkle-active" />
              <div>
                <strong>Verification Active ({currentSub.tierName})</strong>
                <p>Renews at Kes. {currentSub.amountKes}. Verified role: {currentSub.roleDetails}.</p>
              </div>
            </div>
            <button type="button" className="verif-cancel-btn" onClick={handleCancel}>
              Cancel Plan
            </button>
          </div>
        ) : (
          <form className="verif-form" onSubmit={handleSubscribe}>
            {/* Choose Role */}
            <div className="verif-section-group">
              <label className="verif-label">Select Ministry Role to Verify:</label>
              <div className="verif-roles-grid">
                {[
                  { id: 'pastor', label: 'Lead Pastor / Shepherd' },
                  { id: 'worship', label: 'Worship Leader / Psalmist' },
                  { id: 'church_admin', label: 'Church Administrator' },
                  { id: 'partner', label: 'Ministry Partner / Mentor' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`verif-role-chip${role === r.id ? ' active' : ''}`}
                    onClick={() => setRole(r.id)}
                  >
                    <VerifiedBadge badge={r.id} size={14} />
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Church Affiliation */}
            <div className="verif-section-group">
              <label className="verif-label" htmlFor="church-name-input">Church or Ministry Affiliation:</label>
              <input
                id="church-name-input"
                type="text"
                placeholder="e.g. Nairobi Worship Center, Grace Chapel"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="verif-input"
              />
            </div>

            {/* Choose Pricing Tier (Kes. 300/mo with discounts) */}
            <div className="verif-section-group">
              <label className="verif-label">Choose Subscription Plan:</label>
              <div className="verif-tiers-list">
                {VERIFICATION_TIERS.map((tier) => {
                  const isSelected = selectedTier === tier.id;
                  return (
                    <div
                      key={tier.id}
                      className={`verif-tier-item${isSelected ? ' active' : ''}`}
                      onClick={() => setSelectedTier(tier.id)}
                    >
                      <div className="tier-radio">
                        <input
                          type="radio"
                          name="verifTier"
                          checked={isSelected}
                          onChange={() => setSelectedTier(tier.id)}
                        />
                      </div>
                      <div className="tier-info">
                        <div className="tier-name-row">
                          <strong>{tier.name}</strong>
                          {tier.popular && <span className="tier-badge popular">Most Popular</span>}
                          {tier.bestValue && <span className="tier-badge best">Best Value</span>}
                        </div>
                        <span className="tier-discount">{tier.discountLabel}</span>
                      </div>
                      <div className="tier-price-box">
                        <span className="tier-kes">Kes. {tier.priceKes}</span>
                        <small>({tier.billingCycle})</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method */}
            <div className="verif-section-group">
              <label className="verif-label">Select Payment Method:</label>
              <div className="verif-pay-methods">
                <button
                  type="button"
                  className={`verif-pay-btn${paymentMethod === 'mpesa' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('mpesa')}
                >
                  <Smartphone size={16} />
                  <span>M-Pesa Express</span>
                </button>
                <button
                  type="button"
                  className={`verif-pay-btn${paymentMethod === 'card' ? ' active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard size={16} />
                  <span>Credit / Debit Card</span>
                </button>
              </div>

              {paymentMethod === 'mpesa' && (
                <div className="mpesa-input-wrap">
                  <label htmlFor="mpesa-number">M-Pesa Phone Number:</label>
                  <input
                    id="mpesa-number"
                    type="tel"
                    placeholder="2547XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="verif-input"
                  />
                  <small className="mpesa-hint">Prompt will appear on your phone to authorize Kes. {activeTier.priceKes}</small>
                </div>
              )}
            </div>

            {successMsg && (
              <div className="verif-success-banner">
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <button type="submit" className="verif-submit-btn" disabled={processing}>
              <ShieldCheck size={18} />
              <span>{processing ? 'Processing Payment…' : `Pay Kes. ${activeTier.priceKes} & Activate Badge`}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
