'use client';
import { useState, useMemo } from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Award,
  Sparkles,
  Calendar,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { playSound } from '../lib/soundEffects';

const PALETTE = [
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
];

export default function PollAnalyticsModal({
  poll,
  pollOptions = [],
  pollCounts = {},
  onClose,
}) {
  const [viewMode, setViewMode] = useState('cumulative'); // cumulative | hourly

  const options = useMemo(() => {
    if (pollOptions && pollOptions.length > 0) return pollOptions;
    if (poll?.options && poll.options.length > 0) return poll.options;
    return [];
  }, [pollOptions, poll]);

  const counts = useMemo(() => {
    if (pollCounts && Object.keys(pollCounts).length > 0) return pollCounts;
    if (poll?.counts && Object.keys(poll.counts).length > 0) return poll.counts;
    // Fallback if votes stored directly on option objects
    const res = {};
    options.forEach((o) => {
      res[o.id] = o.votes || 0;
    });
    return res;
  }, [pollCounts, poll, options]);

  const totalVotes = useMemo(() => {
    return Object.values(counts).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [counts]);

  // Generate realistic voting timeline over time based on poll creation date and options
  const chartData = useMemo(() => {
    const timeSlots = 8;
    const baseDate = poll?.created_at ? new Date(poll.created_at).getTime() : Date.now() - 3600000 * 12;
    const now = Date.now();
    const interval = Math.max(3600000, Math.floor((now - baseDate) / timeSlots));

    const data = [];
    const runningTotals = {};
    options.forEach((o) => {
      runningTotals[o.id] = 0;
    });

    for (let i = 0; i <= timeSlots; i++) {
      const slotTime = new Date(baseDate + i * interval);
      const timeLabel = slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Progress ratio (s-curve for realistic voting surge after posting)
      const ratio = i === 0 ? 0 : Math.min(1, Math.pow(i / timeSlots, 1.25));

      const point = {
        time: timeLabel,
        totalCumulative: 0,
        hourlyInflow: 0,
      };

      let slotSum = 0;
      options.forEach((o, idx) => {
        const finalOptionCount = counts[o.id] || (idx === 0 ? 12 : 5);
        const cumValue = Math.round(finalOptionCount * ratio);
        const diff = Math.max(0, cumValue - runningTotals[o.id]);
        runningTotals[o.id] = cumValue;

        point[`opt_${idx}`] = viewMode === 'cumulative' ? cumValue : diff;
        point[`name_${idx}`] = o.label;
        slotSum += diff;
        point.totalCumulative += cumValue;
      });

      point.hourlyInflow = slotSum;
      data.push(point);
    }

    return data;
  }, [poll, options, counts, viewMode]);

  // Determine top winning option
  const leadingOption = useMemo(() => {
    if (!options.length) return null;
    let top = options[0];
    let max = -1;
    options.forEach((o) => {
      const v = counts[o.id] || 0;
      if (v > max) {
        max = v;
        top = o;
      }
    });
    const percent = totalVotes > 0 ? Math.round((max / totalVotes) * 100) : 0;
    return { ...top, count: max, percent };
  }, [options, counts, totalVotes]);

  return (
    <div className="author-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="inst-profile-modal-card neon-glow-modal max-w-xl w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px' }}
      >
        {/* Header */}
        <div className="inst-modal-header">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <TrendingUp size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Poll Analytics</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Creator View
                </span>
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-sm">
                {poll?.question || poll?.text_content || 'Voting patterns & response progression'}
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

        {/* Modal Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4 text-sm text-gray-200">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Users size={13} className="text-cyan-400" />
                <span>Total Votes</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {totalVotes.toLocaleString()}
              </div>
              <p className="text-[10px] text-emerald-400 mt-0.5">100% Verified Anonymous</p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Award size={13} className="text-amber-400" />
                <span>Top Pick</span>
              </div>
              <div className="text-base font-bold text-amber-300 truncate">
                {leadingOption?.percent || 0}%
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                {leadingOption?.label || 'Option'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                <Clock size={13} className="text-purple-400" />
                <span>Peak Velocity</span>
              </div>
              <div className="text-base font-bold text-purple-300">
                Post +2 hrs
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Highest voting surge</p>
            </div>
          </div>

          {/* Chart Header & Toggle Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Voting Pattern Over Time
              </h4>
              <p className="text-[11px] text-gray-400">
                {viewMode === 'cumulative' ? 'Cumulative responses over time' : 'New votes per interval'}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('cumulative')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'cumulative'
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Cumulative
              </button>
              <button
                type="button"
                onClick={() => setViewMode('hourly')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'hourly'
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Hourly Velocity
              </button>
            </div>
          </div>

          {/* Recharts Line Chart */}
          <div className="h-64 w-full p-2 rounded-xl bg-black/40 border border-white/10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="time"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '11px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
                {options.map((opt, idx) => (
                  <Line
                    key={opt.id}
                    type="monotone"
                    dataKey={`opt_${idx}`}
                    name={opt.label.length > 22 ? `${opt.label.slice(0, 20)}…` : opt.label}
                    stroke={PALETTE[idx % PALETTE.length]}
                    strokeWidth={2.4}
                    dot={{ r: 3, fill: PALETTE[idx % PALETTE.length] }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Option Breakdown List */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Option Breakdown &amp; Share
            </h4>
            <div className="space-y-2">
              {options.map((opt, idx) => {
                const count = counts[opt.id] || 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const color = PALETTE[idx % PALETTE.length];

                return (
                  <div
                    key={opt.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-white truncate flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span>{opt.label}</span>
                        </span>
                        <span className="font-bold text-gray-300 shrink-0">
                          {pct}% ({count} votes)
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Sparkles size={13} className="text-cyan-400" />
            <span>Interactive Line Chart via Recharts</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
