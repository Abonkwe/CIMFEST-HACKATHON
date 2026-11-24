import React, { useState, useEffect } from 'react'
import type { Challenge, Creation } from '../types'
import {
  castVote,
  fetchActiveChallenges,
  fetchChallengeById,
  fetchFeed,
  recordCreationView,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { useLanguage } from '../context/LanguageContext'
import { ReportModal } from '../components/ReportModal'
import { MixamoStoryStage } from '../components/MixamoStoryStage'
import type { BackgroundTheme } from '../components/StagePlayer'

export const FeedScreen: React.FC = () => {
  const { user, token, openLoginModal } = useAuth()
  const { playSong, pauseSong, isPlaying, currentTime, audioElement } = useAudio()
  const { t } = useLanguage()

  const [feedItems, setFeedItems] = useState<Creation[]>([])
  const [activeCreationId, setActiveCreationId] = useState<string | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [mobileLeaderboardTab, setMobileLeaderboardTab] = useState<'top' | 'rising'>('top')
  const [mobileRankings, setMobileRankings] = useState<Creation[]>([])
  const [loading, setLoading] = useState(true)

  // Report modal state
  const [reportingTarget, setReportingTarget] = useState<{ id: string; title: string } | null>(null)

  // Track voted creation IDs locally to provide instant feedback
  const [votedIds, setVotedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('beattoons_voted_ids')
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [voteErrors, setVoteErrors] = useState<Record<string, string>>({})
  const [votingId, setVotingId] = useState<string | null>(null)

  // Load feed and active challenge
  useEffect(() => {
    let mounted = true
    const loadFeed = async () => {
      setLoading(true)
      try {
        const [creations, challenges] = await Promise.all([
          fetchFeed(),
          fetchActiveChallenges(),
        ])
        if (!mounted) return
        setFeedItems(creations)
        if (challenges && challenges.length > 0) {
          setActiveChallenge(challenges[0])
        }
      } catch (err) {
        console.warn('Failed loading feed:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadFeed()
    return () => {
      mounted = false
    }
  }, [])

  // Load mobile leaderboard when active challenge changes
  useEffect(() => {
    let mounted = true
    if (!activeChallenge) return

    const loadRankings = async () => {
      try {
        const ch = await fetchChallengeById(activeChallenge.id, mobileLeaderboardTab)
        if (mounted && ch?.creations) {
          setMobileRankings(ch.creations)
        }
      } catch (err) {
        console.warn('Failed loading rankings for mobile feed:', err)
      }
    }
    loadRankings()
    return () => {
      mounted = false
    }
  }, [activeChallenge, mobileLeaderboardTab])

  // Handle Voting (FR-26, FR-27, NFR-9)
  const handleVote = async (creation: Creation) => {
    if (!token || !user) {
      openLoginModal()
      return
    }

    if (votedIds.has(creation.id)) {
      setVoteErrors((prev) => ({
        ...prev,
        [creation.id]: 'You have already voted for this creation!',
      }))
      return
    }

    setVotingId(creation.id)
    setVoteErrors((prev) => {
      const copy = { ...prev }
      delete copy[creation.id]
      return copy
    })

    try {
      const res = await castVote(creation.id, token)

      // Update feed item vote count optimistically
      setFeedItems((prev) =>
        prev.map((item) =>
          item.id === creation.id ? { ...item, vote_count: res.vote_count } : item
        )
      )

      // Update voted set
      const nextVoted = new Set(votedIds).add(creation.id)
      setVotedIds(nextVoted)
      localStorage.setItem('beattoons_voted_ids', JSON.stringify(Array.from(nextVoted)))
    } catch (err: any) {
      setVoteErrors((prev) => ({
        ...prev,
        [creation.id]: err?.message || 'Vote failed. Only 1 vote per account allowed.',
      }))
    } finally {
      setVotingId(null)
    }
  }

  // Handle Play Stage Preview & increment views (POST /creations/{id}/view, FR-29)
  const handlePlayPreview = async (creation: Creation) => {
    if (activeCreationId === creation.id && isPlaying) {
      pauseSong()
      return
    }

    setActiveCreationId(creation.id)
    const clipUrl = creation.song?.clip_url || '/assets/audio/we-di-go-na-go.mp3'
    const clipStart = creation.moves_timeline?.[0]?.start ?? 0
    playSong(
      {
        id: creation.song?.id || creation.id,
        artist_id: creation.creator_id,
        title: creation.song?.title || 'We Di Go Na Go',
        genre: creation.song?.genre || 'Afropop',
        language: 'Cameroon',
        clip_url: clipUrl,
        duration_sec: (creation.song as any)?.duration_sec || 156,
        bpm: creation.song?.bpm || 118,
        status: 'trending',
        trending_score: 95,
      },
      clipStart
    )

    try {
      const res = await recordCreationView(creation.id)
      setFeedItems((prev) =>
        prev.map((item) =>
          item.id === creation.id ? { ...item, views: res.views } : item
        )
      )
    } catch (err) {
      console.warn('View record failed:', err)
    }
  }

  // WhatsApp Share helper (FR-25)
  const handleShareWhatsApp = (creation: Creation) => {
    const creatorName = creation.creator?.display_name || creation.creator_display_name || 'Creator'
    const songTitle = creation.song?.title || 'BeatToons Challenge'
    const text = encodeURIComponent(
      `🇨🇲 Check out ${creatorName}'s crazy animated dance moves to "${songTitle}" on BeatToons Cameroon! Vote for them here: https://beattoons.app/feed?c=${creation.id}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-6 pb-24 md:pb-16 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] uppercase tracking-wider">
            <span>🇨🇲 Community Feed</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{t('feedTitle')}</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{t('feedSubtitle')}</p>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
          FR-26 · FR-33
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <span className="inline-block w-6 h-6 border-2 border-[#536D56] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-neutral-400">Loading animated creations...</p>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-2">
          <div className="text-3xl">🎭</div>
          <h3 className="text-base font-bold text-white">No creations yet in the feed</h3>
          <p className="text-xs text-neutral-400">Be the first to animate a character in Studio!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {feedItems.map((item) => {
            const hasVoted = votedIds.has(item.id)
            const isVotingThis = votingId === item.id
            const creatorName = item.creator?.display_name || item.creator_display_name || 'Kumba Dancer'
            const creatorRegion = item.creator?.region || item.creator_region || 'Southwest'
            const characterName = item.character_id || item.character || 'KmerBoy'
            const errorMsg = voteErrors[item.id]

            return (
              <div
                key={item.id}
                className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-5 sm:p-6 shadow-2xl space-y-4 hover:border-[#536D56] transition-all"
              >
                {/* Creator Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#536D56] to-neutral-800 border border-[#536D56] flex items-center justify-center text-sm font-bold text-white shrink-0 shadow">
                      {creatorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{creatorName}</span>
                        {/* Region Pill */}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-[#8FA993] font-semibold shrink-0">
                          {creatorRegion} 🇨🇲
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        Animated with <span className="text-white font-medium">{characterName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Report Button (FR-35) */}
                  <button
                    onClick={() =>
                      setReportingTarget({
                        id: item.id,
                        title: `${creatorName}'s Creation`,
                      })
                    }
                    className="p-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-[#F43F5E] transition cursor-pointer"
                    title={t('reportContent')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </button>
                </div>

                {/* Caption in English / French / Pidgin (FR-23) */}
                {item.caption && (
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800/60">
                    "{item.caption}"
                  </p>
                )}

                {/* Reusable Animated StagePlayer in Playback Mode (FR-24) */}
                {(() => {
                  const isThisItemPlaying = activeCreationId === item.id && isPlaying
                  const creationBpm = item.song?.bpm || 115
                  const themes: BackgroundTheme[] = ['sage_starburst', 'amber_sunset', 'slate_night', 'lavender_haze']
                  const bgTheme = themes[feedItems.indexOf(item) % themes.length]

                  return (
                    <div className="relative w-full rounded-2xl overflow-hidden border border-[#536D56]/50 shadow-inner">
                      <MixamoStoryStage
                        characterId={item.character_id || item.character || 'tantie'}
                        characterAId={item.moves_timeline?.[0]?.charA_id || item.character_id || item.character || 'tantie'}
                        characterBId={item.moves_timeline?.[0]?.charB_id}
                        backgroundTheme={item.moves_timeline?.[0]?.bg || bgTheme}
                        movesTimeline={item.moves_timeline || []}
                        bpm={creationBpm}
                        currentTime={isThisItemPlaying ? currentTime : 0}
                        isPlaying={isThisItemPlaying}
                        caption={item.caption}
                        mode="playback"
                        audioElement={isThisItemPlaying ? audioElement : null}
                        onTogglePlay={() => handlePlayPreview(item)}
                        aspectRatio="aspect-[16/10] sm:aspect-[16/9]"
                      />

                      {/* Track label badge on preview */}
                      <div className="absolute bottom-2.5 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] text-white border border-white/10 pointer-events-none">
                        <span>🎵</span>
                        <span className="font-semibold truncate max-w-[180px]">
                          {item.song?.title || 'Douala Makossa'}
                        </span>
                        <span className="text-[#FACC15] font-mono text-[10px]">({creationBpm} BPM)</span>
                      </div>

                      {/* Moves timeline pills */}
                      <div className="absolute bottom-2.5 right-3 z-30 hidden sm:flex items-center gap-1 pointer-events-none">
                        {item.moves_timeline?.map((m, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-[#8FA993] border border-[#536D56]/30 uppercase"
                          >
                            {m.action}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Error Banner if vote failed */}
                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Engagement Metrics & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  {/* View counter & Vote count */}
                  <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <strong className="text-white font-bold">{item.views || 0}</strong> {t('views')}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <span className="text-[#FACC15]">⚡</span>
                      <strong className="text-[#FACC15] font-bold">{item.vote_count || 0}</strong> {t('votes')}
                    </span>
                  </div>

                  {/* Actions: WhatsApp Share + Vote Button */}
                  <div className="flex items-center gap-2.5">
                    {/* WhatsApp Share Link (FR-25) */}
                    <button
                      onClick={() => handleShareWhatsApp(item)}
                      className="px-3.5 py-2 rounded-full bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title={t('shareWhatsapp')}
                    >
                      <span>💬</span>
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    {/* Vote Button (POST /votes, FR-26, FR-27) */}
                    <button
                      onClick={() => handleVote(item)}
                      disabled={hasVoted || isVotingThis}
                      className={`px-5 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                        hasVoted
                          ? 'bg-[#536D56] text-white cursor-default'
                          : 'bg-white hover:bg-neutral-100 text-neutral-900'
                      }`}
                    >
                      {isVotingThis ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                          <span>Voting...</span>
                        </>
                      ) : hasVoted ? (
                        <>
                          <span>✓</span>
                          <span>{t('voted')}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[#F43F5E]">✦</span>
                          <span>{t('vote')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Mobile Top Creators • Live Ranking (Directly below feed cards on mobile per FR-29, FR-30) */}
          <div className="lg:hidden mt-8 rounded-3xl bg-[#121212] border border-[#536D56]/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#FACC15] uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live Ranking</span>
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  {t('leaderboardTitle')}
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">FR-29 · FR-30</span>
            </div>

            {/* Tabs for mobile leaderboard */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
              <button
                onClick={() => setMobileLeaderboardTab('top')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mobileLeaderboardTab === 'top'
                    ? 'bg-[#536D56] text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t('tabTop')}
              </button>
              <button
                onClick={() => setMobileLeaderboardTab('rising')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                  mobileLeaderboardTab === 'rising'
                    ? 'bg-[#536D56] text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>{t('tabRising')}</span>
                <span className="text-[10px] text-[#FACC15]">⚡</span>
              </button>
            </div>

            {/* Mobile rankings list */}
            <div className="space-y-2">
              {mobileRankings.map((c, index) => {
                const isGold = index === 0
                const isSilver = index === 1
                const isBronze = index === 2
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition ${
                      isGold
                        ? 'bg-neutral-900 border-[#FACC15]/40'
                        : 'bg-neutral-900/60 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isGold
                            ? 'bg-[#FACC15] text-neutral-900'
                            : isSilver
                            ? 'bg-neutral-200 text-neutral-900'
                            : isBronze
                            ? 'bg-amber-700 text-white'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {c.creator_display_name || 'Creator'}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {c.creator_region || 'Cameroon'} 🇨🇲
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-[#FACC15]">
                        {c.vote_count || 0} votes
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {Math.round((c.engagement_rate || 0) * 100)}% eng
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportingTarget && (
        <ReportModal
          isOpen={!!reportingTarget}
          onClose={() => setReportingTarget(null)}
          targetType="creation"
          targetId={reportingTarget.id}
          targetTitle={reportingTarget.title}
        />
      )}
    </div>
  )
}
