import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import type { Song } from '../types'
import { resolveClipUrl, AfrobeatsSynthEngine } from '../lib/audioUtils'

interface AudioContextType {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  hasError: boolean
  audioElement: HTMLAudioElement | null
  playSong: (song: Song) => void
  pauseSong: () => void
  togglePlay: () => void
  seek: (seconds: number) => void
}

const AudioContext = createContext<AudioContextType>({
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 20,
  hasError: false,
  audioElement: null,
  playSong: () => {},
  pauseSong: () => {},
  togglePlay: () => {},
  seek: () => {},
})

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(20)
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
  const synthEngineRef = useRef<AfrobeatsSynthEngine | null>(null)
  const fallbackIntervalRef = useRef<any>(null)
  const currentSongRef = useRef<Song | null>(null)

  useEffect(() => {
    currentSongRef.current = currentSong
  }, [currentSong])

  useEffect(() => {
    if (!audio) return

    // Instantiate procedural Web Audio synth safety net
    synthEngineRef.current = new AfrobeatsSynthEngine()

    const onTimeUpdate = () => {
      if (!hasErrorRef.current && audio.currentTime !== undefined) {
        setCurrentTime(audio.currentTime)
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration)
        }
      }
    }

    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      synthEngineRef.current?.stop()
    }

    const onError = () => {
      console.warn('Audio element error or source unavailable. Engaging Web Audio API Afrobeats synthesizer safety net.')
      hasErrorRef.current = true
      setHasError(true)
      // If was meant to be playing, engage the procedural synth loop
      if (audioRef.current && !audioRef.current.paused) {
        synthEngineRef.current?.start(currentSongRef.current?.bpm || 115)
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.pause()
      audio.src = ''
      synthEngineRef.current?.stop()
    }
  }, [audio])

  // Procedural timer progression when Web Audio fallback is active (demo safety net)
  useEffect(() => {
    if (isPlaying && hasError) {
      const stepMs = 50
      fallbackIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + stepMs / 1000
          if (next >= duration) {
            // Loop smoothly for demo
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

  // Play song - synchronous audioRef.current.play() inside caller's click handler
  const playSong = (song: Song) => {
    if (!audioRef.current) return

    // If already playing this song, do nothing
    if (currentSong?.id === song.id && isPlaying) {
      return
    }

    const resolvedUrl = resolveClipUrl(song.clip_url, `${song.id} ${song.title} ${song.genre}`)
    const targetSong: Song = { ...song, clip_url: resolvedUrl }

    setCurrentSong(targetSong)
    setCurrentTime(0)
    setDuration(song.duration_sec || 24)
    hasErrorRef.current = false
    setHasError(false)

    // Stop synth if it was running
    synthEngineRef.current?.stop()

    // Assign source & immediately trigger play directly inside user click handler
    audioRef.current.src = resolvedUrl
    audioRef.current.currentTime = 0

    const playPromise = audioRef.current.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true)
          hasErrorRef.current = false
          setHasError(false)
        })
        .catch((err) => {
          console.warn('Audio playback error, auto-starting Web Audio Afrobeats synth:', err)
          hasErrorRef.current = true
          setHasError(true)
          setIsPlaying(true)
          synthEngineRef.current?.start(song.bpm || 115)
        })
    }
  }

  const pauseSong = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    synthEngineRef.current?.stop()
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
            hasErrorRef.current = true
            setHasError(true)
            setIsPlaying(true)
            synthEngineRef.current?.start(currentSong.bpm || 115)
          })
      } else {
        setIsPlaying(true)
        synthEngineRef.current?.start(currentSong.bpm || 115)
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
        pauseSong,
        togglePlay,
        seek,
      }}
    >
      {children}
    </AudioContext.Provider>
  )
}

export const useAudio = () => useContext(AudioContext)
