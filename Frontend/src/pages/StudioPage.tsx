import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { Challenge, MoveBlock } from '../types'
import { fetchActiveChallenges, fetchTrendingSongs, submitCreation } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { StagePlayer, type BackgroundTheme } from '../components/StagePlayer'

interface StudioPageProps {
  onNavigateTab: (tab: string) => void
}

const CHARACTERS = [
  {
    id: 'tantie',
    displayName: 'Tantie',
    subtitle: 'Makossa Mama',
    avatar: '💃',
    badge: 'Classic Queen',
    description: 'Traditional wax-print boubou & bold energy',
  },
  {
    id: 'mboa_boy',
    displayName: 'Mboa Boy',
    subtitle: 'Urban 237 Dancer',
    avatar: '🕺',
    badge: 'Afropop King',
    description: 'Streetwear hoodie, retro shades & snapback cap',
  },
  {
    id: 'pa_buea',
    displayName: 'Pa Buea',
    subtitle: 'Makossa Legend',
    avatar: '🎩',
    badge: 'Master Elder',
    description: 'Buea royal tunic, wireframe specs & gold cane',
  },
]

const BACKGROUND_SWATCHES: {
  id: BackgroundTheme
  name: string
  colors: string
  ringColor: string
}[] = [
  {
    id: 'sage_starburst',
    name: 'Sage Starburst',
    colors: 'from-[#536D56] to-[#F43F5E]',
    ringColor: '#F43F5E',
  },
  {
    id: 'amber_sunset',
    name: 'Amber Sunset',
    colors: 'from-[#D97706] to-[#451A03]',
    ringColor: '#F59E0B',
  },
  {
    id: 'slate_night',
    name: 'Slate Night',
    colors: 'from-[#0F172A] to-[#06B6D4]',
    ringColor: '#06B6D4',
  },
  {
    id: 'lavender_haze',
    name: 'Lavender Haze',
    colors: 'from-[#8B5CF6] to-[#DB2777]',
    ringColor: '#C084FC',
  },
]

const MOVE_PADS: {
  action: string
  label: string
  icon: string
  desc: string
  color: string
}[] = [
  {
    action: 'sway',
    label: 'Sway',
    icon: '🕺',
    desc: 'Hip & body rhythm tilt',
    color: 'from-emerald-600 to-teal-800 border-emerald-500/50',
  },
  {
    action: 'stomp',
    label: 'Stomp',
    icon: '👞',
    desc: 'Ground-shaking beat impact',
    color: 'from-amber-600 to-orange-800 border-amber-500/50',
  },
  {
    action: 'jump',
    label: 'Jump',
    icon: '🦘',
    desc: 'High bounce airborne leap',
    color: 'from-rose-600 to-red-800 border-rose-500/50',
  },
  {
    action: 'flex',
    label: 'Flex',
    icon: '💪',
    desc: 'Swagger muscle & chest pop',
    color: 'from-indigo-600 to-violet-800 border-indigo-500/50',
  },
]

const QUICK_STICKERS = [
  { label: 'Dis Beat Sweet!', icon: '🎵', tag: 'Pidgin' },
  { label: 'Chai!', icon: '💥', tag: 'Cameroon' },
  { label: 'No Stress!', icon: '✨', tag: 'Street' },
]

const CAMEROON_PHRASES = [
  'Dis Beat Sweet! 🔥',
  'Chai! Mboa boy di dance! 🕺',
  'No Stress, we vibe! ✨',
  'On va danser le Makossa! 🇨🇲',
  'Waka fine, level don change! 🚀',
]

export const StudioPage: React.FC<StudioPageProps> = ({ onNavigateTab }) => {
  const { user, token, openLoginModal } = useAuth()
  const { playSong, pauseSong, seek, currentTime, isPlaying, currentSong } = useAudio()

  // Challenges and songs
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)

  // Character selection (FR-20)
  const [selectedCharacter, setSelectedCharacter] = useState<string>('mboa_boy')

  // Background theme (Pure CSS + SVG, NFR-2)
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('sage_starburst')

  // 8-Block Timeline (FR-21)
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0)
  const totalDuration = selectedChallenge?.song?.duration_sec || currentSong?.duration_sec || 24

  // Initialize 8 equal blocks
  const [timelineBlocks, setTimelineBlocks] = useState<MoveBlock[]>(() => {
    const blockDuration = 24 / 8
    const defaultMoves = ['sway', 'stomp', 'jump', 'flex', 'sway', 'stomp', 'jump', 'flex']
    return Array.from({ length: 8 }).map((_, i) => ({
      start: Math.round(i * blockDuration * 10) / 10,
      end: Math.round((i + 1) * blockDuration * 10) / 10,
      action: defaultMoves[i],
    }))
  })

  // Caption & Stickers (FR-23)
  const [caption, setCaption] = useState<string>('Dis Beat Sweet!')
  const [activeSticker, setActiveSticker] = useState<string | null>('Dis Beat Sweet!')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Scrubber container ref for smooth seeking
  const scrubberRef = useRef<HTMLInputElement>(null)
  const playSongRef = useRef(playSong)
  useEffect(() => {
    playSongRef.current = playSong
  })

  // Load active challenges & songs
  useEffect(() => {
    let mounted = true
    const initStudio = async () => {
      setLoading(true)
      try {
        const [chData, trendingData] = await Promise.all([
          fetchActiveChallenges(),
          fetchTrendingSongs(),
        ])
        if (!mounted) return
        setChallenges(chData)

        let initialCh: Challenge | null = null
        if (chData.length > 0) {
          initialCh = chData[0]
        } else if (trendingData.length > 0) {
          initialCh = {
            id: '11111111-2222-3333-4444-555555555555',
            song_id: trendingData[0].id,
            song: trendingData[0],
            status: 'active',
            ends_at: new Date(Date.now() + 86400000).toISOString(),
            creations_count: 12,
          }
        }

        if (initialCh) {
          setSelectedChallenge(initialCh)
          if (initialCh.song) {
            playSongRef.current(initialCh.song)
            const dur = initialCh.song.duration_sec || 24
            const blockDuration = dur / 8
            setTimelineBlocks((prev) =>
              prev.map((block, i) => ({
                start: Math.round(i * blockDuration * 10) / 10,
                end: Math.round((i + 1) * blockDuration * 10) / 10,
                action: block.action || 'sway',
              }))
            )
          }
        }
      } catch (err) {
        console.warn('Failed loading studio challenges:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    initStudio()
    return () => {
      mounted = false
    }
  }, [])

  // Current playing song & BPM
  const activeBpm = selectedChallenge?.song?.bpm || currentSong?.bpm || 110

  // Highlighted block in real time from <audio>.currentTime
  const currentHighlightedBlockIndex = useMemo(() => {
    const foundIdx = timelineBlocks.findIndex(
      (b) => currentTime >= b.start && currentTime < b.end
    )
    return foundIdx !== -1 ? foundIdx : 0
  }, [timelineBlocks, currentTime])

  // Assign move to the active selected block and advance
  const handleAssignMove = (action: string) => {
    setTimelineBlocks((prev) =>
      prev.map((b, idx) => (idx === activeBlockIndex ? { ...b, action } : b))
    )
    // Auto-advance to next block for super fast composition (NFR-3: under 2 min)
    setActiveBlockIndex((prev) => (prev + 1) % 8)
  }

  // Quick preset sequences
  const handleApplyPreset = (presetType: 'makossa' | 'high_energy' | 'swagger') => {
    let actions: string[] = []
    if (presetType === 'makossa') {
      actions = ['sway', 'sway', 'stomp', 'stomp', 'sway', 'sway', 'flex', 'flex']
    } else if (presetType === 'high_energy') {
      actions = ['jump', 'stomp', 'jump', 'stomp', 'jump', 'jump', 'flex', 'flex']
    } else {
      actions = ['sway', 'stomp', 'jump', 'flex', 'sway', 'stomp', 'jump', 'flex']
    }

    setTimelineBlocks((prev) =>
      prev.map((b, i) => ({ ...b, action: actions[i] || 'sway' }))
    )
  }

  // Handle clicking a timeline block
  const handleSelectBlock = (idx: number) => {
    setActiveBlockIndex(idx)
    const targetBlock = timelineBlocks[idx]
    if (targetBlock) {
      seek(targetBlock.start)
    }
  }

  // Transport toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseSong()
    } else {
      if (selectedChallenge?.song) {
        playSong(selectedChallenge.song)
      }
    }
  }

  // Scrubber change
  const handleScrub = (seconds: number) => {
    seek(seconds)
  }

  // Submit creation to challenge (FR-17, FR-24)
  const handleSubmit = async () => {
    setSubmitError(null)

    if (!user || !token) {
      openLoginModal()
      return
    }

    if (!selectedChallenge) {
      setSubmitError('Please select an active challenge first.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        challenge_id: selectedChallenge.id,
        character_id: selectedCharacter,
        moves_timeline: timelineBlocks.map((b) => ({
          start: b.start,
          end: b.end,
          action: b.action,
        })),
        caption: caption.trim() || undefined,
      }

      await submitCreation(payload, token)
      setSubmitSuccess(true)

      // Short delay for celebration, then redirect to /feed
      setTimeout(() => {
        onNavigateTab('feed')
      }, 900)
    } catch (err: any) {
      console.error('Failed submitting creation:', err)
      setSubmitError(err?.message || 'Failed to submit creation to challenge.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 animate-fade-in">
        <span className="inline-block w-8 h-8 border-3 border-[#536D56] border-t-transparent rounded-full animate-spin" />
        <h3 className="text-base font-bold text-white">Loading Animation Studio Lite...</h3>
        <p className="text-xs text-neutral-400">Loading Cameroon challenges and 2-pose character engines...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-28 md:pb-16 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FACC15] uppercase tracking-wider">
            <span>✨ Animation Studio Lite</span>
            <span>·</span>
            <span>FR-20 – FR-24</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Create Your BeatToon
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Sequence snappy dance moves to Cameroon beats with 0 video rendering.
          </p>
        </div>

        {/* Quick Help / Info Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-neutral-900 border border-[#536D56]/40 text-[#8FA993] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NFR-2 Low Data (JSON Engine)</span>
          </span>
        </div>
      </div>

      {/* Main Studio Grid: Responsive Side-by-Side (Desktop) / 50/50 Split (Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: LIVE STAGE PREVIEW & TRANSPORT (lg:col-span-6) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-4 z-10">
          {/* Reusable StagePlayer Live Component */}
          <div className="relative rounded-3xl overflow-hidden border border-[#536D56]/60 shadow-2xl bg-black">
            <StagePlayer
              characterId={selectedCharacter}
              backgroundTheme={backgroundTheme}
              movesTimeline={timelineBlocks}
              bpm={activeBpm}
              currentTime={currentTime}
              isPlaying={isPlaying}
              caption={caption}
              sticker={activeSticker}
              onStickerTap={(st) => setActiveSticker(st)}
              aspectRatio="aspect-[16/11] sm:aspect-[16/10]"
              mode="studio"
            />
          </div>

          {/* Audio Transport Scrubber Bar (FR-22) */}
          <div className="p-4 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
            {/* Top row: Track info & BPM */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">🎵</span>
                <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                  {selectedChallenge?.song?.title || 'Douala Makossa Pulse'}
                </span>
                <span className="text-[#FACC15] font-semibold text-[11px] shrink-0">
                  {selectedChallenge?.song?.genre || 'Makossa'}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#FACC15] bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                {activeBpm} BPM
              </span>
            </div>

            {/* Scrubber Range Slider */}
            <div className="space-y-1">
              <input
                ref={scrubberRef}
                type="range"
                min={0}
                max={totalDuration}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleScrub(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#F43F5E] focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>{currentTime.toFixed(1)}s</span>
                <span className="text-[#8FA993]">
                  Block #{currentHighlightedBlockIndex + 1} ({timelineBlocks[currentHighlightedBlockIndex]?.action?.toUpperCase()})
                </span>
                <span>{totalDuration.toFixed(1)}s</span>
              </div>
            </div>

            {/* Transport Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {/* Restart to 0s */}
                <button
                  type="button"
                  onClick={() => seek(0)}
                  className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition active:scale-95 cursor-pointer"
                  title="Restart to Beginning"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                  </svg>
                </button>

                {/* Big Play/Pause Button */}
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="py-2.5 px-6 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                      <span>PAUSE PREVIEW</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>PLAY PREVIEW</span>
                    </>
                  )}
                </button>
              </div>

              {/* Presets dropdown / pill */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase hidden sm:inline">
                  Presets:
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('makossa')}
                  className="text-[10px] font-bold px-2 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-[#FACC15] border border-neutral-700 transition cursor-pointer"
                >
                  Makossa
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('high_energy')}
                  className="text-[10px] font-bold px-2 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-[#F43F5E] border border-neutral-700 transition cursor-pointer"
                >
                  Energy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: STUDIO CONTROL DECK (lg:col-span-6) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* 1. Song / Challenge Selector (FR-20) */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Select Challenge Song</span>
                <span className="text-[#FACC15]">★</span>
              </label>
              <span className="text-[10px] text-neutral-400">
                {challenges.length} active contests
              </span>
            </div>

            <div className="relative">
              <select
                value={selectedChallenge?.id || ''}
                onChange={(e) => {
                  const found = challenges.find((c) => c.id === e.target.value)
                  if (found) {
                    setSelectedChallenge(found)
                    if (found.song) playSong(found.song)
                    const dur = found.song?.duration_sec || 24
                    const blockDuration = dur / 8
                    setTimelineBlocks((prev) =>
                      prev.map((block, i) => ({
                        start: Math.round(i * blockDuration * 10) / 10,
                        end: Math.round((i + 1) * blockDuration * 10) / 10,
                        action: block.action || 'sway',
                      }))
                    )
                  }
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-[#536D56] cursor-pointer appearance-none"
              >
                {challenges.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.song?.title || 'Unknown Track'} — {ch.song?.genre || 'Afropop'} ({ch.song?.bpm || 110} BPM)
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                ▼
              </div>
            </div>
          </div>

          {/* 2. Character Pickers (3 Circular Avatars: Tantie, Mboa Boy, Pa Buea, FR-20) */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>2. Choose Character (Open Peeps)</span>
                <span className="text-[#FACC15]">✦</span>
              </label>
              <span className="text-[10px] font-mono text-[#8FA993]">
                2-Pose Engine
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {CHARACTERS.map((char) => {
                const isSelected = selectedCharacter === char.id
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setSelectedCharacter(char.id)}
                    className={`relative flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#536D56]/20 border-[#F43F5E] shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[1.02]'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#F43F5E] text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}

                    {/* Circular Avatar */}
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-2 transition-transform ${
                        isSelected
                          ? 'ring-4 ring-[#F43F5E] bg-neutral-800 scale-105'
                          : 'bg-neutral-800/80 ring-1 ring-neutral-700'
                      }`}
                    >
                      {char.avatar}
                    </div>

                    <span className="text-xs font-black text-white leading-tight">
                      {char.displayName}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5 truncate w-full">
                      {char.subtitle}
                    </span>
                    <span className="text-[9px] font-semibold text-[#FACC15] mt-1 bg-black/40 px-2 py-0.5 rounded-full">
                      {char.badge}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Stage Background 4-Swatch Switcher Bar (Pure CSS + SVG, NFR-2) */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>3. Stage Background</span>
                <span className="text-[#8FA993]">✦</span>
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">
                Pure CSS + SVG
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BACKGROUND_SWATCHES.map((swatch) => {
                const isSelected = backgroundTheme === swatch.id
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => setBackgroundTheme(swatch.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800 border-white shadow-md ring-2'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                    }`}
                    style={{
                      outlineColor: isSelected ? swatch.ringColor : undefined,
                    }}
                  >
                    {/* Swatch circle */}
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${swatch.colors} shrink-0 shadow-inner border border-white/20`}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-white truncate">
                        {swatch.name}
                      </div>
                      <div className="text-[9px] text-neutral-400 truncate">
                        {swatch.id === 'sage_starburst' ? 'Olive & Coral' : 'Afro Theme'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. 8-Block Horizontal Beat Timeline (FR-21) */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>4. 8-Block Beat Timeline</span>
                <span className="text-[#FACC15]">⏱</span>
              </label>
              <span className="text-[10px] text-neutral-400">
                Tap block to edit or seek
              </span>
            </div>

            {/* 8 Horizontal Beat Blocks */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {timelineBlocks.map((block, idx) => {
                const isCurrentPlaying = currentHighlightedBlockIndex === idx && isPlaying
                const isSelectedForEdit = activeBlockIndex === idx

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectBlock(idx)}
                    className={`relative p-2 rounded-2xl border flex flex-col items-center justify-between min-h-[74px] transition-all cursor-pointer ${
                      isSelectedForEdit
                        ? 'bg-[#536D56]/30 border-[#FACC15] ring-2 ring-[#FACC15]/60'
                        : isCurrentPlaying
                        ? 'bg-neutral-800 border-[#F43F5E] animate-pulse'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {/* Block index pill */}
                    <div className="flex items-center justify-between w-full text-[9px] font-mono text-neutral-400">
                      <span>#{idx + 1}</span>
                      {isCurrentPlaying && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] animate-ping" />
                      )}
                    </div>

                    {/* Move Icon */}
                    <div className="text-xl my-0.5">
                      {block.action === 'sway' && '🕺'}
                      {block.action === 'stomp' && '👞'}
                      {block.action === 'jump' && '🦘'}
                      {block.action === 'flex' && '💪'}
                    </div>

                    {/* Action Label */}
                    <span className="text-[10px] font-black uppercase text-white truncate">
                      {block.action}
                    </span>

                    {/* Timing */}
                    <span className="text-[8px] font-mono text-neutral-400">
                      {block.start}s
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 5. 4 Move Pads (Sway, Stomp, Jump, Flex, FR-21) */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>5. Move Pads (Tap to Assign Block #{activeBlockIndex + 1})</span>
                <span className="text-[#F43F5E]">✦</span>
              </label>
              <span className="text-[10px] text-[#8FA993] font-semibold">
                Auto-advances
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MOVE_PADS.map((pad) => (
                <button
                  key={pad.action}
                  type="button"
                  onClick={() => handleAssignMove(pad.action)}
                  className={`p-3.5 rounded-2xl bg-gradient-to-br ${pad.color} border text-white flex flex-col items-center justify-center gap-1 shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer group`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">
                    {pad.icon}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wide">
                    {pad.label}
                  </span>
                  <span className="text-[9px] text-neutral-200 text-center leading-tight">
                    {pad.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Caption & Quick Reaction Stickers (FR-23) */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>6. Speech Caption & Reactions</span>
                <span className="text-[#FACC15]">💬</span>
              </label>
              <span className="text-[10px] text-neutral-400">
                English · French · Pidgin
              </span>
            </div>

            {/* Quick Stickers Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase">
                Stickers:
              </span>
              {QUICK_STICKERS.map((stk) => (
                <button
                  key={stk.label}
                  type="button"
                  onClick={() => {
                    setActiveSticker(stk.label)
                    setCaption(stk.label)
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-black border transition cursor-pointer flex items-center gap-1.5 ${
                    activeSticker === stk.label
                      ? 'bg-[#FACC15] text-neutral-950 border-neutral-950 shadow-[2px_2px_0px_#000] scale-105'
                      : 'bg-neutral-900 text-white border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <span>{stk.icon}</span>
                  <span>{stk.label}</span>
                </button>
              ))}
            </div>

            {/* Caption Input */}
            <div className="space-y-2">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={80}
                placeholder="Add caption in Pidgin, French, or English..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-[#536D56]"
              />

              {/* Quick Cameroon Phrase Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CAMEROON_PHRASES.map((ph, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCaption(ph)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition cursor-pointer"
                  >
                    {ph}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 7. Submit to Challenge Button (FR-17, FR-24) */}
          <div className="space-y-3 pt-2">
            {submitError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                <span>🎉</span>
                <span>BeatToon submitted successfully! Redirecting to feed...</span>
              </div>
            )}

            <button
              type="button"
              disabled={submitting || submitSuccess}
              onClick={handleSubmit}
              className="w-full py-4 rounded-full font-black text-sm bg-white hover:bg-neutral-100 active:scale-98 text-neutral-950 shadow-2xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Challenge...</span>
                </>
              ) : (
                <>
                  <span>Submit to Challenge</span>
                  <span className="text-[#F43F5E] text-base">✦</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
