import React, { useState, useEffect } from 'react'
import type { Challenge, Creation, Song } from '../types'
import { fetchActiveChallenges, fetchChallengeById, fetchTrendingSongs } from '../lib/api'
import { useAudio } from '../context/AudioContext'
import { useLanguage } from '../context/LanguageContext'

interface RightSidebarProps {
  currentTab: string
  onSelectSong?: (song: Song) => void
  onNavigateTab?: (tab: string) => void
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ currentTab, onNavigateTab }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = useAudio()
  const { t } = useLanguage()

  const [trendingSongs, setTrendingSongs] = useState<Song[]>([])
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [leaderboardTab, setLeaderboardTab] = useState<'top' | 'rising'>('top')
  const [rankings, setRankings] = useState<Creation[]>([])
  const [loading, setLoading] = useState(false)

  // Load trending songs & active challenge
  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        const [songs, challenges] = await Promise.all([
          fetchTrendingSongs(),
          fetchActiveChallenges(),
        ])
        if (!mounted) return
        setTrendingSongs(songs)
        if (challenges && challenges.length > 0) {
          setActiveChallenge(challenges[0])
        }
      } catch (err) {
        console.warn('Right sidebar load error:', err)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  // Load leaderboard when active challenge or tab changes
  useEffect(() => {
    let mounted = true
    if (!activeChallenge) return

    const loadLeaderboard = async () => {
      setLoading(true)
      try {
        const ch = await fetchChallengeById(activeChallenge.id, leaderboardTab)
        if (mounted && ch?.creations) {
          setRankings(ch.creations)
        }
      } catch (err) {
        console.warn('Failed to load ranking:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadLeaderboard()
    return () => {
      mounted = false
    }
  }, [activeChallenge, leaderboardTab])

  // If on Trending tab, show Cameroon Trending Chart tracklist
  const isTrendingView = currentTab === 'trending'

  return (
    <aside className="hidden lg:flex flex-col w-72 xl:w-80 h-full bg-[#121212] border border-[#536D56]/40 rounded-3xl p-4 xl:p-5 shadow-2xl shrink-0 overflow-y-auto">
      {isTrendingView ? (
        // Trending View: Cameroon Trending Chart Tracklist
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FACC15] uppercase tracking-wider">
                <span>🇨🇲 Cameroon Charts</span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight">Top Trending Tracks</h3>
            </div>
          </div>

          <div className="space-y-2">
            {trendingSongs.slice(0, 6).map((song, index) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <div
                  key={song.id}
                  onClick={() => {
                    if (isCurrent) togglePlay()
                    else playSong(song)
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#536D56]/30 border-[#536D56]'
                      : 'bg-neutral-900/80 hover:bg-neutral-800/80 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank pill */}
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        index === 0
                          ? 'bg-[#FACC15] text-neutral-900 shadow-md shadow-[#FACC15]/20'
                          : index === 1
                          ? 'bg-neutral-200 text-neutral-900'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate group-hover:text-[#FACC15] transition">
                        {song.title}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-neutral-400 truncate">
                        <span>{song.artist_name || 'Verified Artist'}</span>
                        <span className="text-[#FACC15]" title={t('verifiedBadge')}>
                          ✓
                        </span>
                        <span>·</span>
                        <span>{song.genre}</span>
                      </div>
                    </div>
                  </div>

                  {/* Play icon / Trending Score */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-mono font-bold text-[#FACC15]">
                        {song.trending_score}
                      </div>
                      <div className="text-[9px] text-neutral-500 uppercase">score</div>
                    </div>

                    <button
                      type="button"
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        isCurrent && isPlaying
                          ? 'bg-[#F43F5E] text-white'
                          : 'bg-neutral-800 group-hover:bg-white group-hover:text-neutral-900 text-neutral-300'
                      }`}
                      aria-label="Play song"
                    >
                      {isCurrent && isPlaying ? (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick CTA to join challenge */}
          {activeChallenge && (
            <div className="mt-4 p-4 rounded-2xl bg-[#536D56]/20 border border-[#536D56]/40 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#F43F5E]">
                <span>✦ Active Contest</span>
              </div>
              <h4 className="text-xs font-bold text-white">
                {activeChallenge.song?.title || 'Douala Makossa Pulse'}
              </h4>
              <p className="text-[10px] text-neutral-400">
                Create an animation with KmerBoy or MboaGirl to enter and win.
              </p>
              <button
                onClick={() => onNavigateTab && onNavigateTab('studio')}
                className="w-full mt-1 py-2 px-3 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs transition shadow cursor-pointer text-center block"
              >
                {t('animateNow')} →
              </button>
            </div>
          )}
        </div>
      ) : (
        // Feed & Challenges View: Top Creators • Live Ranking
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#FACC15] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Leaderboard</span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight">{t('leaderboardTitle')}</h3>
            </div>
          </div>

          {/* Leaderboard Tabs: Top Creators vs Rising Stars (FR-30) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
            <button
              onClick={() => setLeaderboardTab('top')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                leaderboardTab === 'top'
                  ? 'bg-[#536D56] text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('tabTop')}
            </button>
            <button
              onClick={() => setLeaderboardTab('rising')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                leaderboardTab === 'rising'
                  ? 'bg-[#536D56] text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>{t('tabRising')}</span>
              <span className="text-[10px] text-[#FACC15]">⚡</span>
            </button>
          </div>

          {/* Ranking List */}
          <div className="space-y-2">
            {loading ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <span className="inline-block w-4 h-4 border-2 border-[#536D56] border-t-transparent rounded-full animate-spin mb-2" />
                <div>Updating ranking...</div>
              </div>
            ) : rankings.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No rankings for this challenge yet. Be the first to vote!
              </div>
            ) : (
              rankings.map((c, index) => {
                const isGold = index === 0
                const isSilver = index === 1
                const isBronze = index === 2
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition ${
                      isGold
                        ? 'bg-neutral-900/90 border-[#FACC15]/40 shadow-sm'
                        : 'bg-neutral-900/70 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank badge */}
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isGold
                            ? 'bg-[#FACC15] text-neutral-900 shadow-md shadow-[#FACC15]/30'
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
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white truncate">
                            {c.creator_display_name || 'Creator'}
                          </span>
                          {isGold && <span className="text-xs">👑</span>}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {c.creator_region || 'Cameroon'} 🇨🇲 · {c.character_id || c.character || 'KmerBoy'}
                        </div>
                      </div>
                    </div>

                    {/* Stats: Engagement & Votes */}
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
              })
            )}
          </div>

          {/* Fair Virality Explanation */}
          <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-[10px] text-neutral-400 space-y-1">
            <span className="font-bold text-neutral-300 block">💡 Fair Virality</span>
            <p>
              Rankings prioritize engagement rate (<code className="text-[#8FA993]">votes / views</code>) so new creators are not buried by raw view counts.
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
