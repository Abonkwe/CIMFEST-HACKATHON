import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAudio } from '../context/AudioContext'
import { fetchActiveChallenges, fetchAllSongs } from '../lib/api'
import {
  listOfflineSongs,
  removeSongOffline,
  saveSongOffline,
  type OfflineSongMeta,
} from '../lib/offlineVault'
import { FapshiDonateModal } from '../components/FapshiDonateModal'
import type { Challenge, Song } from '../types'

interface MusicPageProps {
  onNavigateTab: (tab: string, params?: { challenge_id?: string | null; song_id?: string | null }) => void
}

type MusicTab = 'all' | 'trending' | 'albums' | 'fresh' | 'offline'

const GENRE_PILLS = ['All', 'Afropop', 'Makossa', 'Bikutsi', 'Hip Hop', 'Afrobeats'] as const

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const MusicPage: React.FC<MusicPageProps> = ({ onNavigateTab }) => {
  const { currentSong, isPlaying, isPlayingOffline, playSong, togglePlay } = useAudio()

  const [songs, setSongs] = useState<Song[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [offlineSongs, setOfflineSongs] = useState<OfflineSongMeta[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<MusicTab>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({})
  const [vaultError, setVaultError] = useState<string | null>(null)

  const [tipTarget, setTipTarget] = useState<{
    artistId: string
    artistName: string
    songTitle: string
  } | null>(null)

  const refreshOfflineList = useCallback(async () => {
    const items = await listOfflineSongs()
    setOfflineSongs(items)
  }, [])

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      setLoading(true)
      try {
        const [allSongs, activeChallenges] = await Promise.all([
          fetchAllSongs(),
          fetchActiveChallenges(),
        ])
        if (!mounted) return
        setSongs(allSongs)
        setChallenges(activeChallenges)
      } catch (err) {
        console.warn('Music Hub load error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    refreshOfflineList()

    window.addEventListener('camvibe-vault-updated', refreshOfflineList)
    return () => {
      mounted = false
      window.removeEventListener('camvibe-vault-updated', refreshOfflineList)
    }
  }, [refreshOfflineList])

  const offlineMap = useMemo(() => {
    const map = new Map<string, OfflineSongMeta>()
    for (const item of offlineSongs) {
      map.set(item.songId, item)
    }
    return map
  }, [offlineSongs])

  // Convert offline-only entries into playable Song objects if network list is empty
  const offlineAsSongs = useMemo<Song[]>(() => {
    return offlineSongs.map((meta) => {
      const matched = songs.find((s) => s.id === meta.songId)
      if (matched) return matched
      return {
        id: meta.songId,
        artist_id: meta.songId,
        artist_name: meta.artistName,
        album_name: meta.albumName,
        title: meta.title,
        genre: meta.genre,
        language: 'Cameroon',
        clip_url: meta.clipUrl,
        duration_sec: meta.durationSec || 20,
        bpm: meta.bpm || 115,
        status: 'trending',
        trending_score: 90,
      }
    })
  }, [offlineSongs, songs])

  // Featured Release Spotlight: top trending track
  const featuredSong = useMemo(() => {
    if (songs.length === 0) return null
    const sorted = [...songs].sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
    return sorted[0] || null
  }, [songs])

  const filteredSongs = useMemo(() => {
    let base: Song[] = []
    if (activeTab === 'offline') {
      base = offlineAsSongs
    } else if (activeTab === 'trending') {
      base = [...songs]
        .filter((s) => s.status === 'trending')
        .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
    } else if (activeTab === 'fresh') {
      base = songs.filter((s) => s.status === 'fresh')
    } else {
      base = songs
    }

    if (selectedGenre !== 'All') {
      const gLower = selectedGenre.toLowerCase()
      base = base.filter((s) => (s.genre || '').toLowerCase().includes(gLower))
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      base = base.filter((s) => {
        const artist =
          s.artist_name ||
          s.artist?.artist_profile?.artist_name ||
          s.artist?.display_name ||
          ''
        return (
          s.title.toLowerCase().includes(q) ||
          artist.toLowerCase().includes(q) ||
          (s.genre || '').toLowerCase().includes(q) ||
          (s.album_name || '').toLowerCase().includes(q)
        )
      })
    }
    return base
  }, [activeTab, selectedGenre, searchQuery, songs, offlineAsSongs])

  // Grouped by album_name for "Albums & EPs" tab
  const groupedAlbums = useMemo(() => {
    const groups = new Map<string, Song[]>()
    for (const s of filteredSongs) {
      const album = s.album_name?.trim() || 'Singles'
      const arr = groups.get(album) || []
      arr.push(s)
      groups.set(album, arr)
    }
    return Array.from(groups.entries())
  }, [filteredSongs])

  const handleToggleOfflineSave = async (song: Song) => {
    setVaultError(null)
    setSavingIds((prev) => ({ ...prev, [song.id]: true }))
    try {
      if (offlineMap.has(song.id)) {
        await removeSongOffline(song.id)
      } else {
        await saveSongOffline(song)
      }
      await refreshOfflineList()
    } catch (err: any) {
      setVaultError(err?.message || 'Could not save track to In-App Offline Vault.')
    } finally {
      setSavingIds((prev) => ({ ...prev, [song.id]: false }))
    }
  }

  const handleEnterChallenge = (song: Song) => {
    const matchedChallenge = challenges.find(
      (c) => c.song_id === song.id || c.song?.id === song.id
    )
    localStorage.setItem('camvibe_studio_song_id', song.id)
    onNavigateTab('studio', {
      challenge_id: matchedChallenge?.id || null,
      song_id: song.id,
    })
  }

  const renderTrackRow = (song: Song, idx: number) => {
    const isCurrent = currentSong?.id === song.id
    const isSaved = offlineMap.has(song.id)
    const isSaving = Boolean(savingIds[song.id])
    const offlineMeta = offlineMap.get(song.id)
    const artistLabel =
      song.artist_name ||
      song.artist?.artist_profile?.artist_name ||
      song.artist?.display_name ||
      'Verified Artist'

    return (
      <div
        key={song.id}
        className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all ${
          isCurrent
            ? 'bg-[#536D56]/25 border-[#536D56] shadow-lg'
            : 'bg-[#121212] hover:bg-neutral-900/90 border-neutral-800/80 hover:border-[#536D56]/50'
        }`}
      >
        {/* Left: Cover Art & Track Meta */}
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="w-6 text-center text-xs font-mono font-bold text-neutral-500 shrink-0">
            {idx + 1}
          </span>
          <div
            onClick={() => (isCurrent ? togglePlay() : playSong(song))}
            className="relative w-12 h-12 rounded-xl bg-gradient-to-tr from-[#536D56] via-neutral-800 to-[#FACC15]/30 flex items-center justify-center border border-[#536D56]/50 cursor-pointer shrink-0 group-hover:scale-105 transition"
          >
            <span className="text-xl">🎵</span>
            {isCurrent && isPlaying && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-black text-white truncate">{song.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 font-semibold shrink-0">
                {song.album_name || 'Single'}
              </span>
              {isCurrent && isPlayingOffline && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  🔒 Offline Vault
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate mt-0.5">
              <span className="text-neutral-200 font-medium">{artistLabel}</span>
              <span className="text-[#FACC15]" title="Verified Cameroonian Artist">
                ✓
              </span>
              <span>·</span>
              <span>{song.genre}</span>
              <span>·</span>
              <span className="font-mono">{song.duration_sec}s</span>
              {offlineMeta && (
                <span className="text-[10px] font-mono text-emerald-400">
                  · {formatBytes(offlineMeta.sizeBytes)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Save In-App, Tip Artist & Play */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 ml-8 sm:ml-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleToggleOfflineSave(song)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${
              isSaved
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
            }`}
            title={
              isSaved
                ? 'Saved in protected In-App Vault (click to remove)'
                : 'Save for In-App Offline Listening Only'
            }
          >
            {isSaving ? (
              <>
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Encrypting...</span>
              </>
            ) : isSaved ? (
              <>
                <span>🔒</span>
                <span>Protected • Plays in CamVibe Only</span>
              </>
            ) : (
              <>
                <span>⬇</span>
                <span>Save In-App</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setTipTarget({
                artistId: song.artist_id,
                artistName: artistLabel,
                songTitle: song.title,
              })
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#FACC15]/15 hover:bg-[#FACC15]/25 text-[#FACC15] border border-[#FACC15]/40 text-[11px] font-bold transition cursor-pointer"
            title="Tip Artist via MTN MoMo / Orange Money"
          >
            <span>💛</span>
            <span>Tip</span>
          </button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => (isCurrent ? togglePlay() : playSong(song))}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-md cursor-pointer ${
              isCurrent && isPlaying
                ? 'bg-[#F43F5E] text-white'
                : 'bg-white hover:bg-neutral-100 text-neutral-950'
            }`}
            aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
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
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-28 md:pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FACC15] uppercase tracking-wider">
            <span>🇨🇲 Cameroonian Music Hub</span>
            <span>·</span>
            <span className="text-emerald-400">Protected In-App Offline Vault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Stream &amp; Save 237 Sounds
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Stream verified Cameroonian artists and save tracks inside your encrypted in-app vault for offline listening.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#121212] border border-[#536D56]/40 text-xs">
          <span>🔒</span>
          <span className="font-bold text-white">{offlineSongs.length}</span>
          <span className="text-neutral-400">Saved Offline</span>
        </div>
      </div>

      {/* Featured Release Spotlight */}
      {featuredSong && (
        <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#536D56]/35 via-[#161616] to-[#1F1A0E] border border-[#FACC15]/40 shadow-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#536D56] via-neutral-900 to-[#FACC15]/40 border-2 border-[#FACC15]/60 flex items-center justify-center text-4xl shadow-xl shrink-0">
                🇨🇲
              </div>
              <div className="min-w-0 space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FACC15]/20 border border-[#FACC15]/40 text-[#FACC15] text-[10px] font-black uppercase tracking-wider">
                  <span>★ Featured Release Spotlight</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                  {featuredSong.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-300">
                  <span className="font-bold text-white">
                    {featuredSong.artist_name || 'Verified Artist'}
                  </span>
                  <span className="text-[#FACC15]">✓ Verified</span>
                  <span className="text-neutral-500">·</span>
                  <span>{featuredSong.genre}</span>
                  <span className="text-neutral-500">·</span>
                  <span className="font-mono text-[#8FA993]">{featuredSong.bpm} BPM</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  currentSong?.id === featuredSong.id ? togglePlay() : playSong(featuredSong)
                }
                className="py-2.5 px-5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <span>{currentSong?.id === featuredSong.id && isPlaying ? '❚❚ Pause' : '▶ Play'}</span>
              </button>

              <button
                type="button"
                disabled={Boolean(savingIds[featuredSong.id])}
                onClick={() => handleToggleOfflineSave(featuredSong)}
                className={`py-2.5 px-4 rounded-full font-bold text-xs border transition cursor-pointer flex items-center gap-1.5 ${
                  offlineMap.has(featuredSong.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-neutral-900/90 hover:bg-neutral-800 text-white border-neutral-700'
                }`}
              >
                <span>{offlineMap.has(featuredSong.id) ? '🔒' : '⬇'}</span>
                <span>
                  {savingIds[featuredSong.id]
                    ? 'Saving...'
                    : offlineMap.has(featuredSong.id)
                    ? 'Saved In-App'
                    : 'Save Offline (In-App)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleEnterChallenge(featuredSong)}
                className="py-2.5 px-4 rounded-full bg-[#536D56] hover:bg-[#607d64] text-white font-bold text-xs cursor-pointer shadow"
              >
                🔥 Enter Challenge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Search Bar */}
      <div className="relative">
        <svg
          className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tracks, artists, albums, or genres..."
          className="w-full bg-[#121212] border border-[#536D56]/40 rounded-2xl pl-11 pr-10 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#FACC15] transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs flex items-center justify-center cursor-pointer"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: 'All Tracks' },
            { id: 'trending', label: '🔥 Top 237 Charts' },
            { id: 'albums', label: '💿 Albums & EPs' },
            { id: 'fresh', label: '🌱 Fresh Pool' },
            { id: 'offline', label: `🔒 Saved Offline (${offlineSongs.length})` },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition cursor-pointer ${
                active
                  ? 'bg-[#536D56] text-white border-[#FACC15]/50 shadow'
                  : 'bg-[#121212] text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Genre Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {GENRE_PILLS.map((genre) => {
          const active = selectedGenre === genre
          return (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                active
                  ? 'bg-[#FACC15] text-neutral-950 border-[#FACC15]'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              {genre}
            </button>
          )
        })}
      </div>

      {vaultError && (
        <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          ⚠️ {vaultError}
        </div>
      )}

      {/* Track List or Albums & EPs */}
      {loading && activeTab !== 'offline' ? (
        <div className="py-16 text-center text-xs text-neutral-400">
          <span className="inline-block w-6 h-6 border-2 border-[#536D56] border-t-transparent rounded-full animate-spin mb-2" />
          <p>Loading Cameroonian music catalog...</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="py-14 rounded-3xl bg-[#121212] border border-neutral-800 text-center space-y-2 px-4">
          <div className="text-3xl">{activeTab === 'offline' ? '🔒' : '🎵'}</div>
          <p className="text-sm font-bold text-white">
            {activeTab === 'offline'
              ? 'Your In-App Offline Vault is empty'
              : 'No tracks match this filter'}
          </p>
          <p className="text-xs text-neutral-400">
            {activeTab === 'offline'
              ? 'Tap "Save In-App" on any track to listen offline inside CamVibe without downloading raw MP3 files.'
              : 'Try switching tabs or selecting "All" genres.'}
          </p>
        </div>
      ) : activeTab === 'albums' ? (
        <div className="space-y-6">
          {groupedAlbums.map(([albumName, albumTracks]) => (
            <div key={albumName} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black text-[#FACC15] uppercase tracking-wider flex items-center gap-2">
                  <span>💿</span>
                  <span>{albumName}</span>
                </h3>
                <span className="text-[11px] font-mono text-neutral-400">
                  {albumTracks.length} track{albumTracks.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-2">
                {albumTracks.map((song, idx) => renderTrackRow(song, idx))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSongs.map((song, idx) => renderTrackRow(song, idx))}
        </div>
      )}

      {tipTarget && (
        <FapshiDonateModal
          isOpen={!!tipTarget}
          onClose={() => setTipTarget(null)}
          artistId={tipTarget.artistId}
          artistName={tipTarget.artistName}
          songTitle={tipTarget.songTitle}
        />
      )}
    </div>
  )
}
