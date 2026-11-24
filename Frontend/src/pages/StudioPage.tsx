import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { Challenge, MoveBlock, StoryProp, StorySFX } from '../types'
import { fetchActiveChallenges, fetchTrendingSongs, submitCreation } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { StagePlayer } from '../components/StagePlayer'
import {
  STORY_TEMPLATES,
  STORY_ACTIONS,
  STORY_BACKGROUNDS,
  BG_MOTIONS,
  STORY_PROPS,
  STORY_SFX_LIST,
  KOCEE_DEMO_SONG,
  KOCEE_DEMO_CHALLENGE,
  type StoryTemplate,
} from '../lib/storyTemplates'

interface StudioPageProps {
  onNavigateTab: (tab: string) => void
}

const CHARACTERS: {
  id: 'tantie' | 'mboa_boy' | 'pa_buea'
  displayName: string
  subtitle: string
  avatar: string
  badge: string
  description: string
}[] = [
  {
    id: 'tantie',
    displayName: 'Tantie',
    subtitle: 'Makossa Mama',
    avatar: '💃',
    badge: 'Classic Queen',
    description: 'Traditional wax-print boubou & sunglasses',
  },
  {
    id: 'mboa_boy',
    displayName: 'Mboa Boy',
    subtitle: 'Urban 237 Dancer',
    avatar: '🕺',
    badge: 'Street King',
    description: 'Streetwear hoodie & urban beanie',
  },
  {
    id: 'pa_buea',
    displayName: 'Pa Buea',
    subtitle: 'Makossa Legend',
    avatar: '🎩',
    badge: 'Master Elder',
    description: 'Buea royal tunic, glasses & distinguished beard',
  },
]

// Circular Character Avatar rendering Open Peeps SVG with fallback
const CharacterAvatarCircle: React.FC<{
  characterId: string
  displayName: string
  fallbackEmoji: string
}> = ({ characterId, displayName, fallbackEmoji }) => {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return <span className="text-2xl sm:text-3xl select-none">{fallbackEmoji}</span>
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-neutral-700/50 to-neutral-800 flex items-center justify-center">
      <img
        src={`/assets/characters/${characterId}_pose_a.svg`}
        alt={displayName}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-top scale-[1.75] translate-y-3 sm:translate-y-3.5 pointer-events-none select-none"
      />
    </div>
  )
}

// Visual waveform amplitude profile (transients for 48 bars)
const WAVEFORM_BARS = [
  30, 45, 60, 35, 75, 90, 65, 40, 85, 100, 70, 50, 40, 65, 80, 95,
  85, 60, 45, 75, 90, 100, 80, 55, 40, 70, 85, 65, 90, 95, 75, 50,
  35, 60, 80, 100, 90, 70, 55, 85, 90, 65, 45, 60, 80, 70, 50, 35,
]

// Distribute cropped song slice equally across story scenes
function distributeCroppedWindowToScenes(
  start: number,
  end: number,
  scenes: MoveBlock[]
): MoveBlock[] {
  const count = scenes.length || 4
  const duration = Math.max(end - start, 8)
  const sceneLength = duration / count
  return scenes.map((scene, idx) => ({
    ...scene,
    start: Number((start + idx * sceneLength).toFixed(2)),
    end: Number((start + (idx + 1) * sceneLength).toFixed(2)),
  }))
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, isNaN(seconds) ? 0 : seconds)
  const mins = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const StudioPage: React.FC<StudioPageProps> = ({ onNavigateTab }) => {
  const { user, token, openLoginModal } = useAuth()
  const {
    playSong,
    loadSong,
    pauseSong,
    seek,
    currentTime,
    duration: audioDuration,
    isPlaying,
    currentSong,
    audioElement,
    playSFX,
  } = useAudio()

  // Challenges and songs - Kocee is default challenge (FR-20, Demo Track Default)
  const [challenges, setChallenges] = useState<Challenge[]>([KOCEE_DEMO_CHALLENGE])
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(KOCEE_DEMO_CHALLENGE)
  const [loading, setLoading] = useState(true)

  // Full track duration derived from audio element or metadata
  const fullSongDuration = Math.max(
    audioDuration || 0,
    selectedChallenge?.song?.duration_sec || 156
  )

  // In-Studio Song Section Cropper state (allows any 8s to 30s section of song)
  // Default to the famous chorus of Kocee "We Di Go Na Go" (0:42 — 0:58 • 16s selected)
  const [clipStart, setClipStart] = useState<number>(42)
  const [clipEnd, setClipEnd] = useState<number>(58)

  // 2-Character Selection
  const [characterA, setCharacterA] = useState<'tantie' | 'mboa_boy' | 'pa_buea'>('tantie')
  const [characterB, setCharacterB] = useState<'tantie' | 'mboa_boy' | 'pa_buea' | 'none'>('mboa_boy')

  // Active Scene in the Scene Timeline
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0)

  // Initialize Timeline with the first Story Template ("The Unexpected Message") mapped to 0:42 - 0:58
  const [timelineBlocks, setTimelineBlocks] = useState<MoveBlock[]>(() => {
    return distributeCroppedWindowToScenes(42, 58, STORY_TEMPLATES[0].scenes)
  })

  // Selected story template badge indicator
  const [activeTemplateId, setActiveTemplateId] = useState<string>('unexpected_message')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Scrubber container ref for smooth seeking
  const scrubberRef = useRef<HTMLInputElement>(null)

  // Load active challenges & songs, guaranteeing Kocee is at index 0 and selected
  useEffect(() => {
    let mounted = true
    const initStudio = async () => {
      setLoading(true)
      try {
        const [chData] = await Promise.all([
          fetchActiveChallenges(),
          fetchTrendingSongs(),
        ])
        if (!mounted) return

        // Prepend Kocee demo challenge so it's always available and selected by default
        const mergedChallenges: Challenge[] = [
          KOCEE_DEMO_CHALLENGE,
          ...chData.filter(
            (c) =>
              c.id !== KOCEE_DEMO_CHALLENGE.id &&
              c.song?.title !== KOCEE_DEMO_SONG.title
          ),
        ]
        setChallenges(mergedChallenges)
        setSelectedChallenge(KOCEE_DEMO_CHALLENGE)
        loadSong(KOCEE_DEMO_SONG, 42)
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
  }, [loadSong])

  // Current playing song & BPM
  const activeBpm = selectedChallenge?.song?.bpm || currentSong?.bpm || 115

  // Highlighted block in real time from <audio>.currentTime
  const currentHighlightedBlockIndex = useMemo(() => {
    const foundIdx = timelineBlocks.findIndex(
      (b) => currentTime >= b.start && currentTime < b.end
    )
    return foundIdx !== -1 ? foundIdx : 0
  }, [timelineBlocks, currentTime])

  // Active scene being edited
  const activeScene = timelineBlocks[activeSceneIndex] || timelineBlocks[0]

  // Update current scene field
  const updateActiveScene = (updates: Partial<MoveBlock>) => {
    setTimelineBlocks((prev) =>
      prev.map((block, idx) => (idx === activeSceneIndex ? { ...block, ...updates } : block))
    )
  }

  // 1-Click Apply Story Template (automatically distributed over current cropped slice)
  const handleApplyTemplate = (template: StoryTemplate) => {
    setActiveTemplateId(template.id)
    setCharacterA(template.characterAId)
    setCharacterB(template.characterBId || 'none')
    setTimelineBlocks(distributeCroppedWindowToScenes(clipStart, clipEnd, template.scenes))
    setActiveSceneIndex(0)
    seek(clipStart)
  }

  // Adjust song crop range (enforces 8s to 30s window, auto-divides across story scenes)
  const handleCropChange = (newStart: number, newEnd: number) => {
    let clampedStart = Math.max(0, Math.min(newStart, fullSongDuration - 8))
    let clampedEnd = Math.max(clampedStart + 8, Math.min(newEnd, fullSongDuration))

    // Enforce max 30s section limit
    if (clampedEnd - clampedStart > 30) {
      if (newStart !== clipStart) {
        clampedEnd = clampedStart + 30
      } else {
        clampedStart = clampedEnd - 30
      }
    }

    setClipStart(clampedStart)
    setClipEnd(clampedEnd)

    // Automatically divide cropped window equally across story scenes
    setTimelineBlocks((prev) => distributeCroppedWindowToScenes(clampedStart, clampedEnd, prev))

    if (currentTime < clampedStart || currentTime >= clampedEnd) {
      seek(clampedStart)
    }
  }

  // Preview only from clipStart to clipEnd
  const handlePreviewCut = () => {
    const targetSong = selectedChallenge?.song || currentSong || KOCEE_DEMO_SONG
    playSong(targetSong, clipStart)
  }

  // Select Scene from bottom Scene Timeline
  const handleSelectScene = (idx: number) => {
    setActiveSceneIndex(idx)
    const targetScene = timelineBlocks[idx]
    if (targetScene) {
      seek(targetScene.start)
    }
  }

  // Transport toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseSong()
    } else {
      const songToPlay = selectedChallenge?.song || currentSong || KOCEE_DEMO_SONG
      if (currentTime < clipStart || currentTime >= clipEnd) {
        playSong(songToPlay, clipStart)
      } else {
        playSong(songToPlay, currentTime)
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

    // Attach charA_id and charB_id to all scene blocks so playback mode is 100% rich
    const richMovesTimeline = timelineBlocks.map((b) => ({
      ...b,
      charA_id: characterA,
      charB_id: characterB !== 'none' ? characterB : undefined,
      action: b.charA_action || b.action || 'approach',
    }))

    const firstCaption =
      timelineBlocks[0]?.dialogueA ||
      timelineBlocks[0]?.dialogueB ||
      'Dis Beat Sweet! 🔥'

    setSubmitting(true)
    try {
      await submitCreation(
        {
          challenge_id: selectedChallenge.id,
          character_id: characterA,
          moves_timeline: richMovesTimeline,
          caption: firstCaption,
        },
        token
      )

      setSubmitSuccess(true)
      setTimeout(() => {
        onNavigateTab('feed')
      }, 1000)
    } catch (err: any) {
      console.error('Submission failed:', err)
      setSubmitError(err?.message || 'Failed to submit creation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 w-full pb-24">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & 1-CLICK STORY TEMPLATES BAR */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#536D56]/20 border border-[#536D56]/40 text-[#8FA993] text-xs font-semibold uppercase tracking-wider mb-2">
              <span>🎭 Animation Studio Pro</span>
              <span>·</span>
              <span>Interactive Storytelling</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Create Your Animated Story
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Direct 2-character Cameroonian stories, comic dialogue, moving backgrounds, and real sound effects.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-neutral-900 border border-[#536D56]/40 text-[#8FA993] flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>60fps GPU Engine</span>
            </span>
          </div>
        </div>

        {/* 3 PREDEFINED 1-CLICK STORY TEMPLATES */}
        <div className="p-4 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>1-Click Story Templates</span>
              <span className="text-[#FACC15]">⚡</span>
            </label>
            <span className="text-[10px] text-neutral-400">
              Instant 4-scene presets
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {STORY_TEMPLATES.map((tmpl) => {
              const isSelected = activeTemplateId === tmpl.id
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#536D56]/30 border-[#F43F5E] shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[1.01]'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-2xl p-2 rounded-xl bg-neutral-800 shrink-0">
                    {tmpl.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white truncate">
                        {tmpl.title}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#FACC15]/20 text-[#FACC15] shrink-0">
                        {tmpl.genre}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">
                      {tmpl.subtitle}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN STUDIO GRID (Stage Preview & Controls) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: LIVE STAGE PREVIEW & TRANSPORT (lg:col-span-6) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-4 z-10">
          {/* Reusable StagePlayer Live Component */}
          <div className="relative rounded-3xl overflow-hidden border border-[#536D56]/60 shadow-2xl bg-black">
            <StagePlayer
              characterId={characterA}
              characterAId={characterA}
              characterBId={characterB !== 'none' ? characterB : null}
              movesTimeline={timelineBlocks}
              bpm={activeBpm}
              currentTime={currentTime}
              isPlaying={isPlaying}
              aspectRatio="aspect-[16/11] sm:aspect-[16/10]"
              mode="studio"
              audioElement={audioElement}
              onTogglePlay={handleTogglePlay}
            />
          </div>

          {/* Audio Transport Scrubber Bar */}
          <div className="p-4 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
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

            {/* Scrubber Range Slider (Cropped Section Scrubber) */}
            <div className="space-y-1">
              <input
                ref={scrubberRef}
                type="range"
                min={clipStart}
                max={clipEnd}
                step={0.1}
                value={Math.max(clipStart, Math.min(clipEnd, currentTime))}
                onChange={(e) => handleScrub(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#F43F5E] focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span>{formatTime(currentTime)} ({(Math.max(0, currentTime - clipStart)).toFixed(1)}s)</span>
                <span className="text-[#8FA993] font-bold">
                  Scene #{currentHighlightedBlockIndex + 1}: {timelineBlocks[currentHighlightedBlockIndex]?.charA_action?.toUpperCase() || 'APPROACH'}
                </span>
                <span>{formatTime(clipEnd)}</span>
              </div>
            </div>

            {/* Transport Buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => seek(clipStart)}
                  className="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition active:scale-95 cursor-pointer shadow"
                  title="Restart to Beginning of Cropped Cut"
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
                      <span>PAUSE STORY</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>PLAY STORY</span>
                    </>
                  )}
                </button>
              </div>

              {/* SFX Quick Test Button */}
              {activeScene?.sfx && activeScene.sfx !== 'none' && (
                <button
                  type="button"
                  onClick={() => playSFX(activeScene.sfx as StorySFX)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-[#FACC15] border border-neutral-700 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  title="Test Scene Sound Effect"
                >
                  <span>🔊</span>
                  <span>SFX: {activeScene.sfx}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: SCENE EDITOR & CASTING (lg:col-span-6) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* 1. Song / Challenge Selector */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Challenge Song</span>
                <span className="text-[#FACC15]">★</span>
              </label>
              <span className="text-[10px] text-neutral-400">
                {challenges.length} active contests
              </span>
            </div>

            <div className="relative">
              <select
                disabled={loading}
                value={selectedChallenge?.id || ''}
                onChange={(e) => {
                  const found = challenges.find((c) => c.id === e.target.value)
                  if (found) {
                    setSelectedChallenge(found)
                    if (found.song) {
                      loadSong(found.song, clipStart)
                      if (isPlaying) {
                        playSong(found.song, clipStart)
                      }
                    }
                  }
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-[#536D56] cursor-pointer appearance-none disabled:opacity-60"
              >
                {loading && <option value="">Loading challenges...</option>}
                {challenges.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.song?.title || 'Unknown Track'} — {ch.song?.genre || 'Afropop'} ({ch.song?.bpm || 115} BPM)
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                ▼
              </div>
            </div>
          </div>

          {/* 1.5 Compact Song Section Cropper Bar (FR-20, FR-22) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#121212] border border-[#536D56]/50 shadow-xl space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">✂️</span>
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Crop Song Section
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#536D56]/30 text-[#8FA993] border border-[#536D56]/50 font-semibold">
                  Chorus / Slice
                </span>
              </div>

              {/* Time window display (e.g. 0:42 — 0:58 • 16s selected) */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-mono font-black text-[#FACC15] bg-neutral-900 px-3 py-1 rounded-xl border border-neutral-800 shadow-inner">
                  {formatTime(clipStart)} — {formatTime(clipEnd)} • {Math.round(clipEnd - clipStart)}s selected
                </span>
              </div>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-neutral-400 font-semibold mr-1">Presets:</span>
              {[
                { label: '🔥 Chorus (Kocee)', start: 42, end: 58 },
                { label: '⚡ Intro', start: 0, end: 16 },
                { label: '🎶 Hook 2', start: 72, end: 92 },
                { label: '💥 Outro', start: 120, end: 140 },
              ].map((p, pIdx) => {
                const isActive = clipStart === p.start && clipEnd === p.end
                return (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleCropChange(p.start, p.end)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition active:scale-95 cursor-pointer border ${
                      isActive
                        ? 'bg-[#F43F5E] text-white border-[#F43F5E] shadow'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            {/* Visual Audio Waveform Scrubber */}
            <div className="relative pt-2 pb-1">
              {/* Waveform Bars Container */}
              <div className="relative h-14 w-full bg-neutral-950/80 rounded-2xl p-2.5 flex items-center justify-between gap-1 overflow-hidden border border-neutral-800">
                {WAVEFORM_BARS.map((height, i) => {
                  const barPct = (i / (WAVEFORM_BARS.length - 1)) * 100
                  const startPct = (clipStart / fullSongDuration) * 100
                  const endPct = (clipEnd / fullSongDuration) * 100
                  const inWindow = barPct >= startPct && barPct <= endPct

                  return (
                    <div
                      key={i}
                      className="flex-1 flex items-center justify-center h-full"
                    >
                      <div
                        className={`w-full max-w-[4px] rounded-full transition-all duration-150 ${
                          inWindow
                            ? 'bg-gradient-to-t from-[#536D56] via-[#FACC15] to-[#F43F5E] opacity-95 shadow-[0_0_6px_rgba(250,204,21,0.4)]'
                            : 'bg-neutral-700 opacity-25'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  )
                })}

                {/* Shaded Left Inactive Region */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none transition-all duration-75"
                  style={{ width: `${(clipStart / fullSongDuration) * 100}%` }}
                />

                {/* Shaded Right Inactive Region */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none transition-all duration-75"
                  style={{ width: `${100 - (clipEnd / fullSongDuration) * 100}%` }}
                />

                {/* Live Playhead Needle Marker */}
                {currentTime >= 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#FACC15] shadow-[0_0_8px_#FACC15] pointer-events-none z-20 transition-all duration-75"
                    style={{ left: `${Math.min(100, Math.max(0, (currentTime / fullSongDuration) * 100))}%` }}
                  />
                )}
              </div>

              {/* Cropper Sliders Container */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                {/* Start Time Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-300">
                    <span className="font-bold flex items-center gap-1 text-[#8FA993]">
                      <span>▶</span> Start Cut:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCropChange(clipStart - 1, clipEnd)}
                        className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-700 cursor-pointer"
                      >
                        -1s
                      </button>
                      <span className="font-bold text-white bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                        {formatTime(clipStart)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCropChange(clipStart + 1, clipEnd)}
                        className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-700 cursor-pointer"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, clipEnd - 8)}
                    step={1}
                    value={clipStart}
                    onChange={(e) => handleCropChange(parseFloat(e.target.value), clipEnd)}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#536D56]"
                  />
                </div>

                {/* End Time Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-300">
                    <span className="font-bold flex items-center gap-1 text-[#F43F5E]">
                      <span>⏹</span> End Cut:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCropChange(clipStart, clipEnd - 1)}
                        className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-700 cursor-pointer"
                      >
                        -1s
                      </button>
                      <span className="font-bold text-white bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                        {formatTime(clipEnd)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCropChange(clipStart, clipEnd + 1)}
                        className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 border border-neutral-700 cursor-pointer"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={clipStart + 8}
                    max={Math.min(fullSongDuration, clipStart + 30)}
                    step={1}
                    value={clipEnd}
                    onChange={(e) => handleCropChange(clipStart, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#F43F5E]"
                  />
                </div>
              </div>
            </div>

            {/* Preview Cut Action Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
              <span className="text-[10px] text-neutral-400">
                Min 8s • Max 30s • Auto-divided into 4 scenes
              </span>

              <button
                type="button"
                onClick={handlePreviewCut}
                className="py-1.5 px-4 rounded-xl bg-[#536D56] hover:bg-[#607d64] text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
              >
                <span>▶</span>
                <span>Preview Cut</span>
              </button>
            </div>
          </div>

          {/* 2. Character Casting (Character A & Character B) */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>2. Character Casting (2-Actor Stage)</span>
                <span className="text-[#FACC15]">✦</span>
              </label>
              <span className="text-[10px] text-[#8FA993] font-mono">
                Open Peeps 2D
              </span>
            </div>

            {/* Character A Picker (Left) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-neutral-300">
                Lead Actor (Left):
              </span>
              <div className="grid grid-cols-3 gap-2">
                {CHARACTERS.map((char) => {
                  const isSelected = characterA === char.id
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => setCharacterA(char.id)}
                      className={`flex flex-col items-center text-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#536D56]/30 border-[#F43F5E] shadow'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden mb-1.5">
                        <CharacterAvatarCircle
                          characterId={char.id}
                          displayName={char.displayName}
                          fallbackEmoji={char.avatar}
                        />
                      </div>
                      <span className="text-xs font-black text-white leading-tight">
                        {char.displayName}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Character B Picker (Right / Optional Companion) */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-300">
                  Companion Actor (Right):
                </span>
                <span className="text-[10px] text-neutral-400">
                  Optional 2nd Actor
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setCharacterB('none')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                    characterB === 'none'
                      ? 'bg-neutral-800 border-[#F43F5E] text-[#F43F5E]'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="text-xl mb-1">✖️</span>
                  <span className="text-[10px] font-bold">Solo Mode</span>
                </button>
                {CHARACTERS.map((char) => {
                  const isSelected = characterB === char.id
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => setCharacterB(char.id)}
                      className={`flex flex-col items-center text-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#536D56]/30 border-[#F43F5E] shadow'
                          : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden mb-1">
                        <CharacterAvatarCircle
                          characterId={char.id}
                          displayName={char.displayName}
                          fallbackEmoji={char.avatar}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white truncate w-full">
                        {char.displayName}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 3. Scene Action & Dialogue Editor (for Active Scene) */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>3. Edit Scene #{activeSceneIndex + 1} Actions & Dialogue</span>
                <span className="text-[#FACC15]">🎬</span>
              </label>
              <span className="text-[10px] font-mono text-[#FACC15] bg-black/40 px-2 py-0.5 rounded-full">
                {activeScene.start}s – {activeScene.end}s
              </span>
            </div>

            {/* Comic Dialogue Input for Character A */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{characterA.toUpperCase()} Dialogue (Top-Left Bubble):</span>
              </label>
              <input
                type="text"
                value={activeScene.dialogueA || ''}
                onChange={(e) => updateActiveScene({ dialogueA: e.target.value })}
                placeholder="Enter speech in English, French or Pidgin..."
                maxLength={80}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#536D56]"
              />
            </div>

            {/* Comic Dialogue Input for Character B (if active) */}
            {characterB !== 'none' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>{characterB.toUpperCase()} Dialogue (Top-Right Bubble):</span>
                </label>
                <input
                  type="text"
                  value={activeScene.dialogueB || ''}
                  onChange={(e) => updateActiveScene({ dialogueB: e.target.value })}
                  placeholder="Enter speech in English, French or Pidgin..."
                  maxLength={80}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#536D56]"
                />
              </div>
            )}

            {/* 12 Story Actions for Character A */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-300">
                {characterA.toUpperCase()} Action:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {STORY_ACTIONS.map((act) => {
                  const isSelected = (activeScene.charA_action || activeScene.action) === act.id
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => updateActiveScene({ charA_action: act.id, action: act.id })}
                      className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#536D56] text-white border-[#F43F5E] shadow font-bold'
                          : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <span>{act.icon}</span>
                      <span className="truncate">{act.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 12 Story Actions for Character B (if active) */}
            {characterB !== 'none' && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <span className="text-[11px] font-bold text-neutral-300">
                  {characterB.toUpperCase()} Action:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {STORY_ACTIONS.map((act) => {
                    const isSelected = activeScene.charB_action === act.id
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => updateActiveScene({ charB_action: act.id })}
                        className={`p-2 rounded-xl text-left border text-xs transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#536D56] text-white border-[#F43F5E] shadow font-bold'
                            : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <span>{act.icon}</span>
                        <span className="truncate">{act.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. Environment, Parallax Motion, Props & SFX Editor */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-4">
            <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>4. Environment, Camera, Prop & SFX</span>
              <span className="text-[#FACC15]">🌄</span>
            </label>

            {/* Background Environments */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-neutral-300">
                Illustrated Setting:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STORY_BACKGROUNDS.slice(0, 4).map((bg) => {
                  const isSelected = (activeScene.bg || 'street_buea') === bg.id
                  return (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => updateActiveScene({ bg: bg.id })}
                      className={`p-2 rounded-2xl border text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#536D56]/30 border-[#F43F5E] text-white shadow'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{bg.icon}</div>
                      <div className="text-[10px] font-bold truncate">{bg.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Parallax Motion & Camera Zoom */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-300">
                Camera Motion:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BG_MOTIONS.map((m) => {
                  const isSelected = (activeScene.bgMotion || 'static') === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateActiveScene({ bgMotion: m.id })}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-[#536D56] text-white border-[#F43F5E] font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="mr-1">{m.icon}</span>
                      <span className="text-[10px]">{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Scene Prop & Sound Effect Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
              {/* Scene Prop */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-300">
                  Scene Prop:
                </span>
                <select
                  value={activeScene.prop || 'none'}
                  onChange={(e) => updateActiveScene({ prop: e.target.value as StoryProp })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56] cursor-pointer"
                >
                  {STORY_PROPS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sound Effect (SFX) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-300">
                  Story Sound Effect (SFX):
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={activeScene.sfx || 'none'}
                    onChange={(e) => {
                      const val = e.target.value as StorySFX
                      updateActiveScene({ sfx: val })
                      if (val !== 'none') playSFX(val)
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56] cursor-pointer"
                  >
                    {STORY_SFX_LIST.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Feedback & Submit Button */}
          {submitError && (
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <span>🎉</span>
              <span>Story posted successfully! Redirecting to feed...</span>
            </div>
          )}

          <button
            type="button"
            disabled={submitting || submitSuccess}
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#E11D48] to-[#BE123C] hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-2xl active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Publishing Story to Challenge...</span>
              </>
            ) : submitSuccess ? (
              <>
                <span>✓</span>
                <span>Story Published!</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Submit Story to Challenge</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BOTTOM SCENE TIMELINE BAR (Visual Scene Cards) */}
      {/* ========================================================= */}
      <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>Scene Timeline ({timelineBlocks.length} Scenes)</span>
            <span className="text-[#FACC15]">🎬</span>
          </label>
          <span className="text-[10px] text-neutral-400">
            Click any scene to edit dialogue, moves, environment & SFX
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {timelineBlocks.map((block, idx) => {
            const isEditing = activeSceneIndex === idx
            const isLive = currentHighlightedBlockIndex === idx && isPlaying
            const bgInfo = STORY_BACKGROUNDS.find((b) => b.id === (block.bg || 'street_buea'))
            const actInfo = STORY_ACTIONS.find((a) => a.id === (block.charA_action || block.action))
            const sfxInfo = STORY_SFX_LIST.find((s) => s.id === block.sfx)

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectScene(idx)}
                className={`relative flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isEditing
                    ? 'bg-[#536D56]/30 border-[#F43F5E] shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[1.02]'
                    : isLive
                    ? 'bg-neutral-800 border-[#FACC15]'
                    : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Live Playback Indicator Pill */}
                {isLive && (
                  <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-[#FACC15] text-neutral-950 font-black text-[9px] uppercase tracking-wider shadow">
                    PLAYING
                  </span>
                )}

                <div className="flex items-center justify-between text-xs font-black text-white">
                  <span>Scene {idx + 1}</span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {block.start}s – {block.end}s
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-[#8FA993] font-semibold mt-1">
                  <span>{bgInfo?.icon || '🌄'}</span>
                  <span className="truncate">{bgInfo?.label || 'Buea Street'}</span>
                </div>

                <div className="text-[11px] font-bold text-white mt-1 truncate">
                  {actInfo?.icon} {actInfo?.label || 'Approach'}
                  {block.charB_action && block.charB_action !== 'none' && (
                    <span className="text-[#A1A1AA] text-[10px] ml-1">
                      + {block.charB_action}
                    </span>
                  )}
                </div>

                {/* Dialogue Preview Snippet */}
                <p className="text-[9px] text-neutral-400 mt-1 line-clamp-1 italic">
                  "{block.dialogueA || block.dialogueB || 'No dialogue'}"
                </p>

                {/* SFX / Prop Badge */}
                <div className="flex items-center gap-1 mt-2">
                  {sfxInfo && sfxInfo.id !== 'none' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#FACC15]/20 text-[#FACC15] font-mono font-bold flex items-center gap-0.5">
                      <span>{sfxInfo.icon}</span>
                      <span>{sfxInfo.label}</span>
                    </span>
                  )}
                  {block.prop && block.prop !== 'none' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-mono">
                      {block.prop}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
