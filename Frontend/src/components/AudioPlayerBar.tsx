import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAudio } from '../context/AudioContext'
import { useLanguage } from '../context/LanguageContext'

export const AudioPlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isPlayerVisible,
    togglePlay,
    pauseSong,
    stopSong,
    currentTime,
    duration,
    seek,
  } = useAudio()
  const { t } = useLanguage()

  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear pending close timer only on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [])

  // If user starts playing again mid-close animation, cancel closing cleanly
  useEffect(() => {
    if (isPlaying && closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
      const id = requestAnimationFrame(() => setIsClosing(false))
      return () => cancelAnimationFrame(id)
    }
  }, [isPlaying])

  const handleClose = useCallback(() => {
    if (!currentSong || !isPlayerVisible) return
    // 1. Immediately pause & terminate audio playback
    pauseSong()
    // 2. Animate bar collapse
    setIsClosing(true)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    // 3. Complete stop and hide bar until the user plays a song again
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      stopSong()
      setIsClosing(false)
    }, 280)
  }, [currentSong, isPlayerVisible, pauseSong, stopSong])

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentSong && isPlayerVisible && !isClosing) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSong, isPlayerVisible, isClosing, handleClose])

  if (!currentSong || !isPlayerVisible) return null

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    seek(val)
  }

  return (
    <div
      className={`fixed bottom-16 md:bottom-0 left-0 right-0 z-40 px-3 md:px-6 py-2.5 bg-[#121212]/95 backdrop-blur-md border-t border-[#536D56]/40 shadow-2xl transition-all ${
        isClosing ? 'animate-slide-down pointer-events-none' : 'animate-slide-up'
      }`}
    >
      <div className="w-full max-w-[1800px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Track Info (with Mobile Close Button) */}
        <div className="flex items-center justify-between md:justify-start gap-3 min-w-0 md:w-1/3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            {/* Animated vinyl / disc icon */}
            <div className="relative shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-tr from-[#536D56] to-neutral-800 flex items-center justify-center border border-[#536D56]/60 shadow-inner overflow-hidden">
              <span
                className={`text-xl transition-transform duration-1000 ${
                  isPlaying ? 'animate-spin' : ''
                }`}
              >
                🎵
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs md:text-sm font-bold text-white truncate">
                  {currentSong.title}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#536D56]/40 text-[#8FA993] border border-[#536D56]/50 shrink-0">
                  {currentSong.genre}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-neutral-400 truncate">
                <span>{currentSong.artist_name || 'Verified Artist'}</span>
                <span className="text-[#FACC15] shrink-0" title={t('verifiedBadge')}>
                  ✓
                </span>
                <span className="text-neutral-500">·</span>
                <span className="font-mono text-neutral-400">{currentSong.bpm} BPM</span>
                <span className="text-neutral-500 md:hidden">·</span>
                <span
                  className={`md:hidden font-semibold ${
                    isPlaying ? 'text-emerald-400' : 'text-amber-300'
                  }`}
                >
                  {isPlaying ? 'Playing' : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          {/* Close button for Mobile (< md) */}
          <button
            onClick={handleClose}
            className="md:hidden shrink-0 w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-[#F43F5E]/20 text-neutral-400 hover:text-[#F43F5E] flex items-center justify-center transition border border-neutral-700/60 hover:border-[#F43F5E]/50 active:scale-95 cursor-pointer shadow-sm"
            title={t('closePlayer')}
            aria-label={t('closePlayer')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Center Controls & Scrubber */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1 w-full">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white hover:bg-neutral-200 text-neutral-900 flex items-center justify-center transition shadow-lg active:scale-95 cursor-pointer"
              aria-label={isPlaying ? t('pauseClip') : t('playClip')}
            >
              {isPlaying ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Time scrubber */}
          <div className="w-full flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 20}
                step={0.1}
                value={currentTime}
                onChange={handleSeekChange}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#F43F5E]"
              />
              <div
                className="absolute left-0 top-0 h-1.5 bg-gradient-to-r from-[#536D56] to-[#F43F5E] rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Badges & Desktop Close Button (>= md) */}
        <div className="hidden md:flex items-center justify-end gap-2.5 md:w-1/3 text-xs text-neutral-400">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] shrink-0 ${
              isPlaying
                ? 'bg-neutral-900 border-emerald-500/30 text-emerald-300'
                : 'bg-neutral-900 border-amber-500/30 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isPlaying ? 'Playing' : 'Paused'}</span>
          </span>
          <span className="text-[11px] text-neutral-400 bg-[#536D56]/20 border border-[#536D56]/40 px-2 py-0.5 rounded-full font-mono shrink-0">
            {currentSong.language}
          </span>
          <button
            onClick={handleClose}
            className="shrink-0 w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-[#F43F5E]/20 text-neutral-400 hover:text-[#F43F5E] flex items-center justify-center transition border border-neutral-700/60 hover:border-[#F43F5E]/50 active:scale-95 cursor-pointer shadow-sm"
            title={t('closePlayer')}
            aria-label={t('closePlayer')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
