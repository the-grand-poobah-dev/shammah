// Church subscription plans and billing periods.
// Amounts are in Kenya Shillings (KES). Change numbers here only.

export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyKes: 500,
    blurb: 'For small churches getting started',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    monthlyKes: 3000,
    blurb: 'For growing churches with more members',
  },
};

// period → months and discount off the monthly total
export const PERIODS = {
  monthly: { id: 'monthly', label: 'Monthly', months: 1, discount: 0 },
  quarterly: { id: 'quarterly', label: 'Quarterly', months: 3, discount: 0.1 }, // 10% off
  biannual: { id: 'biannual', label: '6 months', months: 6, discount: 0.15 }, // 15% off
  annual: { id: 'annual', label: 'Yearly', months: 12, discount: 0.2 }, // 20% off
};

/** Total KES to charge for a plan + period (rounded to whole shillings). */
export function priceKes(planId, periodId) {
  const plan = PLANS[planId];
  const period = PERIODS[periodId];
  if (!plan || !period) return null;
  const raw = plan.monthlyKes * period.months;
  const total = Math.round(raw * (1 - period.discount));
  return total;
}

/** Human label e.g. "KES 1,350 · 3 months (10% off)" */
export function priceLabel(planId, periodId) {
  const total = priceKes(planId, periodId);
  const period = PERIODS[periodId];
  if (total == null || !period) return '';
  const off =
    period.discount > 0 ? ` · ${Math.round(period.discount * 100)}% off` : '';
  const months =
    period.months === 1 ? '1 month' : `${period.months} months`;
  return `KES ${total.toLocaleString('en-KE')} · ${months}${off}`;
}

/** Normalise Kenyan phone to 2547XXXXXXXX (Daraja format). */
export function toMpesaPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('7')) return `254${digits}`;
  if (digits.length === 10 && digits.startsWith('07')) return `254${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('254')) return digits;
  if (digits.length === 13 && digits.startsWith('254')) return digits.slice(0, 12);
  return null;
}
