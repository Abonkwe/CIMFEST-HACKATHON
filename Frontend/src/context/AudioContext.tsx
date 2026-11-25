import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import type { Song, StorySFX } from '../types'
import { resolveClipUrl, storySFX } from '../lib/audioUtils'
import { getOfflinePlayableUrl } from '../lib/offlineVault'

interface AudioContextType {
  currentSong: Song | null
  isPlaying: boolean
  isPlayingOffline: boolean
  isPlayerVisible: boolean
  currentTime: number
  duration: number
  hasError: boolean
  audioElement: HTMLAudioElement | null
  playSong: (song: Song, startTime?: number) => void
  loadSong: (song: Song, startTime?: number) => void
  pauseSong: () => void
  stopSong: () => void
  togglePlay: () => void
  seek: (seconds: number) => void
  playSFX: (sfx?: StorySFX) => void
}

const AudioContext = createContext<AudioContextType>({
  currentSong: null,
  isPlaying: false,
  isPlayingOffline: false,
  isPlayerVisible: false,
  currentTime: 0,
  duration: 20,
  hasError: false,
  audioElement: null,
  playSong: () => {},
  loadSong: () => {},
  pauseSong: () => {},
  stopSong: () => {},
  togglePlay: () => {},
  seek: () => {},
  playSFX: () => {},
})

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayingOffline, setIsPlayingOffline] = useState(false)
  const [isPlayerVisible, setIsPlayerVisible] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(24)
  const [hasError, setHasError] = useState(false)

  // Single persistent HTML5 Audio instance initialized once without cascading effect renders
  const [audio] = useState<HTMLAudioElement | null>(() => {
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      const a = new Audio()
      a.preload = 'none'
      return a
    }
    return null
  })

  const hasErrorRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(audio)
  const fallbackIntervalRef = useRef<any>(null)
  const currentSongRef = useRef<Song | null>(null)
  const isIntentionalPlayRef = useRef(false)
  const offlineRevokeRef = useRef<(() => void) | null>(null)
  const playSessionRef = useRef(0)

  const revokeOfflineBlob = useCallback(() => {
    if (offlineRevokeRef.current) {
      try {
        offlineRevokeRef.current()
      } catch {}
      offlineRevokeRef.current = null
    }
    setIsPlayingOffline(false)
  }, [])

  useEffect(() => {
    currentSongRef.current = currentSong
  }, [currentSong])

  useEffect(() => {
    if (!audio) return

    const onTimeUpdate = () => {
      if (!hasErrorRef.current && audio.currentTime !== undefined) {
        setCurrentTime(audio.currentTime)
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration)
        }
      }
    }

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }

    const onEnded = () => {
      isIntentionalPlayRef.current = false
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const onError = () => {
      // Never auto-play fallback audio unless the user intentionally initiated playback
      if (!isIntentionalPlayRef.current || !currentSongRef.current) {
        return
      }
      console.warn('Audio element error or source unavailable, falling back to local song asset.')
      hasErrorRef.current = true
      setHasError(true)
      const currentSrc = audio.getAttribute('src') || ''
      if (currentSrc && !currentSrc.includes('kocee_we_di_go_na_go.mp3') && !currentSrc.includes('song1.mp3')) {
        audio.src = '/assets/audio/song1.mp3'
        audio.play().catch(() => {})
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      isIntentionalPlayRef.current = false
      audio.pause()
      audio.removeAttribute('src')
    }
  }, [audio])

  // Silent fallback clock advancement if audio file is completely unavailable
  useEffect(() => {
    if (isPlaying && hasError) {
      const stepMs = 50
      fallbackIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + stepMs / 1000
          if (next >= duration) {
            return 0
          }
          return next
        })
      }, stepMs)
    } else {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = null
      }
    }
    return () => {
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current)
    }
  }, [isPlaying, hasError, duration])

  // Safe seek helper that respects audio readyState to avoid decoder crashes and popping
  const safeSeek = (audioEl: HTMLAudioElement, targetSec: number) => {
    if (isNaN(targetSec) || targetSec < 0) return
    const doSeek = () => {
      try {
        if (Math.abs(audioEl.currentTime - targetSec) > 0.08) {
          audioEl.currentTime = targetSec
        }
      } catch {
        // ignore seek bounds error
      }
    }
    if (audioEl.readyState >= 1) {
      doSeek()
    } else {
      audioEl.addEventListener('loadedmetadata', doSeek, { once: true })
    }
  }

  // Play real MP3 song - synchronous audioRef.current.play() inside caller's click handler
  const playSong = (song: Song, startTime?: number) => {
    if (!audioRef.current) return

    const resolvedUrl = resolveClipUrl(song.clip_url, `${song.id} ${song.title} ${song.genre}`)
    const targetSong: Song = { ...song, clip_url: resolvedUrl }
    const targetStartTime = startTime ?? 0
    const isSameSong =
      currentSong?.id === song.id &&
      (audioRef.current.src.endsWith(resolvedUrl) || audioRef.current.src === resolvedUrl)

    isIntentionalPlayRef.current = true
    setIsPlayerVisible(true)

    if (isSameSong) {
      if (startTime !== undefined && Math.abs(audioRef.current.currentTime - targetStartTime) > 0.15) {
        safeSeek(audioRef.current, targetStartTime)
        setCurrentTime(targetStartTime)
      }
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(true))
      }
      return
    }

    setCurrentSong(targetSong)
    setCurrentTime(targetStartTime)
    setDuration(song.duration_sec || 24)
    hasErrorRef.current = false
    setHasError(false)
    revokeOfflineBlob()

    const sessionId = ++playSessionRef.current

    // Assign source & pre-position playhead cleanly before playback starts
    audioRef.current.src = resolvedUrl
    if (targetStartTime > 0) {
      safeSeek(audioRef.current, targetStartTime)
    }

    // Check IndexedDB Offline Vault first: if saved, swap to decrypted in-memory Blob URL
    getOfflinePlayableUrl(song.id).then((offline) => {
      if (!offline) return
      if (playSessionRef.current !== sessionId || !audioRef.current || !isIntentionalPlayRef.current) {
        offline.revoke()
        return
      }
      const resumeAt = audioRef.current.currentTime > 0 ? audioRef.current.currentTime : targetStartTime
      offlineRevokeRef.current = offline.revoke
      setIsPlayingOffline(true)
      audioRef.current.src = offline.url
      if (resumeAt > 0) safeSeek(audioRef.current, resumeAt)
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    })

    const playPromise = audioRef.current.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true)
          hasErrorRef.current = false
          setHasError(false)
        })
        .catch((err) => {
          console.warn('Audio playback error, falling back to local song asset:', err)
          if (audioRef.current && isIntentionalPlayRef.current) {
            audioRef.current.src = '/assets/audio/song1.mp3'
            if (targetStartTime > 0) safeSeek(audioRef.current, targetStartTime)
            audioRef.current
              .play()
              .then(() => {
                setIsPlaying(true)
                hasErrorRef.current = false
              })
              .catch(() => {
                hasErrorRef.current = true
                setHasError(true)
                setIsPlaying(true)
              })
          }
        })
    }
  }

  // Pre-load song into audio element without autoplaying or popping open the floating player bar
  const loadSong = useCallback((song: Song, startTime?: number) => {
    if (!audioRef.current) return
    isIntentionalPlayRef.current = false
    const resolvedUrl = resolveClipUrl(song.clip_url, `${song.id} ${song.title} ${song.genre}`)
    const targetSong: Song = { ...song, clip_url: resolvedUrl }
    setCurrentSong(targetSong)
    setDuration(song.duration_sec || 24)
    if (!audioRef.current.src.endsWith(resolvedUrl)) {
      audioRef.current.src = resolvedUrl
    }
    const initialTime = startTime ?? 0
    if (initialTime > 0) {
      safeSeek(audioRef.current, initialTime)
    }
    setCurrentTime(initialTime)
  }, [])

  const pauseSong = () => {
    isIntentionalPlayRef.current = false
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (!currentSong) return

    if (isPlaying) {
      pauseSong()
    } else {
      isIntentionalPlayRef.current = true
      setIsPlayerVisible(true)
      if (audioRef.current && !hasError && audioRef.current.getAttribute('src')) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            if (audioRef.current && isIntentionalPlayRef.current) {
              audioRef.current.src = '/assets/audio/song1.mp3'
              audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(true))
            }
          })
      } else {
        setIsPlaying(true)
      }
    }
  }

  const seek = (seconds: number) => {
    setCurrentTime(seconds)
    if (audioRef.current && !hasErrorRef.current) {
      safeSeek(audioRef.current, seconds)
    }
  }

  const stopSong = () => {
    playSessionRef.current += 1
    isIntentionalPlayRef.current = false
    revokeOfflineBlob()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    setIsPlaying(false)
    setIsPlayerVisible(false)
    setCurrentSong(null)
    setCurrentTime(0)
  }

  // Play Sound Effect (layered cleanly over music)
  const playSFX = (sfx?: StorySFX) => {
    storySFX.play(sfx)
  }

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        isPlayingOffline,
        isPlayerVisible,
        currentTime,
        duration,
        hasError,
        audioElement: audio,
        playSong,
        loadSong,
        pauseSong,
        stopSong,
        togglePlay,
        seek,
        playSFX,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => useContext(AudioContext)
