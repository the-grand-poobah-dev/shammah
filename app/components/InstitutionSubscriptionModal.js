'use client';
import { useState } from 'react';
import {
  Shield,
  Sparkles,
  Check,
  Lock,
  ArrowRight,
  Clock,
  Coins,
  BookOpen,
  Calendar,
  Users,
  AlertTriangle,
  X,
  CreditCard,
  Phone,
} from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  BILLING_INTERVALS,
  calculatePlanPrice,
  getInstitutionSubscription,
  upgradeInstitutionPlan,
  downgradeInstitutionToFree,
  isInstitutionOwner,
} from '../lib/institutionManager';
import { playSound } from '../lib/soundEffects';

export default function InstitutionSubscriptionModal({
  institution,
  session = null,
  currentUser = null,
  onClose,
  onUpdated,
}) {
  const isOwner = isInstitutionOwner(institution, session?.user || currentUser, currentUser);
  const currentSub = getInstitutionSubscription(institution.id);
  const [selectedPlanId, setSelectedPlanId] = useState(
    currentSub.planId === 'free' ? 'popular' : currentSub.planId
  );
  const [selectedIntervalId, setSelectedIntervalId] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [phone, setPhone] = useState('0712 345 678');
  const [showMpesaPrompt, setShowMpesaPrompt] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const pricing = calculatePlanPrice(selectedPlanId, selectedIntervalId);
  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === currentSub.planId) || SUBSCRIPTION_PLANS[0];

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }

  function handleStartUpgrade(isTrial = false) {
    if (selectedPlanId === 'free') {
      handleDowngrade();
      return;
    }
    if (isTrial) {
      setIsProcessing(true);
      setTimeout(() => {
        upgradeInstitutionPlan(institution.id, selectedPlanId, selectedIntervalId, true);
        setIsProcessing(false);
        showToast(`🎉 7-day free trial activated for ${institution.name}!`);
        playSound('achievement');
        onUpdated?.();
        setTimeout(() => onClose(), 1200);
      }, 700);
    } else {
      setShowMpesaPrompt(true);
    }
  }

  async function handleConfirmMpesaPayment() {
    if (!isOwner) {
      showToast('Only the page owner can modify this subscription plan.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch('/api/mpesa/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          amount: pricing.totalAmount,
          tier: selectedPlanId,
          tierLabel: `${institution.name} - ${selectedPlanId} (${selectedIntervalId})`,
          institutionId: institution.id,
          planId: selectedPlanId,
          intervalId: selectedIntervalId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && data?.error) {
        showToast(data.error);
        setIsProcessing(false);
        return;
      }
      upgradeInstitutionPlan(institution.id, selectedPlanId, selectedIntervalId, false);
      setIsProcessing(false);
      setShowMpesaPrompt(false);
      showToast(`✅ Payment confirmed! Upgraded to ${SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId)?.name}!`);
      playSound('achievement');
      onUpdated?.();
      setTimeout(() => onClose(), 1200);
    } catch {
      upgradeInstitutionPlan(institution.id, selectedPlanId, selectedIntervalId, false);
      setIsProcessing(false);
      setShowMpesaPrompt(false);
      showToast(`✅ Upgraded to ${SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId)?.name}!`);
      playSound('achievement');
      onUpdated?.();
      setTimeout(() => onClose(), 1200);
    }
  }

  function handleDowngrade() {
    if (!isOwner) return;
    downgradeInstitutionToFree(institution.id);
    setShowDowngradeConfirm(false);
    showToast('Plan changed to Free. Your earned funds and course archives remain preserved.');
    onUpdated?.();
    setTimeout(() => onClose(), 1200);
  }

  if (!isOwner) {
    return (
      <div className="vis-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div className="vis-modal-card neon-glow-modal" onClick={(e) => e.stopPropagation()}>
          <div className="vis-modal-header">
            <div className="vis-modal-title">
              <Lock size={20} className="text-amber-500" />
              <div>
                <h3>Page Owner Access Only</h3>
              </div>
            </div>
            <button type="button" className="vis-close-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <p className="vis-modal-sub">
            The subscription plan and billing settings for <strong>{institution?.name}</strong> are private and only visible to the page owner.
          </p>
          <div className="vis-modal-actions">
            <button type="button" className="vis-save-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vis-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="vis-modal-card neon-glow-modal inst-sub-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vis-modal-header">
          <div className="vis-modal-title">
            <Sparkles size={20} className="text-amber-500" />
            <div>
              <h3>Institution Plans &amp; Ministry Subscriptions</h3>
              <p className="inst-sub-institution-name">{institution.name}</p>
            </div>
          </div>
          <button type="button" className="vis-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Current Status Banner */}
        <div className="inst-current-status-bar">
          <div className="inst-status-left">
            <span className="inst-status-pill" style={{ background: currentPlan.badgeColor }}>
              {currentPlan.name}
            </span>
            {currentSub.isTrial && <span className="inst-trial-pill">7-Day Free Trial Active</span>}
            {currentSub.coursesPaused && (
              <span className="inst-paused-pill" title="Existing courses are safe but paused until re-upgrade">
                Courses Paused (Archived)
              </span>
            )}
          </div>
          <div className="inst-status-right">
            {currentSub.planId !== 'free' ? (
              <button
                type="button"
                className="inst-downgrade-link"
                onClick={() => setShowDowngradeConfirm(true)}
              >
                Downgrade to Free
              </button>
            ) : (
              <span className="text-muted-sm">Basic Free Plan</span>
            )}
          </div>
        </div>

        {/* Interval Selector with Discounts */}
        <div className="inst-billing-interval-selector">
          {BILLING_INTERVALS.map((inv) => (
            <button
              key={inv.id}
              type="button"
              className={`inst-interval-pill${selectedIntervalId === inv.id ? ' active' : ''}`}
              onClick={() => setSelectedIntervalId(inv.id)}
            >
              <span>{inv.label}</span>
              {inv.discountLabel && <span className="inst-discount-badge">{inv.discountLabel}</span>}
            </button>
          ))}
        </div>

        {/* Plan Cards Grid */}
        <div className="inst-plans-grid">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const planPricing = calculatePlanPrice(plan.id, selectedIntervalId);
            const isSelected = selectedPlanId === plan.id;
            const isCurrent = currentSub.planId === plan.id;

            return (
              <div
                key={plan.id}
                className={`inst-plan-card${isSelected ? ' is-selected' : ''}${plan.popular ? ' is-popular' : ''}`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                {plan.popular && <span className="inst-popular-ribbon">Most Popular</span>}
                <div className="inst-plan-header">
                  <h4 style={{ color: plan.badgeColor }}>{plan.name}</h4>
                  <p className="inst-plan-desc">{plan.description}</p>
                </div>

                <div className="inst-plan-price-row">
                  {plan.monthlyPrice === 0 ? (
                    <div className="inst-price-box">
                      <span className="inst-currency">Kes</span>
                      <strong className="inst-amount">0</strong>
                      <span className="inst-period">/ month</span>
                    </div>
                  ) : (
                    <div className="inst-price-box">
                      <span className="inst-currency">Kes</span>
                      <strong className="inst-amount">{planPricing.monthlyRate.toLocaleString()}</strong>
                      <span className="inst-period">/ mo</span>
                      {selectedIntervalId !== 'monthly' && (
                        <div className="inst-billing-subtext">
                          Billed as Kes {planPricing.totalAmount.toLocaleString()} / {selectedIntervalId}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <ul className="inst-plan-features-list">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="inst-feature-item">
                      <Check size={14} className="inst-check-icon" />
                      <span>{feat}</span>
                    </li>
                  ))}
                  {plan.lockedFeatures.map((lfeat, i) => (
                    <li key={`lock-${i}`} className="inst-feature-item locked">
                      <Lock size={13} className="inst-lock-icon" />
                      <span>{lfeat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`inst-plan-select-btn${isSelected ? ' active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlanId(plan.id);
                  }}
                >
                  {isCurrent ? 'Current Plan' : isSelected ? 'Selected' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Retention Policy Notice */}
        <div className="inst-retention-notice">
          <Shield size={16} className="text-teal-600 flex-shrink-0" />
          <p>
            <b>Creator Ownership Guarantee:</b> If you ever pause or downgrade your plan, you still retain full control over all money raised and your course content. Existing courses remain safely archived under your admin dashboard (simply paused for members until re-upgraded).
          </p>
        </div>

        {/* Action Bottom Bar */}
        <div className="inst-sub-footer-actions">
          <button type="button" className="inst-btn-secondary" onClick={onClose}>
            Cancel
          </button>

          {selectedPlanId !== 'free' && (
            <button
              type="button"
              className="inst-btn-trial"
              disabled={isProcessing}
              onClick={() => handleStartUpgrade(true)}
            >
              <Clock size={16} />
              <span>Start 7-Day Free Trial</span>
            </button>
          )}

          <button
            type="button"
            className="inst-btn-primary"
            disabled={isProcessing}
            onClick={() => handleStartUpgrade(false)}
          >
            <Sparkles size={16} />
            <span>
              {selectedPlanId === 'free'
                ? 'Switch to Free Plan'
                : `Upgrade (Kes ${pricing.totalAmount.toLocaleString()})`}
            </span>
          </button>
        </div>

        {/* M-Pesa STK Prompt Dialog */}
        {showMpesaPrompt && (
          <div className="inst-mpesa-overlay" onClick={() => setShowMpesaPrompt(false)}>
            <div className="inst-mpesa-card" onClick={(e) => e.stopPropagation()}>
              <div className="inst-mpesa-header">
                <Phone size={24} className="text-emerald-500" />
                <h4>Lipa na M-Pesa Online</h4>
                <p>Complete your institution subscription securely via Safaricom M-Pesa.</p>
              </div>

              <div className="inst-mpesa-body">
                <div className="inst-mpesa-field">
                  <label>M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="inst-phone-input"
                  />
                </div>

                <div className="inst-mpesa-summary">
                  <div className="summary-row">
                    <span>Plan:</span>
                    <strong>{SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId)?.name}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Billing:</span>
                    <span>{selectedIntervalId.toUpperCase()}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Amount:</span>
                    <strong>Kes {pricing.totalAmount.toLocaleString()}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="inst-mpesa-pay-btn"
                  disabled={isProcessing}
                  onClick={handleConfirmMpesaPayment}
                >
                  {isProcessing ? 'Processing STK Push…' : 'Send M-Pesa Prompt'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Downgrade Confirmation Dialog */}
        {showDowngradeConfirm && (
          <div className="inst-mpesa-overlay" onClick={() => setShowDowngradeConfirm(false)}>
            <div className="inst-mpesa-card" onClick={(e) => e.stopPropagation()}>
              <div className="inst-mpesa-header">
                <AlertTriangle size={26} className="text-amber-500" />
                <h4>Downgrade to Free Plan?</h4>
              </div>
              <div className="inst-mpesa-body">
                <p className="inst-confirm-text">
                  Your page will be switched to Free access.
                  <br />
                  <b>Your money raised and course curriculum remain 100% safe</b> and under your admin control. However, paid courses will be paused for members until you upgrade again.
                </p>
                <div className="inst-confirm-btns">
                  <button type="button" className="inst-btn-danger" onClick={handleDowngrade}>
                    Yes, Switch to Free
                  </button>
                  <button type="button" className="inst-btn-secondary" onClick={() => setShowDowngradeConfirm(false)}>
                    Keep My Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toastMessage && <div className="inst-sub-toast">{toastMessage}</div>}
      </div>
    </div>
  );
}
