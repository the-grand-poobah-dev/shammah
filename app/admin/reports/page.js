'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  EyeOff,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { listContentReports, moderateContentAction } from '../../lib/data/reportApi';

export default function AdminReportsQueuePage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actioningId, setActioningId] = useState(null);

  // 1. Resolve user and profile role
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { data: { session: sess } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(sess);

        if (sess?.user?.id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, name, display_name, role, badge, badges')
            .eq('id', sess.user.id)
            .maybeSingle();

          if (mounted) setProfile(prof);
        }
      } catch {
        // Fallback
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    }

    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const isStaff =
    profile?.role === 'admin' ||
    profile?.role === 'moderator' ||
    profile?.role === 'platform_admin' ||
    profile?.role === 'pastor' ||
    (Array.isArray(profile?.badges) && profile.badges.includes('staff'));

  // 2. Fetch reports based on filters
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listContentReports({
        status: statusFilter === 'all' ? undefined : statusFilter,
        targetType: typeFilter === 'all' ? undefined : typeFilter,
        limit: 50,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setReports(res.data || []);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (isStaff) {
      fetchReports();
    }
  }, [isStaff, fetchReports]);

  // 3. Handle moderator actions
  const handleAction = async (report, action) => {
    setActioningId(report.id);
    const prevReports = [...reports];

    // Optimistic update
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? {
              ...r,
              status: action === 'dismiss' ? 'dismissed' : 'actioned',
            }
          : r
      )
    );

    try {
      const res = await moderateContentAction({
        reportId: report.id,
        action,
        targetType: report.target_type,
        targetId: report.target_id_text || report.target_id,
      });

      if (!res.success) {
        // Rollback
        setReports(prevReports);
        alert(res.error || 'Failed to apply moderation action.');
      }
    } catch (err) {
      setReports(prevReports);
      alert(err?.message || 'Action failed');
    } finally {
      setActioningId(null);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          <RefreshCw size={16} className="animate-spin text-[var(--teal)]" />
          <span>Verifying ministry credentials...</span>
        </div>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center flex flex-col items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-base font-bold">Pastoral Access Restricted</h2>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
            The Community Moderation Queue is reserved for designated church shepherds, elders, and platform moderators.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--teal)] text-black hover:opacity-90 transition-opacity"
          >
            <ArrowLeft size={14} />
            <span>Return to Shammah Feed</span>
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] pb-16">
      {/* Top sticky admin bar */}
      <header className="sticky top-0 z-30 bg-[var(--surface)]/95 backdrop-blur border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-sunken)] transition-colors"
              title="Return to Feed"
              aria-label="Back to feed"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-400" />
                <h1 className="text-sm font-bold tracking-tight">Community Moderation Queue</h1>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--ink-muted)]">
                Review flagged posts, videos, reels, courses, polls and fundraisers across the faith fellowship.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface-sunken)] transition-colors disabled:opacity-50"
            aria-label="Refresh reports list"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 flex flex-col gap-4">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[var(--ink-muted)] flex items-center gap-1 mr-1">
              <Filter size={12} /> Status:
            </span>
            {['pending', 'actioned', 'dismissed', 'all'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-[var(--teal)] text-black font-semibold'
                    : 'text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[var(--ink-muted)] mr-1">Type:</span>
            {['all', 'video', 'reel', 'course', 'fundraiser', 'poll', 'post'].map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setTypeFilter(tp)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition-colors ${
                  typeFilter === tp
                    ? 'border border-[var(--teal)] text-[var(--teal)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
        </div>

        {/* Reports list */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse flex flex-col gap-2"
              >
                <div className="h-4 w-1/3 bg-[var(--border)] rounded" />
                <div className="h-3 w-3/4 bg-[var(--border)] rounded" />
                <div className="h-3 w-1/2 bg-[var(--border)] rounded" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle size={20} />
            </div>
            <h3 className="text-sm font-bold">Queue is Clean</h3>
            <p className="text-xs text-[var(--ink-muted)] max-w-sm">
              No {statusFilter !== 'all' ? statusFilter : ''} reports found for this filter. Peace and unity prevail in the fellowship!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => {
              const targetKey = report.target_id_text || report.target_id;
              const isActioning = actioningId === report.id;

              return (
                <div
                  key={report.id}
                  className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col gap-3 hover:border-[var(--sec-color,var(--teal))] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/25">
                        {report.target_type}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400 border border-red-500/25">
                        Reason: {report.reason}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          report.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                            : report.status === 'actioned'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
                            : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/25'
                        }`}
                      >
                        Status: {report.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[var(--ink-muted)] shrink-0">
                      <Clock size={12} />
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {report.details && (
                    <div className="p-2.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] text-xs text-[var(--ink)]">
                      <span className="font-semibold text-[var(--ink-muted)]">Reporter note: </span>
                      <span className="italic">&quot;{report.details}&quot;</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border)] text-xs">
                    <span className="text-[11px] text-[var(--ink-faint)] font-mono truncate max-w-xs">
                      Target ID: {targetKey}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleAction(report, 'hide')}
                        disabled={isActioning}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-600/15 text-rose-400 hover:bg-rose-600/25 border border-rose-600/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Hide content from public church feed"
                      >
                        <EyeOff size={12} />
                        <span>Hide</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(report, 'restore')}
                        disabled={isActioning}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-600/30 flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Restore item to published status"
                      >
                        <Eye size={12} />
                        <span>Restore</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAction(report, 'dismiss')}
                        disabled={isActioning}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] border border-[var(--border)] flex items-center gap-1 transition-colors disabled:opacity-50"
                        title="Dismiss report as not violating guidelines"
                      >
                        <XCircle size={12} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
