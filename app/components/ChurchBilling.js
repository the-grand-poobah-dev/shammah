'use client';
import { useState } from 'react';
import { PLANS, PERIODS, priceKes, priceLabel, toMpesaPhone } from '../lib/pricing';

/**
 * Billing card for a church.
 * Props:
 *   church   – { id, name, subscription_status, ... }
 *   session  – supabase session (must be signed in)
 *   onPaid   – optional callback after STK is accepted by Daraja
 */
export default function ChurchBilling({ church, session, onPaid }) {
  const [planId, setPlanId] = useState('starter');
  const [periodId, setPeriodId] = useState('monthly');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (!church || !session) return null;

  const amount = priceKes(planId, periodId);
  const status = church.subscription_status || 'unpaid';

  async function handlePay(e) {
    e.preventDefault();
    setErr('');
    setMsg('');

    const normalised = toMpesaPhone(phone);
    if (!normalised) {
      setErr('Enter a valid Safaricom number (07… or 2547…).');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalised,
          churchId: church.id,
          planId,
          periodId,
          userId: session.user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Payment could not be started.');
        setBusy(false);
        return;
      }
      setMsg(data.customerMessage || 'Check your phone and enter your M-Pesa PIN.');
      if (onPaid) onPaid(data);
    } catch (e2) {
      setErr(e2.message || 'Network error.');
    }
    setBusy(false);
  }

  return (
    <div className="billing-card">
      <div className="billing-head">
        <h3 className="billing-title">Church subscription</h3>
        <span className={`billing-status billing-status--${status}`}>
          {status === 'active' ? 'Active' : status === 'trial' ? 'Trial' : 'Unpaid'}
        </span>
      </div>

      <p className="billing-sub">
        Choose a plan for <strong>{church.name}</strong>. You will get an M-Pesa prompt on your phone.
      </p>

      <form className="billing-form" onSubmit={handlePay}>
        <fieldset className="billing-plans" disabled={busy}>
          <legend>Plan</legend>
          {Object.values(PLANS).map((p) => (
            <label key={p.id} className={`billing-option${planId === p.id ? ' selected' : ''}`}>
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={planId === p.id}
                onChange={() => setPlanId(p.id)}
              />
              <span>
                <strong>{p.name}</strong>
                <span className="billing-option-meta">
                  KES {p.monthlyKes.toLocaleString('en-KE')}/mo · {p.blurb}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="billing-periods" disabled={busy}>
          <legend>Billing period</legend>
          <div className="billing-period-row">
            {Object.values(PERIODS).map((per) => (
              <label key={per.id} className={`billing-chip${periodId === per.id ? ' selected' : ''}`}>
                <input
                  type="radio"
                  name="period"
                  value={per.id}
                  checked={periodId === per.id}
                  onChange={() => setPeriodId(per.id)}
                />
                {per.label}
                {per.discount > 0 && (
                  <span className="billing-save">-{Math.round(per.discount * 100)}%</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="billing-total">
          <span>Total due now</span>
          <strong>KES {(amount || 0).toLocaleString('en-KE')}</strong>
        </div>
        <p className="billing-hint mut-light">{priceLabel(planId, periodId)}</p>

        <label className="billing-phone">
          M-Pesa phone number
          <input
            type="tel"
            inputMode="tel"
            placeholder="07XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={busy}
            required
          />
        </label>

        <button type="submit" className="auth-primary billing-pay" disabled={busy}>
          {busy ? 'Sending prompt…' : `Pay KES ${(amount || 0).toLocaleString('en-KE')}`}
        </button>

        {msg && <p className="billing-msg ok">{msg}</p>}
        {err && <p className="billing-msg err">{err}</p>}
      </form>
    </div>
  );
}
