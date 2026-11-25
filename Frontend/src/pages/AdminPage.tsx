import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  fetchAdminAnalytics,
  fetchAdminQueues,
  moderateContent,
  reviewArtistApplication,
} from '../lib/api'
import type { AdminAnalyticsResponse, AdminReport } from '../types'

export const AdminPage: React.FC = () => {
  const { user, token } = useAuth()

  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null)
  const [openReports, setOpenReports] = useState<AdminReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null)
  const [moderatingReportId, setModeratingReportId] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    if (!token || user?.role !== 'admin') return
    setLoading(true)
    setError(null)
    try {
      const [anaData, queueData] = await Promise.all([
        fetchAdminAnalytics(token),
        fetchAdminQueues(token),
      ])
      setAnalytics(anaData)
      setOpenReports(queueData.open_reports || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load admin analytics and queues.')
    } finally {
      setLoading(false)
    }
  }, [token, user?.role])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-2">
        <div className="text-3xl">🔒</div>
        <h2 className="text-lg font-bold text-white">Team Admin Access Required</h2>
        <p className="text-xs text-neutral-400">
          This dashboard is restricted to authorized BeatToons team members.
        </p>
      </div>
    )
  }

  const handleReviewArtist = async (
    targetUserId: string,
    decision: 'approved' | 'rejected',
    stageName: string
  ) => {
    if (!token) return
    setReviewingUserId(targetUserId)
    setFeedback(null)
    setError(null)
    try {
      await reviewArtistApplication(targetUserId, decision, token)
      setAnalytics((prev) => {
        if (!prev) return prev
        const remaining = prev.pending_applications.filter((p) => p.user_id !== targetUserId)
        return {
          ...prev,
          pending_applications: remaining,
          totals: {
            ...prev.totals,
            pending_artists: Math.max(0, prev.totals.pending_artists - 1),
            verified_artists:
              decision === 'approved'
                ? prev.totals.verified_artists + 1
                : prev.totals.verified_artists,
          },
        }
      })
      setFeedback(
        decision === 'approved'
          ? `Approved "${stageName}" — account upgraded to Verified Artist.`
          : `Rejected application for "${stageName}".`
      )
    } catch (err: any) {
      setError(err?.message || `Failed to ${decision} application.`)
    } finally {
      setReviewingUserId(null)
    }
  }

  const handleModerateReport = async (
    report: AdminReport,
    action: 'remove_creation' | 'remove_song' | 'resolve_report'
  ) => {
    if (!token) return
    setModeratingReportId(report.id)
    setFeedback(null)
    setError(null)
    try {
      await moderateContent(
        {
          action,
          target_id: action === 'resolve_report' ? report.id : report.target_id,
          report_id: report.id,
        },
        token
      )
      setOpenReports((prev) => prev.filter((r) => r.id !== report.id))
      setAnalytics((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          totals: {
            ...prev.totals,
            open_reports: Math.max(0, prev.totals.open_reports - 1),
          },
        }
      })
      setFeedback(
        action === 'resolve_report'
          ? 'Report dismissed.'
          : `Removed flagged ${report.target_type} and resolved report.`
      )
    } catch (err: any) {
      setError(err?.message || 'Moderation action failed.')
    } finally {
      setModeratingReportId(null)
    }
  }

  const totals = analytics?.totals
  const pendingApps = analytics?.pending_applications || []
  const regionEntries = Object.entries(analytics?.users_by_region || {}).sort(
    (a, b) => b[1] - a[1]
  )
  const totalRegionUsers = regionEntries.reduce((sum, [, count]) => sum + count, 0) || 1

  const kpiCards = totals
    ? [
        { label: 'Total Users', value: totals.total_users, accent: 'text-white' },
        { label: 'Creators / Fans', value: totals.total_fans_creators, accent: 'text-[#8FA993]' },
        { label: 'Verified Artists', value: totals.verified_artists, accent: 'text-emerald-400' },
        { label: 'Pending Reviews', value: totals.pending_artists, accent: 'text-amber-300' },
        { label: 'Released Songs', value: totals.total_songs, accent: 'text-white' },
        { label: 'Active Challenges', value: totals.active_challenges, accent: 'text-[#FACC15]' },
        { label: 'Total Animations', value: totals.total_creations, accent: 'text-[#F43F5E]' },
        { label: 'Total Votes', value: totals.total_votes, accent: 'text-emerald-300' },
      ]
    : []

  return (
    <div className="space-y-6 pb-24 md:pb-16 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1b1a12] to-[#121212] border border-[#FACC15]/40 p-6 sm:p-7 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/20 border border-[#FACC15]/40 flex items-center justify-center text-2xl shrink-0">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                BeatToons Team Admin
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/40 text-[10px] font-bold uppercase">
                Live
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Real-time platform analytics, artist identity verification &amp; content moderation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="self-start sm:self-center py-2.5 px-5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : '↻ Refresh Data'}
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
          ✓ {feedback}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
          {error}
        </div>
      )}

      {/* 1. Platform Analytics KPI Grid */}
      {loading && !totals ? (
        <div className="py-12 text-center text-xs text-neutral-400">
          Loading real-time platform analytics...
        </div>
      ) : (
        totals && (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpiCards.map((kpi) => (
                <div
                  key={kpi.label}
                  className="p-4 rounded-2xl bg-[#121212] border border-neutral-800 space-y-1 shadow-lg"
                >
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                    {kpi.label}
                  </span>
                  <div className={`text-2xl font-black font-mono ${kpi.accent}`}>{kpi.value}</div>
                </div>
              ))}
            </section>

            {/* Users by Region Breakdown + Top Songs */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-[#121212] border border-neutral-800 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h2 className="text-base font-bold text-white">Users by Region</h2>
                  <span className="text-xs font-mono text-neutral-400">
                    {totals.total_users} total
                  </span>
                </div>

                {regionEntries.length === 0 ? (
                  <p className="text-xs text-neutral-400">No regional user data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {regionEntries.map(([region, count]) => {
                      const pct = Math.round((count / totalRegionUsers) * 100)
                      return (
                        <div key={region} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-200 font-medium">{region} 🇨🇲</span>
                            <span className="font-mono text-neutral-400">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-neutral-900 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#536D56] to-[#FACC15]"
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-[#121212] border border-neutral-800 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h2 className="text-base font-bold text-white">Top Songs by Engagement</h2>
                  <span className="text-xs font-mono text-neutral-400">Top 5</span>
                </div>

                {analytics?.top_songs.length === 0 ? (
                  <p className="text-xs text-neutral-400">No songs uploaded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {analytics?.top_songs.map((song, idx) => (
                      <div
                        key={song.id}
                        className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-neutral-800 text-xs font-black text-[#FACC15] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{song.title}</div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {song.artist_name} · {song.genre} ·{' '}
                              <span className="capitalize">{song.status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-mono shrink-0">
                          <div className="text-white font-bold">
                            {song.creations_count} anims · {song.votes_count} votes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )
      )}

      {/* 2. Artist Verification Queue */}
      <section className="rounded-3xl bg-[#121212] border border-amber-500/40 p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Artist Verification Queue
            </h2>
            <p className="text-xs text-neutral-400">
              Review full identity details, genre, bio, and music links before approving
            </p>
          </div>
          <span className="self-start sm:self-center text-xs font-mono px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            {pendingApps.length} Pending
          </span>
        </div>

        {pendingApps.length === 0 ? (
          <div className="py-8 px-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-1">
            <div className="text-2xl">✅</div>
            <p className="text-sm font-bold text-white">Verification Queue Clear</p>
            <p className="text-xs text-neutral-400">
              No pending artist applications awaiting review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApps.map((app) => {
              const socialEntries = Object.entries(app.social_links || {})
              const releaseList = app.release_links || []
              const isBusy = reviewingUserId === app.user_id

              return (
                <div
                  key={app.user_id}
                  className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#536D56]/30 border border-[#536D56]/60 overflow-hidden flex items-center justify-center text-xl font-black text-white shrink-0">
                        {app.avatar_url ? (
                          <img
                            src={app.avatar_url}
                            alt={app.artist_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          app.artist_name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-white">{app.artist_name}</h3>
                          {app.primary_genre && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30 text-[10px] font-bold">
                              {app.primary_genre}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                            Pending
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-neutral-300">
                          <div>
                            <span className="text-neutral-500">Legal Name:</span>{' '}
                            <strong className="text-white">{app.full_legal_name || '—'}</strong>
                          </div>
                          <div>
                            <span className="text-neutral-500">Email:</span>{' '}
                            <span className="text-neutral-200">{app.email || '—'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Phone:</span>{' '}
                            <span className="font-mono text-neutral-200">
                              {app.phone || app.user?.phone || app.user_id}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Country:</span>{' '}
                            <span className="text-[#8FA993] font-semibold">
                              {app.country_of_residence || 'Cameroon'}
                            </span>
                          </div>
                        </div>

                        {app.bio && (
                          <p className="text-xs text-neutral-300 bg-neutral-950/70 border border-neutral-800 rounded-xl p-2.5 mt-1">
                            {app.bio}
                          </p>
                        )}

                        {(socialEntries.length > 0 || releaseList.length > 0) && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {socialEntries.map(([platform, url]) => (
                              <a
                                key={platform}
                                href={String(url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 border border-neutral-700 transition"
                              >
                                <span className="capitalize text-[#8FA993] font-semibold">
                                  {platform}:
                                </span>
                                <span className="truncate max-w-[220px]">{String(url)}</span>
                              </a>
                            ))}
                            {releaseList.map((url, idx) => (
                              <a
                                key={`${url}-${idx}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 border border-neutral-700 transition"
                              >
                                <span className="text-[#FACC15] font-semibold">Release:</span>
                                <span className="truncate max-w-[220px]">{url}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleReviewArtist(app.user_id, 'approved', app.artist_name)
                        }
                        className="py-2.5 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? 'Saving...' : '✓ Approve Artist'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleReviewArtist(app.user_id, 'rejected', app.artist_name)
                        }
                        className="py-2.5 px-4 rounded-full bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30 text-[#F43F5E] border border-[#F43F5E]/40 font-bold text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 3. Content Moderation Queue */}
      <section className="rounded-3xl bg-[#121212] border border-neutral-800 p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Content Moderation Queue
            </h2>
            <p className="text-xs text-neutral-400">
              Remove flagged creations/songs or dismiss resolved reports
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-300 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
            {openReports.length} Open Reports
          </span>
        </div>

        {openReports.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            No open moderation reports.
          </div>
        ) : (
          <div className="space-y-3">
            {openReports.map((report) => {
              const isBusy = moderatingReportId === report.id
              const removeAction =
                report.target_type === 'song' ? 'remove_song' : 'remove_creation'
              return (
                <div
                  key={report.id}
                  className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30 text-[10px] font-bold uppercase">
                        {report.target_type}
                      </span>
                      <span className="text-xs font-mono text-neutral-400 truncate">
                        Target: {report.target_id}
                      </span>
                    </div>
                    <p className="text-xs text-white font-medium">{report.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleModerateReport(report, removeAction)}
                      className="py-1.5 px-3.5 rounded-full bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30 text-[#F43F5E] border border-[#F43F5E]/40 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      Remove {report.target_type}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleModerateReport(report, 'resolve_report')}
                      className="py-1.5 px-3.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      Resolve / Dismiss
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
