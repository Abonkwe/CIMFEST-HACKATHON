import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Challenge } from '../types'
import { fetchActiveChallenges } from '../lib/api'
import { useAudio } from '../context/AudioContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

interface ChallengesScreenProps {
  onNavigateTab: (tab: string, params?: { challenge_id?: string | null; song_id?: string | null }) => void
}

export const ChallengesScreen: React.FC<ChallengesScreenProps> = ({ onNavigateTab }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = useAudio()
  const { user, openLoginModal } = useAuth()
  const { t } = useLanguage()

  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let mounted = true
    const loadChallenges = async () => {
      setLoading(true)
      try {
        const data = await fetchActiveChallenges()
        if (mounted) setChallenges(data)
      } catch (err) {
        console.warn('Failed loading challenges:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadChallenges()

    const ticker = setInterval(() => setNow(Date.now()), 1000)

    return () => {
      mounted = false
      clearInterval(ticker)
    }
  }, [])

  const formatCountdown = (endsAtStr?: string) => {
    if (!endsAtStr) return '00:00:00'
    const end = new Date(endsAtStr).getTime()
    const diff = Math.max(0, end - now)
    if (diff <= 0) return 'Ended'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return (
    <div className="space-y-6 pb-24 md:pb-16 animate-fade-in">
      {/* Header banner */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] uppercase tracking-wider">
            <span>⚡ Active Contests</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">{t('challengesTitle')}</h2>
          <p className="text-xs text-neutral-400 mt-0.5">{t('challengesSubtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-3xl bg-[#121212] border border-neutral-800 p-5 sm:p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-6 w-32 rounded-full bg-neutral-800" />
                <div className="h-6 w-24 rounded-full bg-neutral-800" />
              </div>
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-800 shrink-0" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-neutral-800" />
                    <div className="h-3 w-28 rounded bg-neutral-800" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-14 rounded-2xl bg-neutral-800" />
                  <div className="h-9 w-28 rounded-full bg-neutral-800" />
                </div>
              </div>
              <div className="pt-3 border-t border-neutral-900 flex items-center justify-between">
                <div className="h-3 w-48 rounded bg-neutral-800" />
                <div className="h-3 w-28 rounded bg-neutral-800" />
              </div>
            </div>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-2">
          <div className="text-3xl">🏆</div>
          <h3 className="text-base font-bold text-white">No active challenges right now</h3>
          <p className="text-xs text-neutral-400">Check back soon for new Cameroonian music contests!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {challenges.map((ch) => {
            const song = ch.song
            const isCurrent = currentSong?.id === song?.id
            const countdown = formatCountdown(ch.ends_at)

            return (
              <div
                key={ch.id}
                className="relative overflow-hidden rounded-3xl bg-[#121212] border border-[#536D56]/40 p-5 sm:p-6 hover:border-[#536D56] transition-all shadow-xl space-y-4"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#536D56]/20 border border-[#536D56]/40 text-xs font-semibold text-[#FACC15]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active Challenge</span>
                  </div>

                  {/* Countdown pill */}
                  <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 text-xs font-mono">
                    <span className="text-neutral-400 text-[10px] uppercase">Ends:</span>
                    <span className="text-[#FACC15] font-bold">{countdown}</span>
                  </div>
                </div>

                {/* Song info and entry count */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <motion.div
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        if (song) {
                          if (isCurrent) togglePlay()
                          else playSong(song)
                        }
                      }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#536D56] to-neutral-800 flex items-center justify-center border border-[#536D56]/60 cursor-pointer shrink-0 shadow group"
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
                            <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-white fill-current translate-x-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </motion.div>

                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">
                        {song?.title || 'Cameroon Pulse'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5 truncate">
                        <span className="text-neutral-200 font-medium">
                          {song?.artist_name || 'Verified Artist'}
                        </span>
                        <span className="text-[#FACC15]">✓</span>
                        <span>·</span>
                        <span className="capitalize">{song?.genre || 'Afropop'}</span>
                        <span>·</span>
                        <span className="font-mono">{song?.bpm || 110} BPM</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission stats */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="px-3.5 py-1.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                      <div className="text-sm font-black font-mono text-white">
                        {ch.entries_count ?? ch.creations_count ?? 0}
                      </div>
                      <div className="text-[10px] text-neutral-400">{t('entries')}</div>
                    </div>

                    {/* Crisp white pill action button */}
                    <button
                      onClick={() => {
                        if (song?.id) {
                          localStorage.setItem('camvibe_studio_song_id', song.id)
                        }
                        onNavigateTab('studio', {
                          challenge_id: ch.id,
                          song_id: song?.id ?? null,
                        })
                      }}
                      className="py-2.5 px-5 rounded-full font-bold text-xs bg-white hover:bg-neutral-100 text-neutral-900 transition shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{t('joinChallenge')}</span>
                      <span className="text-[#F43F5E]">✦</span>
                    </button>
                  </div>
                </div>

                {/* Footer preview note */}
                <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Characters available: KmerBoy, MboaGirl, ToonDancer</span>
                  <button
                    onClick={() => onNavigateTab('feed', { challenge_id: ch.id })}
                    className="text-[#8FA993] hover:text-white transition cursor-pointer font-semibold"
                  >
                    View Entries on Feed →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Artist CTA Banner */}
      {!user && (
        <div className="rounded-3xl bg-gradient-to-r from-[#1a2e20] via-[#121212] to-[#26141a] border border-[#536D56]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F43F5E]/20 border border-[#F43F5E]/40 flex items-center justify-center text-lg shrink-0">
              🎤
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Want your song featured in a Challenge?</h4>
              <p className="text-xs text-neutral-400">
                Create a Cameroonian Artist account to upload clips and reach creators.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              openLoginModal({
                mode: 'signup',
                accountType: 'artist',
                reason: 'Create your Artist / Musician account to upload songs and launch challenges',
              })
            }
            className="self-start sm:self-center shrink-0 py-2.5 px-5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs transition shadow-md active:scale-95 cursor-pointer"
          >
            Create Artist Account
          </button>
        </div>
      )}
    </div>
  )
}
