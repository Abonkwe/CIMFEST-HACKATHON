import React from 'react'
import { useAudio } from '../context/AudioContext'
import { useLanguage } from '../context/LanguageContext'

export const AudioPlayerBar: React.FC = () => {
  const { currentSong, isPlaying, togglePlay, currentTime, duration, seek } = useAudio()
  const { t } = useLanguage()

  if (!currentSong) return null

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
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 px-3 md:px-6 py-2.5 bg-[#121212]/95 backdrop-blur-md border-t border-[#536D56]/40 shadow-2xl transition-all animate-slide-up">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 md:w-1/3">
          {/* Animated vinyl / disc icon */}
          <div className="relative shrink-0 w-11 h-11 rounded-xl bg-gradient-to-tr from-[#536D56] to-neutral-800 flex items-center justify-center border border-[#536D56]/60 shadow-inner overflow-hidden">
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
            </div>
          </div>
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

        {/* Right Badges */}
        <div className="hidden md:flex items-center justify-end gap-2 md:w-1/3 text-xs text-neutral-400">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>237 Sound</span>
          </span>
          <span className="text-[11px] text-neutral-400 bg-[#536D56]/20 border border-[#536D56]/40 px-2 py-0.5 rounded-full font-mono">
            {currentSong.language}
          </span>
        </div>
      </div>
    </div>
  )
}

