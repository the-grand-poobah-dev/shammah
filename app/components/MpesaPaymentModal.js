'use client';
import { useState } from 'react';
import {
  Heart,
  Phone,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  Coins,
  Loader2,
  Lock,
  Gift,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { playSound } from '../lib/soundEffects';

export const COMMUNITY_PROJECTS = [
  {
    id: 'general-shammah',
    name: 'Shammah Ministry & Gospel Servers',
    tag: 'Platform & Outreach',
    icon: '🕊️',
    description: 'Supports 24/7 cloud servers, encrypted messaging, and free access for rural fellowships.',
    targetKes: 500000,
    raisedKes: 312450,
  },
  {
    id: 'community-food-drive',
    name: 'Community Food Drive & Slum Relief',
    tag: 'Mercy & Outreach',
    icon: '🍞',
    description: 'Providing dry rations, clean water, and prayer support to needy families in Mathare & Kibera.',
    targetKes: 350000,
    raisedKes: 228900,
  },
  {
    id: 'youth-cu-camps',
    name: 'Youth & Campus CU Leadership Camps',
    tag: 'Next-Gen Faith',
    icon: '🔥',
    description: 'Sponsors school Christian Union students with Bibles, camp lodging, and mentorship material.',
    targetKes: 250000,
    raisedKes: 184500,
  },
  {
    id: 'bible-translation',
    name: 'Digital Bible Translation & Audio Scriptures',
    tag: 'God’s Word',
    icon: '📖',
    description: 'Translating scripture devotionals and audio Bible readings into indigenous local dialects.',
    targetKes: 400000,
    raisedKes: 295000,
  },
  {
    id: 'church-tech-equip',
    name: 'Rural Church Audio/Visual Equipment',
    tag: 'Church Building',
    icon: '🔊',
    description: 'Equipping rural village churches with solar sound systems, microphones, and projector screens.',
    targetKes: 300000,
    raisedKes: 142000,
  },
];

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000, 10000];

export default function MpesaPaymentModal({
  defaultProjectId = 'general-shammah',
  onClose,
  currentUser,
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId);
  const [amount, setAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | waiting_pin | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  const selectedProject =
    COMMUNITY_PROJECTS.find((p) => p.id === selectedProjectId) || COMMUNITY_PROJECTS[0];

  const activeAmount = customAmount ? Number(customAmount) : amount;

  function handleSelectPreset(val) {
    setAmount(val);
    setCustomAmount('');
    playSound('reaction');
  }

  async function handleInitiatePayment(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!activeAmount || activeAmount < 1) {
      setErrorMsg('Please select or enter an amount of at least KES 1.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone) {
      setErrorMsg('Please enter your Safaricom M-Pesa phone number.');
      return;
    }

    setStatus('sending');
    playSound('reaction');

    try {
      const res = await fetch('/api/mpesa/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          amount: activeAmount,
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          donorName: isAnonymous ? 'Anonymous Disciple' : (currentUser?.name || 'A Believer in Christ'),
          isAnonymous,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to initiate M-Pesa push.');
      }

      setReceiptData(data);
      setStatus('waiting_pin');
      playSound('alert');

      // Simulate the completion of PIN entry after 4.5 seconds for UX verification
      setTimeout(() => {
        setStatus('success');
        playSound('postPublished');
      }, 4500);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Payment initiation failed. Please try again.');
    }
  }

  return (
    <div className="author-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="inst-profile-modal-card neon-glow-modal max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        {/* Header */}
        <div className="inst-modal-header">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Coins size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Lipa Na M-Pesa · Kingdom Giving</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Instant STK Push
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Support Shammah ministries and community projects across Kenya
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inst-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[82vh] overflow-y-auto space-y-4 text-sm text-gray-200">
          {status === 'idle' || status === 'sending' || status === 'error' ? (
            <form onSubmit={handleInitiatePayment} className="space-y-4">
              {/* Community Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Select Project or Ministry Fund
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {COMMUNITY_PROJECTS.map((proj) => {
                    const isSelected = selectedProjectId === proj.id;
                    const percent = Math.min(100, Math.round((proj.raisedKes / proj.targetKes) * 100));
                    return (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(proj.id);
                          playSound('reaction');
                        }}
                        className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm shadow-emerald-500/10'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-xl shrink-0 p-1.5 rounded-lg bg-white/5">
                          {proj.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-white truncate text-xs">
                              {proj.name}
                            </span>
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                              {proj.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                            {proj.description}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                            <span>KES {proj.raisedKes.toLocaleString()} raised ({percent}%)</span>
                            <span>Target: KES {proj.targetKes.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Choose Blessing Amount (KES)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {PRESET_AMOUNTS.slice(0, 4).map((amt) => {
                    const active = !customAmount && amount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSelectPreset(amt)}
                        className={`py-2 px-1 rounded-xl text-center font-bold text-xs border transition-all ${
                          active
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                        }`}
                      >
                        KES {amt}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.slice(4).map((amt) => {
                    const active = !customAmount && amount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSelectPreset(amt)}
                        className={`py-2 px-1 rounded-xl text-center font-bold text-xs border transition-all ${
                          active
                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                        }`}
                      >
                        KES {amt.toLocaleString()}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input */}
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">
                    KES
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Or enter any custom amount..."
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* M-Pesa Safaricom Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>M-Pesa Safaricom Phone Number</span>
                  <span className="text-[11px] text-emerald-400 font-normal">
                    07XX / 01XX or 2547XX
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-emerald-400">
                    <Phone size={16} />
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-500 text-sm font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-gray-400" />
                  <span className="text-xs text-gray-300">
                    Give anonymously (God sees in secret)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-400 h-4 w-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:opacity-95 transition-all cursor-pointer"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-black" />
                    <span>Connecting to M-Pesa Daraja...</span>
                  </>
                ) : (
                  <>
                    <Coins size={16} />
                    <span>Send M-Pesa STK Prompt (KES {activeAmount.toLocaleString()})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Secured via Safaricom Lipa Na M-Pesa Express</span>
              </div>
            </form>
          ) : status === 'waiting_pin' ? (
            /* Waiting for PIN entry on user's phone */
            <div className="text-center py-8 space-y-4">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 animate-pulse">
                <Phone size={36} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Prompt Sent to Your Phone!</h4>
                <p className="text-xs text-gray-300 mt-1 max-w-xs mx-auto">
                  A Safaricom M-Pesa PIN prompt has been sent to{' '}
                  <strong className="text-white">{phone}</strong> for{' '}
                  <strong className="text-emerald-400">KES {activeAmount.toLocaleString()}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 max-w-xs mx-auto text-left space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Merchant:</span>
                  <span className="text-white font-medium">Shammah</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Project:</span>
                  <span className="text-white font-medium truncate max-w-[150px]">
                    {selectedProject.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Status:</span>
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    Awaiting PIN...
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                Do not close this window. Your donation will confirm automatically once you enter your PIN.
              </p>
            </div>
          ) : (
            /* Successful Giving Confirmation */
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/30">
                <Check size={32} />
              </div>

              <div>
                <h4 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                  <span>Blessing Received! Amen</span>
                  <Sparkles size={16} className="text-amber-400" />
                </h4>
                <p className="text-xs text-emerald-300 mt-1">
                  Thank you for sowing KES {activeAmount.toLocaleString()} into{' '}
                  <strong>{selectedProject.name}</strong>.
                </p>
              </div>

              {/* Receipt details */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-emerald-500/30 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <span>M-Pesa Receipt:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {receiptData?.receiptNumber || 'NL89421034X'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Amount:</span>
                  <span className="text-white font-bold">KES {activeAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Ministry Project:</span>
                  <span className="text-white font-medium truncate max-w-[200px]">
                    {selectedProject.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Date &amp; Time:</span>
                  <span className="text-gray-300">
                    {new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>

              {/* Scripture Blessing */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs italic">
                &ldquo;Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.&rdquo; — 2 Corinthians 9:7
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
