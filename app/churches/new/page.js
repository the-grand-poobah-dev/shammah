'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Sparkles,
  Check,
  Shield,
  Globe,
  Phone,
  Mail,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import {
  INSTITUTION_CATEGORIES,
  SUBSCRIPTION_PLANS,
  registerInstitution,
} from '../../lib/institutionManager';
import { playSound } from '../../lib/soundEffects';

export default function RegisterChurchPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('Main Sanctuary');
  const [category, setCategory] = useState('church');
  const [denomination, setDenomination] = useState('');
  const [location, setLocation] = useState('Nairobi, Kenya');
  const [county, setCounty] = useState('Nairobi');
  const [about, setAbout] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.email) {
        setEmail(data.session.user.email);
      }
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter the name of your church or institution.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    const catObj =
      INSTITUTION_CATEGORIES.find((c) => c.id === category) || INSTITUTION_CATEGORIES[1];

    let remoteId = null;
    if (session?.user?.id) {
      try {
        const { data: inserted } = await supabase
          .from('churches')
          .insert({
            name: name.trim(),
            location: location.trim(),
            about: about.trim() || null,
            created_by: session.user.id,
          })
          .select('id')
          .single();
        if (inserted?.id) {
          remoteId = inserted.id;
        }
      } catch {}
    }

    const created = registerInstitution(
      {
        id: remoteId || `inst-${Date.now()}`,
        name: name.trim(),
        branch: branch.trim() || 'Main Sanctuary',
        category,
        categoryLabel: catObj.label,
        denomination: denomination.trim() || catObj.label,
        location: location.trim() || 'Nairobi, Kenya',
        county: county.trim() || 'Nairobi',
        about:
          about.trim() ||
          `${name.trim()} is a Christ-centered community dedicated to worship, discipleship, and service.`,
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        plan: selectedPlan,
      },
      session?.user || { id: 'local-owner', email }
    );

    playSound('postPublished');
    setSubmitting(false);
    router.push(`/churches/${created?.id || 'inst-citam'}`);
  }

  return (
    <main className="shell">
      <div className="sticky-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/?tab=churches"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to churches"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>Register Institution</h1>
              <span className="brand-subtext">Onboard Church, CU or Ministry</span>
            </div>
          </div>
        </header>
      </div>

      <div className="cx-page">
        <form onSubmit={handleSubmit} className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={22} className="text-teal-400" />
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Create Your Official Page</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-muted)' }}>
                Connect your congregation, campus Christian Union, or ministry on Shammah.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="compose-error" role="alert">
              {errorMsg}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Institution / Church Name *
            </label>
            <input
              type="text"
              className="inst-search-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nairobi Chapel Ngong Road"
              required
              style={{ paddingLeft: 14 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Category
              </label>
              <select
                className="inst-search-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ paddingLeft: 14 }}
              >
                {INSTITUTION_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Campus / Sanctuary Branch
              </label>
              <input
                type="text"
                className="inst-search-field"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Main Sanctuary / Town Campus"
                style={{ paddingLeft: 14 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Location / Address
              </label>
              <input
                type="text"
                className="inst-search-field"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Ngong Road, Nairobi"
                style={{ paddingLeft: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Denomination / Affiliation
              </label>
              <input
                type="text"
                className="inst-search-field"
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
                placeholder="e.g. Evangelical / Pentecostal / Interdenominational"
                style={{ paddingLeft: 14 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              About &amp; Mission Statement
            </label>
            <textarea
              className="inst-search-field"
              rows={3}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Describe your church services, mission, and weekly gatherings…"
              style={{ paddingLeft: 14 }}
            />
          </div>

          {/* Owner-Only Subscription Plan Selection */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Shield size={16} className="text-teal-400" />
              <strong style={{ fontSize: 14 }}>Select Initial Page Plan (Visible Only to You as Owner)</strong>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 12px' }}>
              Your subscription tier is private to you as the page administrator and never shown to public visitors.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
              {SUBSCRIPTION_PLANS.map((plan) => {
                const active = selectedPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: active ? `2px solid ${plan.badgeColor}` : '1px solid var(--border)',
                      background: active ? 'rgba(20, 184, 166, 0.08)' : 'var(--bg)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 13.5, color: plan.badgeColor }}>{plan.name}</strong>
                      {active && <Check size={15} className="text-teal-400" />}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, margin: '4px 0' }}>
                      {plan.monthlyPrice === 0 ? 'Free' : `KES ${plan.monthlyPrice.toLocaleString()}/mo`}
                    </div>
                    <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', margin: 0 }}>{plan.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
            <Link href="/?tab=churches" className="inst-btn-secondary" style={{ textDecoration: 'none' }}>
              Cancel
            </Link>
            <button type="submit" className="inst-btn-primary" disabled={submitting}>
              <Sparkles size={15} />
              <span>{submitting ? 'Creating Page…' : 'Create Institution Page'}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
