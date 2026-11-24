import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import type { Song } from '../types'

interface AudioContextType {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  hasError: boolean
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
  const hasErrorRef = useRef(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fallbackIntervalRef = useRef<any>(null)

  useEffect(() => {
    // Instantiate shared HTML5 audio instance
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    const onTimeUpdate = () => {
      if (!hasErrorRef.current && audio.currentTime) {
        setCurrentTime(audio.currentTime)
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration)
        }
      }
    }

    const onEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const onError = () => {
      console.warn('Audio element error, falling back to simulated playback progression')
      hasErrorRef.current = true
      setHasError(true)
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
    }
  }, [])

  // Simulated timer fallback if external MP3 URL cannot be reached
  useEffect(() => {
    if (isPlaying && hasError) {
      fallbackIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false)
            return 0
          }
          return Math.min(prev + 0.25, duration)
        })
      }, 250)
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

  const playSong = (song: Song) => {
    if (!audioRef.current) return

    if (currentSong?.id === song.id && isPlaying) {
      return
    }

    setCurrentSong(song)
    setCurrentTime(0)
    setDuration(song.duration_sec || 20)
    hasErrorRef.current = false
    setHasError(false)

    audioRef.current.src = song.clip_url
    audioRef.current.currentTime = 0

    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true)
        hasErrorRef.current = false
        setHasError(false)
      })
      .catch((err) => {
        console.warn('Audio play prevented or URL error, starting simulated progression:', err)
        hasErrorRef.current = true
        setHasError(true)
        setIsPlaying(true)
      })
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
            setHasError(true)
            setIsPlaying(true)
          })
      } else {
        setIsPlaying(true)
      }
    }
  }

  const seek = (seconds: number) => {
    setCurrentTime(seconds)
    if (audioRef.current && !hasError) {
      audioRef.current.currentTime = seconds
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
