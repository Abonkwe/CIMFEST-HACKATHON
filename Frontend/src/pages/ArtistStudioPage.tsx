import React, { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import {
  fetchArtistSongsWithInsights,
  launchArtistChallenge,
  uploadAlbum,
  uploadSong,
} from '../lib/api'
import type { AlbumTrackPayload, ArtistSongInsight, Song } from '../types'

interface ArtistStudioPageProps {
  onNavigateTab: (tab: string) => void
}

type StudioTab = 'release' | 'challenge' | 'insights'

const SONG_GENRES = ['Afropop', 'Makossa', 'Bikutsi', 'Hip Hop', 'Afrobeats', 'Gospel'] as const
const SONG_LANGUAGES = ['Pidgin', 'English', 'French'] as const

const AUDIO_CLIP_PRESETS = [
  {
    label: 'Douala Makossa Groove (song1.mp3)',
    url: '/assets/audio/song1.mp3',
    duration: 22,
    bpm: 115,
  },
  {
    label: 'Yaoundé Bikutsi Energy (song2.mp3)',
    url: '/assets/audio/song2.mp3',
    duration: 20,
    bpm: 128,
  },
  {
    label: 'Kocee — We Di Go Na Go (kocee.mp3)',
    url: '/assets/audio/kocee_we_di_go_na_go.mp3',
    duration: 24,
    bpm: 118,
  },
]

const STUDIO_TABS: { id: StudioTab; label: string; icon: string }[] = [
  { id: 'release', label: 'Release Music', icon: '🎵' },
  { id: 'challenge', label: 'Create Challenge', icon: '🔥' },
  { id: 'insights', label: 'My Releases & Insights', icon: '📊' },
]

export const ArtistStudioPage: React.FC<ArtistStudioPageProps> = ({ onNavigateTab }) => {
  const { user, artistProfile, token } = useAuth()
  const { currentSong, isPlaying, playSong, togglePlay } = useAudio()

  const [activeTab, setActiveTab] = useState<StudioTab>('release')

  // Real artist releases & insights from GET /artists/me/songs
  const [songs, setSongs] = useState<ArtistSongInsight[]>([])
  const [loadingSongs, setLoadingSongs] = useState(true)

  // Release Music state (Single Track vs Album / EP)
  const [releaseMode, setReleaseMode] = useState<'single' | 'album'>('single')
  const [songTitle, setSongTitle] = useState('')
  const [songGenre, setSongGenre] = useState<string>('Afropop')
  const [songLanguage, setSongLanguage] = useState<string>('Pidgin')
  const [songDuration, setSongDuration] = useState<number>(22)
  const [songBpm, setSongBpm] = useState<number>(115)
  const [clipMode, setClipMode] = useState<'preset' | 'custom'>('preset')
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string>(AUDIO_CLIP_PRESETS[0].url)
  const [customClipUrl, setCustomClipUrl] = useState<string>('')

  // Album / EP state
  const [albumName, setAlbumName] = useState('')
  const [albumGenre, setAlbumGenre] = useState<string>('Afropop')
  const [albumLanguage, setAlbumLanguage] = useState<string>('Pidgin')
  const [albumTracks, setAlbumTracks] = useState<AlbumTrackPayload[]>([
    {
      title: '',
      clip_url: AUDIO_CLIP_PRESETS[0].url,
      duration_sec: 22,
      bpm: 115,
    },
  ])

  const [releaseLoading, setReleaseLoading] = useState(false)
  const [releaseError, setReleaseError] = useState<string | null>(null)
  const [releaseSuccess, setReleaseSuccess] = useState<string | null>(null)

  // Create Challenge state (POST /artists/challenges)
  const [challengeSongId, setChallengeSongId] = useState('')
  const [challengeTitle, setChallengeTitle] = useState('')
  const [challengeDurationHours, setChallengeDurationHours] = useState<number>(48)
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [challengeError, setChallengeError] = useState<string | null>(null)
  const [challengeSuccess, setChallengeSuccess] = useState<string | null>(null)

  const loadArtistSongs = useCallback(async () => {
    if (!token || user?.role !== 'artist') {
      setSongs([])
      setLoadingSongs(false)
      return
    }
    setLoadingSongs(true)
    try {
      const res = await fetchArtistSongsWithInsights(token)
      const list = res.songs || []
      setSongs(list)
      if (list.length > 0) {
        setChallengeSongId((prev) => prev || list[0].id)
      }
    } catch {
      setSongs([])
    } finally {
      setLoadingSongs(false)
    }
  }, [token, user?.role])

  useEffect(() => {
    if (user?.role !== 'artist') {
      onNavigateTab(user ? 'account' : 'trending')
      return
    }
    void loadArtistSongs()
  }, [user, onNavigateTab, loadArtistSongs])

  if (user?.role !== 'artist') {
    return null
  }

  const handlePresetSelect = (url: string) => {
    setSelectedPresetUrl(url)
    const preset = AUDIO_CLIP_PRESETS.find((p) => p.url === url)
    if (preset) {
      setSongDuration(preset.duration)
      setSongBpm(preset.bpm)
    }
  }

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    const activeClipUrl = clipMode === 'preset' ? selectedPresetUrl : customClipUrl.trim()
    if (!songTitle.trim()) {
      setReleaseError('Please enter a track title.')
      return
    }
    if (!activeClipUrl) {
      setReleaseError('Please select a local .mp3 preset or enter a clip URL.')
      return
    }
    if (songDuration < 15 || songDuration > 30) {
      setReleaseError('Clip duration must be between 15 and 30 seconds.')
      return
    }

    setReleaseLoading(true)
    setReleaseError(null)
    setReleaseSuccess(null)
    try {
      const created = await uploadSong(
        {
          title: songTitle.trim(),
          album_name: 'Single',
          genre: songGenre,
          language: songLanguage,
          clip_url: activeClipUrl,
          duration_sec: Number(songDuration),
          bpm: Number(songBpm) || 115,
        },
        token
      )
      setSongTitle('')
      setChallengeSongId(created.id)
      setReleaseSuccess(`Single "${created.title}" released to the Fresh Pool!`)
      await loadArtistSongs()
    } catch (err: any) {
      setReleaseError(err?.message || 'Failed to release single.')
    } finally {
      setReleaseLoading(false)
    }
  }

  const handleAddAlbumTrack = () => {
    if (albumTracks.length >= 10) return
    setAlbumTracks((prev) => [
      ...prev,
      {
        title: '',
        clip_url: AUDIO_CLIP_PRESETS[prev.length % AUDIO_CLIP_PRESETS.length].url,
        duration_sec: 20,
        bpm: 115,
      },
    ])
  }

  const handleRemoveAlbumTrack = (idx: number) => {
    if (albumTracks.length <= 1) return
    setAlbumTracks((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleAlbumTrackChange = (idx: number, updates: Partial<AlbumTrackPayload>) => {
    setAlbumTracks((prev) => prev.map((tr, i) => (i === idx ? { ...tr, ...updates } : tr)))
  }

  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!albumName.trim()) {
      setReleaseError('Please enter an Album / EP name.')
      return
    }
    for (let i = 0; i < albumTracks.length; i++) {
      const tr = albumTracks[i]
      if (!tr.title.trim() || !tr.clip_url.trim()) {
        setReleaseError(`Track ${i + 1} needs both a title and a clip URL.`)
        return
      }
      if (tr.duration_sec < 15 || tr.duration_sec > 30) {
        setReleaseError(`Track ${i + 1} duration must be between 15 and 30 seconds.`)
        return
      }
    }

    setReleaseLoading(true)
    setReleaseError(null)
    setReleaseSuccess(null)
    try {
      const res = await uploadAlbum(
        {
          album_name: albumName.trim(),
          genre: albumGenre,
          language: albumLanguage,
          tracks: albumTracks.map((tr) => ({
            ...tr,
            title: tr.title.trim(),
            clip_url: tr.clip_url.trim(),
            duration_sec: Number(tr.duration_sec),
            bpm: Number(tr.bpm) || 115,
          })),
        },
        token
      )
      setAlbumName('')
      setAlbumTracks([
        {
          title: '',
          clip_url: AUDIO_CLIP_PRESETS[0].url,
          duration_sec: 22,
          bpm: 115,
        },
      ])
      if (res.songs[0]?.id) {
        setChallengeSongId(res.songs[0].id)
      }
      setReleaseSuccess(
        `Album "${res.album_name}" (${res.tracks_count} tracks) released to the Fresh Pool!`
      )
      await loadArtistSongs()
    } catch (err: any) {
      setReleaseError(err?.message || 'Failed to release album.')
    } finally {
      setReleaseLoading(false)
    }
  }

  const handleLaunchChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!challengeSongId) {
      setChallengeError('Please select one of your uploaded songs.')
      return
    }
    if (!challengeTitle.trim()) {
      setChallengeError('Please enter a Challenge Title.')
      return
    }

    setChallengeLoading(true)
    setChallengeError(null)
    setChallengeSuccess(null)
    try {
      const res = await launchArtistChallenge(
        {
          song_id: challengeSongId,
          title: challengeTitle.trim(),
          duration_hours: challengeDurationHours,
        },
        token
      )
      setChallengeTitle('')
      setChallengeSuccess(
        `"${res.challenge.title || 'Challenge'}" is now live!${
          res.song_promoted ? ' Your track was promoted from Fresh to Trending.' : ''
        }`
      )
      await loadArtistSongs()
    } catch (err: any) {
      setChallengeError(err?.message || 'Failed to launch challenge.')
    } finally {
      setChallengeLoading(false)
    }
  }

  const handleToggleSongPreview = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay()
    } else {
      playSong(song)
    }
  }

  const totalReleases = songs.length
  const activeChallengesCount = songs.reduce((sum, s) => sum + (s.active_challenges_count || 0), 0)
  const totalFanCreations = songs.reduce((sum, s) => sum + (s.creations_count || 0), 0)
  const activeClipUrlForPreview = clipMode === 'preset' ? selectedPresetUrl : customClipUrl.trim()

  return (
    <div className="space-y-6 pb-24 md:pb-16 animate-fade-in max-w-5xl mx-auto">
      {/* 1. Artist Studio Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#18181B] via-[#121212] to-[#1a241b] border border-[#536D56]/50 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-44 h-44 bg-[#536D56]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-[#536D56]/30 border-2 border-[#536D56] overflow-hidden flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0">
              {artistProfile?.avatar_url ? (
                <img
                  src={artistProfile.avatar_url}
                  alt={artistProfile.artist_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (artistProfile?.artist_name || user.display_name).slice(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#FACC15]">
                Artist Studio Hub
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {artistProfile?.artist_name || user.display_name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Verified Cameroonian Artist ✓</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#536D56]/25 text-[#8FA993] border border-[#536D56]/50">
                  {artistProfile?.primary_genre || 'Afropop'}
                </span>
                {artistProfile?.country_of_residence && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800">
                    {artistProfile.country_of_residence}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Real Summary Metrics */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className="px-3.5 py-3 rounded-2xl bg-[#18181B]/90 border border-neutral-800 text-center">
              <div className="text-xl font-black font-mono text-white">
                {loadingSongs ? '—' : totalReleases}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                Releases
              </div>
            </div>

            <div className="px-3.5 py-3 rounded-2xl bg-[#18181B]/90 border border-neutral-800 text-center">
              <div className="text-xl font-black font-mono text-[#FACC15]">
                {loadingSongs ? '—' : activeChallengesCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                Challenges
              </div>
            </div>

            <div className="px-3.5 py-3 rounded-2xl bg-[#18181B]/90 border border-neutral-800 text-center">
              <div className="text-xl font-black font-mono text-[#8FA993]">
                {loadingSongs ? '—' : totalFanCreations}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                Fan Creations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 3-Tab Workspace Switcher (layoutId sliding pill) */}
      <div className="p-1.5 rounded-2xl bg-[#18181B] border border-neutral-800 grid grid-cols-3 gap-1">
        {STUDIO_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                isActive ? 'text-neutral-950' : 'text-neutral-300 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="artistStudioTab"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-[#FACC15] shadow-md"
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10 truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. Tab 1: Release Music (Single Track / Album or EP) */}
      {activeTab === 'release' && (
        <section className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Release Music to Fresh Pool
              </h2>
              <p className="text-xs text-neutral-400">
                Upload a 15–30 second single clip or batch-release an entire Album / EP
              </p>
            </div>

            <div className="inline-flex rounded-full bg-[#18181B] border border-neutral-800 p-1 text-xs font-bold self-start sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setReleaseMode('single')
                  setReleaseError(null)
                }}
                className={`px-4 py-1.5 rounded-full transition cursor-pointer ${
                  releaseMode === 'single'
                    ? 'bg-[#536D56] text-white shadow'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Single Track
              </button>
              <button
                type="button"
                onClick={() => {
                  setReleaseMode('album')
                  setReleaseError(null)
                }}
                className={`px-4 py-1.5 rounded-full transition cursor-pointer ${
                  releaseMode === 'album'
                    ? 'bg-[#536D56] text-white shadow'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Album / EP
              </button>
            </div>
          </div>

          {releaseSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex flex-wrap items-center justify-between gap-2">
              <span>✓ {releaseSuccess}</span>
              <button
                type="button"
                onClick={() => setActiveTab('challenge')}
                className="underline font-bold text-[#FACC15] cursor-pointer"
              >
                Launch a Challenge for it →
              </button>
            </div>
          )}

          {releaseError && (
            <div className="p-3.5 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
              {releaseError}
            </div>
          )}

          {releaseMode === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Track Title *
                  </label>
                  <input
                    type="text"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="e.g. Buea Mountain Bounce"
                    required
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Genre *
                  </label>
                  <select
                    value={songGenre}
                    onChange={(e) => setSongGenre(e.target.value)}
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56]"
                  >
                    {SONG_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Language *
                  </label>
                  <select
                    value={songLanguage}
                    onChange={(e) => setSongLanguage(e.target.value)}
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56]"
                  >
                    {SONG_LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Clip Duration (15–30s) *
                    </label>
                    <span className="text-xs font-mono text-[#FACC15] font-bold">
                      {songDuration}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={30}
                    value={songDuration}
                    onChange={(e) => setSongDuration(Number(e.target.value))}
                    className="w-full accent-[#536D56] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Tempo (BPM) *
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={240}
                    value={songBpm}
                    onChange={(e) => setSongBpm(Number(e.target.value))}
                    required
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#536D56]"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#18181B] border border-neutral-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-neutral-200">
                    Audio Clip (.mp3 preset or URL) *
                  </label>
                  <div className="inline-flex rounded-full bg-neutral-900 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setClipMode('preset')}
                      className={`px-3 py-1 rounded-full transition cursor-pointer ${
                        clipMode === 'preset' ? 'bg-[#536D56] text-white' : 'text-neutral-300'
                      }`}
                    >
                      Local .mp3 Presets
                    </button>
                    <button
                      type="button"
                      onClick={() => setClipMode('custom')}
                      className={`px-3 py-1 rounded-full transition cursor-pointer ${
                        clipMode === 'custom' ? 'bg-[#536D56] text-white' : 'text-neutral-300'
                      }`}
                    >
                      Custom URL
                    </button>
                  </div>
                </div>

                {clipMode === 'preset' ? (
                  <select
                    value={selectedPresetUrl}
                    onChange={(e) => handlePresetSelect(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#536D56]"
                  >
                    {AUDIO_CLIP_PRESETS.map((preset) => (
                      <option key={preset.url} value={preset.url}>
                        {preset.label} ({preset.duration}s · {preset.bpm} BPM)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="url"
                    value={customClipUrl}
                    onChange={(e) => setCustomClipUrl(e.target.value)}
                    placeholder="https://.../my-15s-clip.mp3"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#536D56]"
                  />
                )}

                {activeClipUrlForPreview && (
                  <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                    <span className="truncate font-mono">{activeClipUrlForPreview}</span>
                    <audio controls src={activeClipUrlForPreview} className="h-8 max-w-[220px]" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={releaseLoading}
                className="py-3 px-6 rounded-full font-bold text-xs bg-[#FACC15] hover:bg-[#eab308] text-neutral-950 transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {releaseLoading ? 'Releasing Single...' : 'Release Single Track'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAlbumSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Album / EP Name *
                  </label>
                  <input
                    type="text"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    placeholder="e.g. Mount Fako EP"
                    required
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Genre *
                  </label>
                  <select
                    value={albumGenre}
                    onChange={(e) => setAlbumGenre(e.target.value)}
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56]"
                  >
                    {SONG_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Language *
                  </label>
                  <select
                    value={albumLanguage}
                    onChange={(e) => setAlbumLanguage(e.target.value)}
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56]"
                  >
                    {SONG_LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300">
                    Tracklist ({albumTracks.length}/10 tracks)
                  </span>
                  <button
                    type="button"
                    disabled={albumTracks.length >= 10}
                    onClick={handleAddAlbumTrack}
                    className="px-3.5 py-1.5 rounded-full bg-[#536D56]/30 hover:bg-[#536D56]/50 border border-[#536D56]/60 text-xs font-bold text-white transition cursor-pointer disabled:opacity-40"
                  >
                    + Add Track
                  </button>
                </div>

                {albumTracks.map((tr, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#18181B] border border-neutral-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FACC15]">Track {idx + 1}</span>
                      {albumTracks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAlbumTrack(idx)}
                          className="text-[11px] text-[#F43F5E] hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        value={tr.title}
                        onChange={(e) => handleAlbumTrackChange(idx, { title: e.target.value })}
                        placeholder={`Track ${idx + 1} title *`}
                        required
                        className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                      />
                      <select
                        value={tr.clip_url}
                        onChange={(e) => handleAlbumTrackChange(idx, { clip_url: e.target.value })}
                        className="bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                      >
                        {AUDIO_CLIP_PRESETS.map((p) => (
                          <option key={p.url} value={p.url}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={15}
                          max={30}
                          value={tr.duration_sec}
                          onChange={(e) =>
                            handleAlbumTrackChange(idx, { duration_sec: Number(e.target.value) })
                          }
                          title="Duration (15–30s)"
                          className="w-1/2 bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                        />
                        <input
                          type="number"
                          min={40}
                          max={240}
                          value={tr.bpm}
                          onChange={(e) =>
                            handleAlbumTrackChange(idx, { bpm: Number(e.target.value) })
                          }
                          title="BPM"
                          className="w-1/2 bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={releaseLoading}
                className="py-3 px-6 rounded-full font-bold text-xs bg-[#FACC15] hover:bg-[#eab308] text-neutral-950 transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {releaseLoading
                  ? 'Releasing Album...'
                  : `Release Album / EP (${albumTracks.length} ${albumTracks.length === 1 ? 'Track' : 'Tracks'})`}
              </button>
            </form>
          )}
        </section>
      )}

      {/* 4. Tab 2: Create Challenge */}
      {activeTab === 'challenge' && (
        <section className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="pb-4 border-b border-neutral-800">
            <h2 className="text-lg font-black text-white tracking-tight">
              Launch a Live Fan Challenge
            </h2>
            <p className="text-xs text-neutral-400">
              Pick one of your uploaded songs, set a challenge title &amp; duration, and go live on Challenges and Studio
            </p>
          </div>

          {challengeSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex flex-wrap items-center justify-between gap-3">
              <span>✓ {challengeSuccess}</span>
              <button
                type="button"
                onClick={() => onNavigateTab('challenges')}
                className="px-4 py-1.5 rounded-full bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-100 transition cursor-pointer"
              >
                Go to Challenges →
              </button>
            </div>
          )}

          {challengeError && (
            <div className="p-3.5 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
              {challengeError}
            </div>
          )}

          {songs.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-[#18181B] border border-neutral-800 text-center space-y-3">
              <div className="text-3xl">🎵</div>
              <p className="text-sm font-bold text-white">No Songs Uploaded Yet</p>
              <p className="text-xs text-neutral-400">
                Release a single or album track first, then come back here to launch a challenge.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('release')}
                className="py-2 px-5 rounded-full bg-[#FACC15] text-neutral-950 font-bold text-xs cursor-pointer"
              >
                Release Your First Song →
              </button>
            </div>
          ) : (
            <form onSubmit={handleLaunchChallenge} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Select Your Song *
                  </label>
                  <select
                    value={challengeSongId}
                    onChange={(e) => setChallengeSongId(e.target.value)}
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FACC15]"
                  >
                    {songs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.album_name || 'Single'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Challenge Title *
                  </label>
                  <input
                    type="text"
                    value={challengeTitle}
                    onChange={(e) => setChallengeTitle(e.target.value)}
                    placeholder="e.g. We Di Go Na Go Dance Challenge"
                    required
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FACC15]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Duration *
                  </label>
                  <select
                    value={challengeDurationHours}
                    onChange={(e) => setChallengeDurationHours(Number(e.target.value))}
                    className="w-full bg-[#18181B] border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#FACC15]"
                  >
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours</option>
                    <option value={72}>72 Hours</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={challengeLoading}
                className="py-3 px-6 rounded-full font-bold text-xs bg-[#FACC15] hover:bg-[#eab308] text-neutral-950 transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {challengeLoading ? 'Launching Challenge...' : '🔥 Launch Live Challenge'}
              </button>
            </form>
          )}
        </section>
      )}

      {/* 5. Tab 3: My Releases & Insights */}
      {activeTab === 'insights' && (
        <section className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 sm:p-7 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                My Releases &amp; Insights
              </h2>
              <p className="text-xs text-neutral-400">
                Real creation counts and vote totals across all your singles and albums
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadArtistSongs()}
              className="px-3.5 py-1.5 rounded-full bg-[#18181B] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white cursor-pointer"
            >
              ↻ Refresh
            </button>
          </div>

          {loadingSongs ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Loading your releases...
            </div>
          ) : songs.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-[#18181B] border border-neutral-800 text-center space-y-2">
              <p className="text-sm font-bold text-white">No Releases Yet</p>
              <p className="text-xs text-neutral-400">
                Head to Release Music to upload your first single or EP.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {songs.map((song) => {
                const isThisPlaying = currentSong?.id === song.id && isPlaying
                return (
                  <div
                    key={song.id}
                    className="p-4 rounded-2xl bg-[#18181B] border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSongPreview(song)}
                        className="w-10 h-10 rounded-xl bg-[#536D56]/30 hover:bg-[#536D56]/50 border border-[#536D56] flex items-center justify-center text-white transition cursor-pointer shrink-0"
                        title={isThisPlaying ? 'Pause clip' : 'Play clip'}
                      >
                        {isThisPlaying ? '❚❚' : '▶'}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate">{song.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-900 text-neutral-300 border border-neutral-700">
                            {song.album_name || 'Single'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              song.status === 'trending'
                                ? 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/40'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {song.status === 'trending' ? 'Trending' : 'Fresh'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {song.genre} · {song.language} · {song.duration_sec}s · {song.bpm} BPM
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono shrink-0">
                      <span className="text-neutral-300">
                        <strong className="text-[#8FA993]">{song.creations_count}</strong> creations
                      </span>
                      <span className="text-neutral-300">
                        <strong className="text-[#FACC15]">{song.votes_count}</strong> votes
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
