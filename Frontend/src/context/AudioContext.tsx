import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import type { Song, StorySFX } from '../types'
import { resolveClipUrl, storySFX } from '../lib/audioUtils'

interface AudioContextType {
  currentSong: Song | null
  isPlaying: boolean
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
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(24)
  const [hasError, setHasError] = useState(false)

  // Single persistent HTML5 Audio instance initialized once without cascading effect renders
  const [audio] = useState<HTMLAudioElement | null>(() => {
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      const a = new Audio()
      a.preload = 'auto'
      return a
    }
    return null
  })

  const hasErrorRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(audio)
  const fallbackIntervalRef = useRef<any>(null)
  const currentSongRef = useRef<Song | null>(null)

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
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const onError = () => {
      console.warn('Audio element error or source unavailable, falling back to local song asset.')
      hasErrorRef.current = true
      setHasError(true)
      // Attempt playing local verified song asset if external failed
      if (audio.src && !audio.src.includes('we-di-go-na-go.mp3') && !audio.src.includes('kocee_we_di_go_na_go.mp3') && !audio.src.includes('song1.mp3')) {
        audio.src = '/assets/audio/we-di-go-na-go.mp3'
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
      audio.pause()
      audio.src = ''
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

  // Play real MP3 song - synchronous audioRef.current.play() inside caller's click handler
  const playSong = (song: Song, startTime?: number) => {
    if (!audioRef.current) return

    const resolvedUrl = resolveClipUrl(song.clip_url, `${song.id} ${song.title} ${song.genre}`)
    const targetSong: Song = { ...song, clip_url: resolvedUrl }
    const isSameSong = currentSong?.id === song.id && (audioRef.current.src.endsWith(resolvedUrl) || audioRef.current.src === resolvedUrl)

    if (isSameSong) {
      if (startTime !== undefined) {
        audioRef.current.currentTime = startTime
        setCurrentTime(startTime)
      }
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(true))
      }
      return
    }

    setCurrentSong(targetSong)
    const initialTime = startTime ?? 0
    setCurrentTime(initialTime)
    setDuration(song.duration_sec || 24)
    hasErrorRef.current = false
    setHasError(false)

    // Assign source & immediately trigger play directly inside user click handler
    audioRef.current.src = resolvedUrl
    audioRef.current.currentTime = initialTime

    const playPromise = audioRef.current.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true)
          if (startTime !== undefined && audioRef.current) {
            audioRef.current.currentTime = startTime
          }
          hasErrorRef.current = false
          setHasError(false)
        })
        .catch((err) => {
          console.warn('Audio playback error, falling back to local song asset:', err)
          if (audioRef.current) {
            audioRef.current.src = '/assets/audio/we-di-go-na-go.mp3'
            if (startTime !== undefined) audioRef.current.currentTime = startTime
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

  // Pre-load song into audio element so duration & waveform can be inspected without autoplaying
  const loadSong = (song: Song, startTime?: number) => {
    if (!audioRef.current) return
    const resolvedUrl = resolveClipUrl(song.clip_url, `${song.id} ${song.title} ${song.genre}`)
    const targetSong: Song = { ...song, clip_url: resolvedUrl }
    setCurrentSong(targetSong)
    setDuration(song.duration_sec || 24)
    if (!audioRef.current.src.endsWith(resolvedUrl)) {
      audioRef.current.src = resolvedUrl
    }
    const initialTime = startTime ?? 0
    audioRef.current.currentTime = initialTime
    setCurrentTime(initialTime)
  }

  const pauseSong = () => {
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
      if (audioRef.current && !hasError && audioRef.current.src) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            if (audioRef.current) {
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
      try {
        audioRef.current.currentTime = seconds
      } catch {
        // ignore seek boundary error
      }
    }
  }

  const stopSong = () => {
    pauseSong()
    seek(0)
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
