import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Challenge, Song } from '../types'
import { fetchActiveChallenges, fetchFreshSongs, fetchTrendingSongs } from '../lib/api'
import { useAudio } from '../context/AudioContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

interface TrendingScreenProps {
  onNavigateTab: (tab: string) => void
}

const GENRE_FILTERS = ['All', 'Makossa', 'Bikutsi', 'Afropop', 'Fresh Pool']

export const TrendingScreen: React.FC<TrendingScreenProps> = ({ onNavigateTab }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = useAudio()
  const { user, openLoginModal } = useAuth()
  const { t } = useLanguage()

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([])
  const [freshSongs, setFreshSongs] = useState<Song[]>([])
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState<string>('00:00:00')

  // Load active challenge and songs
  useEffect(() => {
    let mounted = true
    const loadContent = async () => {
      setLoading(true)
      try {
        const [challenges, trending, fresh] = await Promise.all([
          fetchActiveChallenges(),
          fetchTrendingSongs(),
          fetchFreshSongs(),
        ])
        if (!mounted) return
        if (challenges && challenges.length > 0) {
          setActiveChallenge(challenges[0])
        }
        setTrendingSongs(trending)
        setFreshSongs(fresh)
      } catch (err) {
        console.warn('Error loading trending screen:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadContent()
    return () => {
      mounted = false
    }
  }, [])

  // Live countdown timer for active challenge (FR-15)
  useEffect(() => {
    if (!activeChallenge?.ends_at) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const end = new Date(activeChallenge.ends_at).getTime()
      const diff = Math.max(0, end - now)

      if (diff <= 0) {
        setCountdown('00:00:00')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
      setCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [activeChallenge])

  // Filter songs by selected genre or fresh pool (FR-13)
  const displayedSongs =
    selectedGenre === 'Fresh Pool'
      ? freshSongs
      : trendingSongs.filter((song) => {
          if (selectedGenre === 'All') return true
          return song.genre.toLowerCase() === selectedGenre.toLowerCase()
        })

  return (
    <div className="space-y-6 pb-24 md:pb-16 animate-fade-in">
      {/* 1. Olive-Sage Hero Challenge Card with Coral-Pink Starburst (FR-15, NFR-1) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#536D56] to-[#3D5240] p-6 sm:p-7 text-white shadow-2xl border border-[#536D56]/60">
        {/* Geometric Starburst accents (Coral-Pink #F43F5E) */}
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-[#F43F5E]/20 rounded-full blur-2xl pointer-events-none" />
        <span className="absolute top-4 right-5 text-2xl text-[#F43F5E] animate-bounce select-none">
          ✦
        </span>
        <span className="absolute bottom-6 right-12 text-sm text-[#FACC15] select-none">
          ✦
        </span>

        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 text-xs font-semibold text-[#FACC15]">
            <span className="w-2 h-2 rounded-full bg-[#F43F5E] animate-ping" />
            <span>{t('heroBadge')}</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              {activeChallenge?.song?.title || 'Douala Makossa Pulse'}
            </h2>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-200 mt-1">
              <span>{activeChallenge?.song?.artist_name || 'Petit Pays Jr'}</span>
              <span className="text-[#FACC15]">✓</span>
              <span>·</span>
              <span className="bg-black/20 px-2 py-0.5 rounded-full font-mono text-xs">
                {activeChallenge?.song?.bpm || 115} BPM
              </span>
              <span>·</span>
              <span className="capitalize">{activeChallenge?.song?.genre || 'Makossa'}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-neutral-200/90 leading-relaxed max-w-md">
            Create your character dance cover, join {activeChallenge?.creations_count || 3} creators from Douala, Yaoundé, and Buea, and win the community vote!
          </p>

          {/* Live Countdown & Pill Button */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <span className="text-[11px] uppercase tracking-wider text-neutral-300 font-semibold">
                {t('endsIn')}:
              </span>
              <span className="font-mono text-base font-black text-[#FACC15] tracking-wider">
                {countdown}
              </span>
            </div>

            {/* Crisp white pill button */}
            <button
              onClick={() => {
                if (activeChallenge?.song?.id) {
                  localStorage.setItem('beattoons_studio_song_id', activeChallenge.song.id)
                }
                onNavigateTab('studio')
              }}
              className="py-2.5 px-6 rounded-full font-bold text-sm bg-white hover:bg-neutral-100 text-neutral-900 transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer group"
            >
              <span>{t('animateNow')}</span>
              <span className="text-[#F43F5E] group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>

            {/* Play Challenge Clip Button */}
            {activeChallenge?.song && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  if (currentSong?.id === activeChallenge.song!.id) {
                    togglePlay()
                  } else {
                    playSong(activeChallenge.song!)
                  }
                }}
                className="py-2.5 px-4 rounded-full font-semibold text-xs bg-black/30 hover:bg-black/50 text-white border border-white/20 transition flex items-center gap-2 cursor-pointer"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={currentSong?.id === activeChallenge.song.id && isPlaying ? 'pause' : 'play'}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2"
                  >
                    {currentSong?.id === activeChallenge.song.id && isPlaying ? (
                      <>
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                        <span>{t('pauseClip')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>{t('playClip')}</span>
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Genre Filter Pills (FR-13) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {GENRE_FILTERS.map((genre) => {
          const isSelected = selectedGenre === genre
          return (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-white text-neutral-900 shadow-md'
                  : 'bg-[#121212] text-neutral-300 hover:text-white border border-neutral-800 hover:border-[#536D56]'
              }`}
            >
              {genre === 'Fresh Pool' ? (
                <span className="flex items-center gap-1.5">
                  <span>{genre}</span>
                  <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                </span>
              ) : (
                genre
              )}
            </button>
          )
        })}
      </div>

      {/* 3. Verified Cameroonian Artist Chart (GET /songs/trending, FR-9, FR-14) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">
              {selectedGenre === 'Fresh Pool' ? 'Fresh Pool Discoveries' : t('chartTitle')}
            </h3>
            <p className="text-xs text-neutral-400">
              {selectedGenre === 'Fresh Pool'
                ? 'New submissions auditioning before reaching Trending'
                : t('chartSubtitle')}
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
            {displayedSongs.length} tracks
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <span className="inline-block w-6 h-6 border-2 border-[#536D56] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-neutral-400">Loading Cameroon charts...</p>
          </div>
        ) : displayedSongs.length === 0 ? (
          <div className="p-8 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-2">
            <div className="text-3xl">🎵</div>
            <p className="text-sm font-semibold text-white">No tracks found for this category</p>
            <p className="text-xs text-neutral-400">Check another genre or the Fresh pool.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedSongs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id
              const isTopRank = index < 3 && selectedGenre !== 'Fresh Pool'
              return (
                <div
                  key={song.id}
                  className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-150 ${
                    isCurrent
                      ? 'bg-[#536D56]/25 border-[#536D56] shadow-lg'
                      : 'bg-[#121212] hover:bg-neutral-900/90 border-neutral-800/80 hover:border-[#536D56]/50'
                  }`}
                >
                  {/* Left: Rank + Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        isTopRank && index === 0
                          ? 'bg-[#FACC15] text-neutral-900 shadow-md shadow-[#FACC15]/30'
                          : isTopRank && index === 1
                          ? 'bg-neutral-200 text-neutral-900'
                          : isTopRank && index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {index + 1}
                    </span>

                    {/* Disc thumbnail */}
                    <div
                      onClick={() => (isCurrent ? togglePlay() : playSong(song))}
                      className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-[#536D56] to-neutral-800 flex items-center justify-center border border-[#536D56]/40 cursor-pointer shrink-0 group-hover:scale-105 transition"
                    >
                      <span className="text-lg">🇨🇲</span>
                      <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sm font-bold text-white truncate group-hover:text-[#FACC15] transition">
                          {song.title}
                        </span>
                        {song.status === 'fresh' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FACC15]/20 text-[#FACC15] font-semibold shrink-0">
                            FRESH
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate mt-0.5">
                        <span className="text-neutral-200 font-medium">
                          {song.artist_name || 'Verified Artist'}
                        </span>
                        <span className="text-[#FACC15] shrink-0" title={t('verifiedBadge')}>
                          ✓
                        </span>
                        <span className="text-neutral-500">·</span>
                        <span className="capitalize">{song.genre}</span>
                        <span className="text-neutral-500">·</span>
                        <span className="font-mono text-neutral-400">{song.duration_sec}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stats, Animate & Play Button */}
                  <div className="flex items-center gap-2.5 shrink-0 ml-2">
                    <div className="text-right hidden sm:block mr-1">
                      <div className="text-xs font-mono font-bold text-[#FACC15]">
                        {song.trending_score}
                      </div>
                      <div className="text-[10px] text-neutral-500 uppercase">{t('score')}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('beattoons_studio_song_id', song.id)
                        onNavigateTab('studio')
                      }}
                      className="hidden xs:inline-flex sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#536D56]/25 hover:bg-[#536D56]/45 text-[#8FA993] hover:text-white border border-[#536D56]/50 text-[11px] font-bold transition cursor-pointer"
                      title="Use this song in Studio"
                    >
                      <span>🎬</span>
                      <span>Animate</span>
                    </button>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => (isCurrent ? togglePlay() : playSong(song))}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-md cursor-pointer ${
                        isCurrent && isPlaying
                          ? 'bg-[#F43F5E] text-white'
                          : 'bg-white hover:bg-neutral-100 text-neutral-900'
                      }`}
                      aria-label="Play song"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isCurrent && isPlaying ? 'pause' : 'play'}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center justify-center"
                        >
                          {isCurrent && isPlaying ? (
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cameroonian Artist CTA Banner (for guests / non-artists) */}
      {(!user || user.role === 'fan_creator') && (
        <div className="rounded-3xl bg-gradient-to-r from-[#1a2e20] via-[#121212] to-[#26141a] border border-[#536D56]/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F43F5E]/20 border border-[#F43F5E]/40 flex items-center justify-center text-xl shrink-0">
              🎤
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-white">
                Are you a Cameroonian Artist or Musician?
              </h4>
              <p className="text-xs text-neutral-400">
                Get verified, upload 15–30s song clips to the Fresh Pool, and launch challenges for fans.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                openLoginModal({
                  mode: 'signup',
                  accountType: 'artist',
                  reason: 'Create your Artist / Musician account and submit your verification details',
                })
              } else {
                onNavigateTab('account')
              }
            }}
            className="self-start sm:self-center shrink-0 py-2.5 px-5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs transition shadow-md active:scale-95 cursor-pointer"
          >
            {user ? 'Apply for Artist Badge →' : 'Create Artist Account'}
          </button>
        </div>
      )}
    </div>
  )
}
