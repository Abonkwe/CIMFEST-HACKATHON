import React, { useState, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Challenge, ComicExpression, MoveBlock, SceneCharacter, StoryProp, StorySFX } from '../types'
import { fetchActiveChallenges, fetchTrendingSongs, submitCreation, uploadCreationVideo } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { resolveClipUrl } from '../lib/audioUtils'
import { StagePlayer } from '../components/StagePlayer'
import { ComicCharacter, COMIC_EXPRESSIONS, expressionFromAction } from '../components/ComicCharacter'
import {
  STORY_TEMPLATES,
  COMIC_STARTER_CHIPS,
  STORY_BACKGROUNDS,
  BG_MOTIONS,
  STORY_PROPS,
  STORY_SFX_LIST,
  KOCEE_DEMO_SONG,
  KOCEE_DEMO_CHALLENGE,
  type StoryTemplate,
} from '../lib/storyTemplates'

interface StudioPageProps {
  challengeId?: string | null
  onNavigateTab: (tab: string, params?: { challenge_id?: string | null; song_id?: string | null }) => void
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

// Circular Character Avatar rendering ComicCharacter SVG
const CharacterAvatarCircle: React.FC<{
  characterId: string
  expression?: ComicExpression | string
}> = ({ characterId, expression = 'happy' }) => {
    return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-neutral-700/50 to-neutral-800 flex items-end justify-center">
      <ComicCharacter
        characterId={characterId}
        expression={expression}
        className="w-full h-full scale-[1.25] translate-y-1.5 pointer-events-none select-none"
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
  const duration = Math.max(end - start, 1)
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

export const StudioPage: React.FC<StudioPageProps> = ({ challengeId, onNavigateTab }) => {
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

  // Song duration read from <audio onLoadedMetadata={...}> (fallback to song.duration_sec || 30)
  const [loadedSongDuration, setLoadedSongDuration] = useState<number | null>(null)
  const songDuration = Math.max(
    4,
    Math.floor(
      loadedSongDuration ||
        (audioDuration && audioDuration > 0 ? audioDuration : 0) ||
        selectedChallenge?.song?.duration_sec ||
        30
    )
  )

  // Start Spot + Play Duration state (default 0:42 -> 0:58, 16s for Kocee)
  const [clipStart, setClipStart] = useState<number>(42)
  const [clipEnd, setClipEnd] = useState<number>(58)
  const startSec = clipStart
  const maxDuration = Math.max(4, Math.floor(songDuration - startSec))
  const playDuration = Math.max(1, Math.min(Math.round(clipEnd - clipStart), maxDuration))

  // 2-Character Default Casting (per-scene cast overrides these cleanly)
  const [characterA, setCharacterA] = useState<'tantie' | 'mboa_boy' | 'pa_buea'>('mboa_boy')
  const [characterB, setCharacterB] = useState<'tantie' | 'mboa_boy' | 'pa_buea' | 'none'>('tantie')

  // Active Scene in the Scene Timeline
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0)

  // Initialize Timeline with the first Story Template ("Friendly Catch-Up") mapped to 0:42 - 0:58
  const [timelineBlocks, setTimelineBlocks] = useState<MoveBlock[]>(() => {
    return distributeCroppedWindowToScenes(42, 58, STORY_TEMPLATES[0].scenes)
  })

  // Selected story template badge indicator
  const [activeTemplateId, setActiveTemplateId] = useState<string>('friendly_catch_up')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [awaitingAuthToSubmit, setAwaitingAuthToSubmit] = useState(false)

  // Scrubber container ref for smooth seeking
  const scrubberRef = useRef<HTMLInputElement>(null)

  // Additive Studio Mode: 'comic' (default) vs 'video' (Dance Challenge / Music Cover)
  const [studioMode, setStudioMode] = useState<'comic' | 'video'>('comic')
  const [entryType, setEntryType] = useState<'dance' | 'cover'>('dance')
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoFilename, setVideoFilename] = useState<string>('creation.webm')
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [videoDurationSec, setVideoDurationSec] = useState<number>(16)
  const [videoCaption, setVideoCaption] = useState<string>('')
  const [videoError, setVideoError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordCountdown, setRecordCountdown] = useState<number>(0)
  const [videoPreviewPlaying, setVideoPreviewPlaying] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoSubmitSuccess, setVideoSubmitSuccess] = useState(false)

  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup camera stream & preview object URL on unmount
  useEffect(() => {
      return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    }
  }, [videoPreviewUrl])

  // Load active challenges & songs on mount (StrictMode-safe: only locks after state updates)
  useEffect(() => {
    let mounted = true
    const initStudio = async () => {
      setLoading(true)
      try {
        const [chData, songsData] = await Promise.all([
          fetchActiveChallenges(),
          fetchTrendingSongs(),
        ])
        if (!mounted) return

        // Prepend Kocee demo challenge so it's always available
        const mergedChallenges: Challenge[] = [
          KOCEE_DEMO_CHALLENGE,
          ...chData.filter(
            (c) =>
              c.id !== KOCEE_DEMO_CHALLENGE.id &&
              c.song?.title !== KOCEE_DEMO_SONG.title
          ),
        ]

        // Also allow picking any trending song that doesn't yet have a dedicated challenge
        const challengeSongIds = new Set(mergedChallenges.map((c) => c.song_id))
        for (const song of songsData) {
          if (!challengeSongIds.has(song.id)) {
            mergedChallenges.push({
              id: mergedChallenges[0].id,
              song_id: song.id,
              song,
              status: 'active',
              ends_at: mergedChallenges[0].ends_at,
            })
            challengeSongIds.add(song.id)
          }
        }

        setChallenges(mergedChallenges)

        // Check if user clicked "Join Challenge" (via challenge_id) or "Animate" on a song
        const urlChallengeId =
          challengeId ||
          (typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('challenge_id')
            : null)
        const requestedSongId =
          (typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('song_id')
            : null) || localStorage.getItem('camvibe_studio_song_id')
        if (localStorage.getItem('camvibe_studio_song_id')) {
          localStorage.removeItem('camvibe_studio_song_id')
        }

        const matchedByChallenge = urlChallengeId
          ? mergedChallenges.find((c) => c.id === urlChallengeId)
          : null
        const matchedBySong = requestedSongId
          ? mergedChallenges.find((c) => c.song_id === requestedSongId || c.song?.id === requestedSongId)
          : null

        const initialChallenge = matchedByChallenge || matchedBySong || KOCEE_DEMO_CHALLENGE
        const initialSong = initialChallenge.song || KOCEE_DEMO_SONG
        const initialStart = initialSong.id === KOCEE_DEMO_SONG.id ? 42 : 0
        const initialEnd =
          initialSong.id === KOCEE_DEMO_SONG.id
            ? 58
            : Math.min(Math.max(initialSong.duration_sec || 20, 12), 24)

        setSelectedChallenge(initialChallenge)
        setClipStart(initialStart)
        setClipEnd(initialEnd)
        setTimelineBlocks((prev) => distributeCroppedWindowToScenes(initialStart, initialEnd, prev))
        loadSong(initialSong, initialStart)
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

  // Sync if challengeId prop changes after initial mount
  useEffect(() => {
    if (!challengeId || challenges.length === 0) return
    const matched = challenges.find((c) => c.id === challengeId)
    if (matched && matched.id !== selectedChallenge?.id) {
      const nextSong = matched.song || KOCEE_DEMO_SONG
      const nextStart = nextSong.id === KOCEE_DEMO_SONG.id ? 42 : 0
      const nextEnd =
        nextSong.id === KOCEE_DEMO_SONG.id
          ? 58
          : Math.min(Math.max(nextSong.duration_sec || 20, 12), 24)
      setSelectedChallenge(matched)
      setClipStart(nextStart)
      setClipEnd(nextEnd)
      setTimelineBlocks((prev) => distributeCroppedWindowToScenes(nextStart, nextEnd, prev))
      loadSong(nextSong, nextStart)
    }
  }, [challengeId, challenges, selectedChallenge?.id, loadSong])

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

  // Dynamic Scene Count Controls (2 to 8 scenes)
  const handleSceneCountChange = (targetCount: number) => {
    const clamped = Math.max(2, Math.min(8, targetCount))
    setTimelineBlocks((prev) => {
      if (clamped === prev.length) return prev
      let next = [...prev]
      if (clamped > prev.length) {
        while (next.length < clamped) {
          const refScene = next[next.length - 1] || prev[0]
          next.push({
            start: 0,
            end: 0,
            action: 'wave_happy',
            charA_id: refScene?.charA_id || characterA,
            charB_id: refScene?.charB_id !== undefined ? refScene.charB_id : (characterB !== 'none' ? characterB : undefined),
            charA_expression: 'happy',
            charB_expression: 'happy',
            bg: refScene?.bg || 'street_buea',
            bgMotion: 'static',
            prop: 'none',
            sfx: 'none',
            dialogueA: '',
            dialogueB: '',
          })
        }
      } else {
        next = next.slice(0, clamped)
      }
      return distributeCroppedWindowToScenes(clipStart, clipEnd, next)
    })
    setActiveSceneIndex((idx) => Math.min(idx, clamped - 1))
  }

  // Delete a specific scene (minimum 2 scenes)
  const handleDeleteScene = (idxToDelete: number) => {
    if (timelineBlocks.length <= 2) return
    setTimelineBlocks((prev) => {
      const filtered = prev.filter((_, idx) => idx !== idxToDelete)
      return distributeCroppedWindowToScenes(clipStart, clipEnd, filtered)
    })
    setActiveSceneIndex((idx) => {
      if (idx > idxToDelete) return idx - 1
      return Math.min(idx, timelineBlocks.length - 2)
    })
  }

  // Tweak individual scene duration (+/- 0.5s) while keeping total [clipStart, clipEnd] intact
  const handleAdjustSceneDuration = (delta: number) => {
    if (timelineBlocks.length < 2) return
    const minLen = 1.5
    setTimelineBlocks((prev) => {
      const next = prev.map((b) => ({ ...b }))
      const idx = activeSceneIndex
      const isLast = idx === next.length - 1
      const neighborIdx = isLast ? idx - 1 : idx + 1
      const curLen = next[idx].end - next[idx].start
      const neighborLen = next[neighborIdx].end - next[neighborIdx].start

      if (curLen + delta < minLen || neighborLen - delta < minLen) {
        return prev
      }

      if (isLast) {
        next[idx].start = Number((next[idx].start - delta).toFixed(2))
        next[neighborIdx].end = next[idx].start
      } else {
        next[idx].end = Number((next[idx].end + delta).toFixed(2))
        next[neighborIdx].start = next[idx].end
      }
      return next
    })
  }

  // Reset all scenes to equal duration within [clipStart, clipEnd]
  const handleResetEvenSplit = () => {
    setTimelineBlocks((prev) => distributeCroppedWindowToScenes(clipStart, clipEnd, prev))
  }

  // Start Spot change: clamps startSec to [0, songDuration - 4] and auto-reduces playDuration if near end
  const handleStartSpotChange = (newStart: number) => {
    const maxStart = Math.max(0, Math.floor(songDuration - 4))
    const clampedStart = Math.max(0, Math.min(Math.round(newStart), maxStart))
    const availMax = Math.max(4, Math.floor(songDuration - clampedStart))
    const clampedDur = Math.min(playDuration, availMax)
    const nextEnd = clampedStart + clampedDur

    setClipStart(clampedStart)
    setClipEnd(nextEnd)
    setTimelineBlocks((prev) => distributeCroppedWindowToScenes(clampedStart, nextEnd, prev))

    if (currentTime < clampedStart || currentTime >= nextEnd) {
      seek(clampedStart)
    }
  }

  // Play Duration change: strictly caps startSec + playDuration <= songDuration
  const handlePlayDurationChange = (newDur: number) => {
    const availMax = Math.max(4, Math.floor(songDuration - startSec))
    const sliderMax = Math.min(30, availMax)
    const minDur = Math.min(4, sliderMax)
    const clampedDur = Math.max(minDur, Math.min(Math.round(newDur), sliderMax))
    const nextEnd = startSec + clampedDur

    setClipEnd(nextEnd)
    setTimelineBlocks((prev) => distributeCroppedWindowToScenes(startSec, nextEnd, prev))

    if (currentTime < startSec || currentTime >= nextEnd) {
      seek(startSec)
    }
  }

  // 1-Click Apply Story Template (automatically distributed over current [startSec, clipEnd])
  const handleApplyTemplate = (template: StoryTemplate) => {
    setActiveTemplateId(template.id)
    setCharacterA(template.characterAId)
    setCharacterB(template.characterBId || 'none')
    setTimelineBlocks(distributeCroppedWindowToScenes(startSec, clipEnd, template.scenes))
    setActiveSceneIndex(0)
    seek(startSec)
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
      setAwaitingAuthToSubmit(true)
      openLoginModal('Create a free account to publish your animation')
      return
    }

    setAwaitingAuthToSubmit(false)

    if (!selectedChallenge) {
      setSubmitError('Please select an active challenge first.')
      return
    }

    // Preserve per-scene characters, expressions, dialogue, and backgrounds in moves_timeline
    const richMovesTimeline = timelineBlocks.map((b) => ({
      ...b,
      charA_id: b.charA_id || characterA,
      charB_id: b.charB_id !== undefined ? b.charB_id : (characterB !== 'none' ? characterB : undefined),
      charA_expression: b.charA_expression || expressionFromAction(b.charA_action || b.action),
      charB_expression: b.charB_expression || expressionFromAction(b.charB_action),
      action: b.charA_expression || b.charA_action || b.action || 'happy',
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
      const submittedChallengeId = selectedChallenge.id
      setTimeout(() => {
        onNavigateTab('feed', { challenge_id: submittedChallengeId })
      }, 1000)
    } catch (err: any) {
      console.error('Submission failed:', err)
      setSubmitError(err?.message || 'Failed to submit creation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStopRecording = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    pauseSong()
    setIsRecording(false)
  }

  const handleStartRecording = async () => {
    setVideoError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVideoError('Camera recording is not supported in this browser. Please upload a video file instead.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: entryType === 'cover',
      })
      mediaStreamRef.current = stream
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream
        cameraVideoRef.current.play().catch(() => {})
      }

      const chunks: BlobPart[] = []
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      const maxSec = entryType === 'dance' ? playDuration : 30
      const startedAt = Date.now()

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
        if (blob.size > 25 * 1024 * 1024) {
          setVideoError('Recorded video exceeds 25 MB. Try a shorter duration.')
          return
        }
        const elapsed = Math.max(2, Math.min(30, Math.round((Date.now() - startedAt) / 1000)))
        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
        const nextUrl = URL.createObjectURL(blob)
        setVideoBlob(blob)
        setVideoFilename(`camvibe_${entryType}_${Date.now()}.webm`)
        setVideoPreviewUrl(nextUrl)
        setVideoDurationSec(elapsed)
        setVideoPreviewPlaying(false)
      }

      recorder.start(250)
      setIsRecording(true)
      setRecordCountdown(maxSec)

      // In Dance Challenge mode, play the selected challenge song slice while recording
      if (entryType === 'dance') {
        const targetSong = selectedChallenge?.song || currentSong || KOCEE_DEMO_SONG
        playSong(targetSong, startSec)
      } else {
        pauseSong()
      }

      countdownTimerRef.current = setInterval(() => {
        setRecordCountdown((prev) => {
          if (prev <= 1) {
            handleStopRecording()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setVideoError(err?.message || 'Camera permission denied or unavailable.')
    }
  }

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 25 * 1024 * 1024) {
      setVideoError('Video file exceeds the 25 MB limit.')
      return
    }

    const objUrl = URL.createObjectURL(file)
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.src = objUrl
    probe.onloadedmetadata = () => {
      const dur = probe.duration
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 30.5) {
        URL.revokeObjectURL(objUrl)
        setVideoError(`Video is ${Math.round(dur)}s long. Maximum allowed duration is 30s.`)
        return
      }
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
      setVideoBlob(file)
      setVideoFilename(file.name || 'upload.mp4')
      setVideoPreviewUrl(objUrl)
      setVideoDurationSec(dur && isFinite(dur) ? Math.max(2, Math.round(dur)) : playDuration)
      setVideoPreviewPlaying(false)
    }
    probe.onerror = () => {
      URL.revokeObjectURL(objUrl)
      setVideoError('Could not read video file. Please use MP4, WebM, or MOV.')
    }
  }

  const handleToggleVideoPreview = () => {
    const vid = previewVideoRef.current
    if (!vid) return

    if (videoPreviewPlaying) {
      vid.pause()
      if (entryType === 'dance') pauseSong()
      setVideoPreviewPlaying(false)
    } else {
      vid.currentTime = 0
      vid.play().catch(() => {})
      if (entryType === 'dance') {
        const targetSong = selectedChallenge?.song || currentSong || KOCEE_DEMO_SONG
        playSong(targetSong, startSec)
      } else {
        pauseSong()
      }
      setVideoPreviewPlaying(true)
    }
  }

  const handleSubmitVideo = async () => {
    setVideoError(null)
    if (!user || !token) {
      openLoginModal('Sign in to publish your Dance / Music Cover video')
      return
    }
    if (!selectedChallenge) {
      setVideoError('Please select an active challenge first.')
      return
    }
    if (!videoBlob) {
      setVideoError('Please record or upload a video first.')
      return
    }

    setUploadingVideo(true)
    try {
      const { video_url } = await uploadCreationVideo(videoBlob, videoFilename, token)
      const sliceStart = entryType === 'dance' ? startSec : 0
      const sliceEnd =
        entryType === 'dance'
          ? startSec + playDuration
          : Math.max(4, Math.min(30, videoDurationSec || 16))

      await submitCreation(
        {
          challenge_id: selectedChallenge.id,
          character_id: entryType === 'dance' ? 'dance_video' : 'cover_video',
          moves_timeline: [
            {
              start: sliceStart,
              end: sliceEnd,
              action: entryType,
              type: 'video',
              sub_type: entryType,
              video_url,
            } as any,
          ],
          caption:
            videoCaption.trim() ||
            (entryType === 'dance'
              ? 'Check out my Dance Challenge moves! 💃🔥'
              : 'My Music Cover entry! 🎤🇨🇲'),
        },
        token
      )

      setVideoSubmitSuccess(true)
      const submittedChallengeId = selectedChallenge.id
      setTimeout(() => {
        onNavigateTab('feed', { challenge_id: submittedChallengeId })
      }, 1000)
    } catch (err: any) {
      setVideoError(err?.message || 'Failed to upload and submit video.')
    } finally {
      setUploadingVideo(false)
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
              <span>🎨 Comic Storyboard Studio</span>
              <span>·</span>
              <span>SVG Motion-Comic Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Create Your Comic Story
            </h1>
            {selectedChallenge && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#FACC15] text-xs font-bold">
                <span>🏆</span>
                <span>
                  Entering Challenge:{' '}
                  {selectedChallenge.title ||
                    `${selectedChallenge.song?.artist_name || 'CamVibe'} — ${
                      selectedChallenge.song?.title || 'Challenge'
                    }`}
                </span>
              </div>
            )}
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Build multi-scene Afro-pop comic stories with custom SVG expressions, speech bubbles, and synced audio.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-neutral-900 border border-[#536D56]/40 text-[#8FA993] flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Instant SVG Engine</span>
            </span>
          </div>
        </div>

        {/* 2-TAB STUDIO MODE SWITCHER: Comic Story (Default) vs Video (Dance / Music Cover) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#121212] border border-[#536D56]/40 max-w-xl">
          <button
            type="button"
            onClick={() => {
              if (isRecording) handleStopRecording()
              setStudioMode('comic')
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              studioMode === 'comic'
                ? 'bg-[#536D56] text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>🎨</span>
            <span>Comic Story (No Camera)</span>
          </button>
          <button
            type="button"
            onClick={() => setStudioMode('video')}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              studioMode === 'video'
                ? 'bg-gradient-to-r from-[#F43F5E] to-[#E11D48] text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>🎥</span>
            <span>Video (Dance / Music Cover)</span>
          </button>
        </div>
      </div>

        {studioMode === 'video' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Camera / Video Preview Stage */}
            <div className="lg:col-span-6 space-y-4">
              <div className="relative aspect-[16/10] w-full rounded-3xl overflow-hidden bg-black border border-[#536D56]/50 shadow-2xl flex items-center justify-center">
                {isRecording ? (
                  <>
                    <video
                      ref={cameraVideoRef}
                      muted
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover -scale-x-100"
                    />
                    <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black flex items-center gap-2 shadow">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>REC · {recordCountdown}s</span>
                    </div>
                  </>
                ) : videoPreviewUrl ? (
                  <>
                    <video
                      ref={previewVideoRef}
                      src={videoPreviewUrl}
                      playsInline
                      loop
                      muted={entryType === 'dance'}
                      onClick={handleToggleVideoPreview}
                      className="w-full h-full object-cover cursor-pointer"
                    />
                    {!videoPreviewPlaying && (
                      <button
                        type="button"
                        onClick={handleToggleVideoPreview}
                        className="absolute inset-0 bg-black/35 hover:bg-black/20 flex items-center justify-center cursor-pointer transition"
                      >
                        <span className="w-16 h-16 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow-2xl">
                          <svg className="w-8 h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </button>
                    )}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 text-[10px] font-bold text-[#FACC15] border border-white/10">
                      {entryType === 'dance' ? '💃 Synced to Challenge Audio' : '🎤 Live Cover Audio'}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="text-4xl">{entryType === 'dance' ? '💃' : '🎤'}</div>
                    <p className="text-sm font-black text-white">
                      {entryType === 'dance' ? 'Dance Challenge Video' : 'Music Cover Video'}
                    </p>
                    <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                      Upload an MP4/WebM/MOV clip (max 30s, 25 MB) or record directly with your camera.
                    </p>
                  </div>
                )}
              </div>

              {/* Record / Upload Controls */}
              <div className="p-4 rounded-3xl bg-[#121212] border border-[#536D56]/40 flex flex-wrap items-center gap-3">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="flex-1 py-3 px-5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
                  >
                    ⏹ Stop Recording ({recordCountdown}s)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="flex-1 py-3 px-5 rounded-2xl bg-[#F43F5E] hover:bg-[#e11d48] text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
                  >
                    📹 Record with Camera
                  </button>
                )}

                <label className="flex-1 py-3 px-5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-bold text-xs text-center cursor-pointer transition">
                  <span>📁 Upload Video File</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    onChange={handleVideoFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* RIGHT: Style Selector, Song Slice Picker (for Dance) & Submit */}
            <div className="lg:col-span-6 space-y-5">
              {/* Style Selector: Dance Challenge vs Music Cover */}
              <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-3">
                <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  1. Video Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEntryType('dance')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                      entryType === 'dance'
                        ? 'border-[#F43F5E] bg-[#F43F5E]/15'
                        : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-lg mb-1">💃</div>
                    <div className="text-xs font-black text-white">Dance Challenge</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      Mutes mic &amp; syncs to clean challenge song slice.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryType('cover')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                      entryType === 'cover'
                        ? 'border-[#FACC15] bg-[#FACC15]/15'
                        : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-lg mb-1">🎤</div>
                    <div className="text-xs font-black text-white">Music Cover</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      Keeps your live vocal or instrument audio.
                    </div>
                  </button>
                </div>
              </div>

              {/* Challenge Song & Section Picker (reused for Dance Challenge) */}
              <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-4">
                <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider block">
                  2. Challenge Song {entryType === 'dance' ? '& Dance Slice' : ''}
                </label>
                <select
                  disabled={loading}
                  value={selectedChallenge?.song_id || selectedChallenge?.id || ''}
                  onChange={(e) => {
                    const found = challenges.find(
                      (c) => c.song_id === e.target.value || c.id === e.target.value
                    )
                    if (found) {
                      setLoadedSongDuration(null)
                      setSelectedChallenge(found)
                      if (found.song) loadSong(found.song, 0)
                    }
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-[#536D56] cursor-pointer"
                >
                  {challenges.map((ch) => (
                    <option key={ch.song_id || ch.id} value={ch.song_id || ch.id}>
                      {ch.song?.title || 'Unknown Track'} — {ch.song?.genre || 'Afropop'}
                    </option>
                  ))}
                </select>

                {entryType === 'dance' && (
                  <div className="space-y-3 pt-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300 font-bold">
                        Start at <span className="text-emerald-400 font-mono">{formatTime(startSec)}</span>
                      </span>
                      <span className="font-mono font-black text-[#FACC15]">
                        {formatTime(startSec)} → {formatTime(clipEnd)} ({playDuration}s)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, songDuration - 4)}
                      step={1}
                      value={startSec}
                      onChange={(e) => handleStartSpotChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[8, 12, 16, 20, 25, 30].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          disabled={sec > maxDuration}
                          onClick={() => handlePlayDurationChange(sec)}
                          className={`text-[11px] px-2.5 py-1 rounded-full font-bold border transition cursor-pointer ${
                            playDuration === sec
                              ? 'bg-[#FACC15] text-neutral-950 border-[#FACC15]'
                              : 'bg-neutral-900 text-neutral-300 border-neutral-700 disabled:opacity-40'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Caption & Submit */}
              <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-4">
                <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider block">
                  3. Caption &amp; Publish
                </label>
                <input
                  type="text"
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  maxLength={120}
                  placeholder="Add a caption in English, French, or Pidgin..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#536D56]"
                />

                {videoError && (
                  <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
                    ⚠️ {videoError}
                  </div>
                )}

                {videoSubmitSuccess && (
                  <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs">
                    🎉 Video published! Redirecting to feed...
                  </div>
                )}

                <button
                  type="button"
                  disabled={uploadingVideo || videoSubmitSuccess || !videoBlob}
                  onClick={handleSubmitVideo}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F43F5E] via-[#E11D48] to-[#BE123C] hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-2xl transition cursor-pointer disabled:opacity-50"
                >
                  {uploadingVideo
                    ? 'Uploading Video & Publishing...'
                    : videoSubmitSuccess
                    ? '✓ Video Published!'
                    : '🚀 Publish Video Entry'}
                </button>
              </div>
            </div>
          </div>
        ) : (
        <>
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
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => seek(clipStart)}
                  className="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition cursor-pointer shadow"
                  title="Restart to Beginning of Cropped Cut"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                  </svg>
                </motion.button>

                {/* Big Play/Pause Button */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={handleTogglePlay}
                  className="py-2.5 px-6 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={isPlaying ? 'pause' : 'play'}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2"
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
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* SFX Quick Test Button */}
              {activeScene?.sfx && activeScene.sfx !== 'none' && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => playSFX(activeScene.sfx as StorySFX)}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-[#FACC15] border border-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
                  title="Test Scene Sound Effect"
                >
                  <span>🔊</span>
                  <span>SFX: {activeScene.sfx}</span>
                </motion.button>
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
                value={selectedChallenge?.song_id || selectedChallenge?.id || ''}
                onChange={(e) => {
                  const found = challenges.find(
                    (c) => c.song_id === e.target.value || c.id === e.target.value
                  )
                  if (found) {
                    setLoadedSongDuration(null)
                    setSelectedChallenge(found)
                    if (found.song) {
                      const nextStart = found.song.id === KOCEE_DEMO_SONG.id ? 42 : 0
                      const nextEnd =
                        found.song.id === KOCEE_DEMO_SONG.id
                          ? 58
                          : Math.min(Math.max(found.song.duration_sec || 20, 12), 24)
                      setClipStart(nextStart)
                      setClipEnd(nextEnd)
                      setTimelineBlocks((prev) =>
                        distributeCroppedWindowToScenes(nextStart, nextEnd, prev)
                      )
                      loadSong(found.song, nextStart)
                      if (isPlaying) {
                        playSong(found.song, nextStart)
                      }
                    }
                  }
                }}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 text-sm text-white font-semibold focus:outline-none focus:border-[#536D56] cursor-pointer appearance-none disabled:opacity-60"
              >
                {loading && <option value="">Loading challenges...</option>}
                {challenges.map((ch) => (
                  <option key={ch.song_id || ch.id} value={ch.song_id || ch.id}>
                    {ch.song?.title || 'Unknown Track'} — {ch.song?.genre || 'Afropop'} ({ch.song?.bpm || 115} BPM)
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                ▼
              </div>
            </div>
          </div>

          {/* 1.5 Simple Song Section Picker: Start Spot + Play Duration */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#121212] border border-[#536D56]/50 shadow-xl space-y-4">
            {/* Hidden metadata reader so songDuration always reflects actual <audio> length */}
            <audio
              preload="metadata"
              src={resolveClipUrl(selectedChallenge?.song?.clip_url || KOCEE_DEMO_SONG.clip_url)}
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration
                if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
                  setLoadedSongDuration(dur)
                  const maxStart = Math.max(0, Math.floor(dur - 4))
                  const clampedStart = Math.min(startSec, maxStart)
                  const availMax = Math.max(4, Math.floor(dur - clampedStart))
                  if (clampedStart !== startSec || playDuration > availMax) {
                    const nextDur = Math.min(playDuration, availMax)
                    setClipStart(clampedStart)
                    setClipEnd(clampedStart + nextDur)
                    setTimelineBlocks((prev) =>
                      distributeCroppedWindowToScenes(clampedStart, clampedStart + nextDur, prev)
                    )
                  }
                }
              }}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">✂️</span>
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Song Section Picker
                </span>
              </div>

              {/* Clear Range Badge: e.g. 0:32 → 0:48 (16s of 2:45) */}
              <span className="text-xs sm:text-sm font-mono font-black text-[#FACC15] bg-neutral-900 px-3 py-1 rounded-xl border border-neutral-800 shadow-inner">
                {formatTime(startSec)} → {formatTime(clipEnd)} ({playDuration}s of {formatTime(songDuration)})
              </span>
            </div>

            {/* Visual Audio Waveform Preview */}
            <div className="relative h-12 w-full bg-neutral-950/80 rounded-2xl p-2 flex items-center justify-between gap-1 overflow-hidden border border-neutral-800">
              {WAVEFORM_BARS.map((height, i) => {
                const barPct = (i / (WAVEFORM_BARS.length - 1)) * 100
                const startPct = (startSec / songDuration) * 100
                const endPct = (clipEnd / songDuration) * 100
                const inWindow = barPct >= startPct && barPct <= endPct

                  return (
                  <div key={i} className="flex-1 flex items-center justify-center h-full">
                    <div
                      className={`w-full max-w-[4px] rounded-full transition-all duration-150 ${
                        inWindow
                          ? 'bg-gradient-to-t from-[#536D56] via-[#FACC15] to-[#F43F5E] opacity-95'
                          : 'bg-neutral-700 opacity-25'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                )
              })}

              <div
                className="absolute top-0 bottom-0 left-0 bg-black/55 pointer-events-none transition-all duration-75"
                style={{ width: `${Math.min(100, (startSec / songDuration) * 100)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 right-0 bg-black/55 pointer-events-none transition-all duration-75"
                style={{ width: `${Math.max(0, 100 - (clipEnd / songDuration) * 100)}%` }}
              />
              {currentTime >= 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#FACC15] shadow-[0_0_8px_#FACC15] pointer-events-none z-20"
                  style={{ left: `${Math.min(100, Math.max(0, (currentTime / songDuration) * 100))}%` }}
                />
              )}
            </div>

            {/* Control 1: Start Spot (startSec) */}
            <div className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                  <span className="text-emerald-400">▶</span>
                  <span>1. Start Spot</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartSpotChange(startSec - 1)}
                    className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[10px] font-bold text-neutral-300 border border-neutral-700 cursor-pointer"
                  >
                    -1s
                  </button>
                  <span className="text-xs font-mono font-black text-emerald-400 bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-neutral-800">
                    Start at {formatTime(startSec)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartSpotChange(startSec + 1)}
                    className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[10px] font-bold text-neutral-300 border border-neutral-700 cursor-pointer"
                  >
                    +1s
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(0, songDuration - 4)}
                step={1}
                value={startSec}
                onChange={(e) => handleStartSpotChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            {/* Control 2: Play Duration (playDuration) */}
            <div className="p-3 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1.5">
                  <span className="text-[#F43F5E]">⏱</span>
                  <span>2. Play Duration</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={Math.min(4, maxDuration)}
                    max={Math.min(30, maxDuration)}
                    value={playDuration}
                    onChange={(e) => handlePlayDurationChange(parseInt(e.target.value, 10) || 4)}
                    className="w-14 text-center text-xs font-mono font-black text-[#FACC15] bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-700 focus:outline-none focus:border-[#FACC15]"
                  />
                  <span className="text-[10px] text-neutral-400 font-mono">
                    sec (max {Math.min(30, maxDuration)}s)
                  </span>
                </div>
              </div>

              {/* Quick Duration Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[8, 12, 16, 20, 25, 30].map((sec) => {
                  const isDisabled = sec > maxDuration
                  const isActive = playDuration === sec
                    return (
                    <motion.button
                      key={sec}
                      type="button"
                      disabled={isDisabled}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handlePlayDurationChange(sec)}
                      className={`text-[11px] px-3 py-1 rounded-full font-bold transition border ${
                        isActive
                          ? 'bg-[#FACC15] text-neutral-950 border-[#FACC15] shadow cursor-pointer'
                          : isDisabled
                          ? 'bg-neutral-900/40 text-neutral-600 border-neutral-800/60 cursor-not-allowed'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700 cursor-pointer'
                      }`}
                    >
                      {sec}s
                    </motion.button>
                  )
                })}
              </div>

              {/* Fine-tune Duration Slider */}
              <input
                type="range"
                min={Math.min(4, maxDuration)}
                max={Math.min(30, maxDuration)}
                step={1}
                value={playDuration}
                onChange={(e) => handlePlayDurationChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#F43F5E]"
              />
            </div>

            {/* Preview Cut Action Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
              <span className="text-[10px] text-neutral-400">
                Auto-divided evenly into {timelineBlocks.length} scenes ({(playDuration / Math.max(1, timelineBlocks.length)).toFixed(1)}s each)
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

          {/* 2. Per-Scene Comic Editor (Dynamic 1-6 Characters, Expressions & Dialogue) */}
          {(() => {
            const getSceneCharacters = (): SceneCharacter[] => {
              if (activeScene.characters && activeScene.characters.length > 0) {
                return activeScene.characters
              }
              const list: SceneCharacter[] = [
                {
                  id: activeScene.charA_id || characterA,
                  expression:
                    (activeScene.charA_expression as ComicExpression) ||
                    expressionFromAction(activeScene.charA_action || activeScene.action),
                  dialogue: activeScene.dialogueA || '',
                  flip: false,
                },
              ]
              const charBVal =
                activeScene.charB_id !== undefined ? activeScene.charB_id : characterB
              if (charBVal && charBVal !== 'none') {
                list.push({
                  id: charBVal,
                  expression:
                    (activeScene.charB_expression as ComicExpression) ||
                    expressionFromAction(activeScene.charB_action),
                  dialogue: activeScene.dialogueB || '',
                  flip: true,
                })
              }
              return list
            }

            const sceneChars = getSceneCharacters()
            const sceneDuration = Math.max(0.5, Number((activeScene.end - activeScene.start).toFixed(1)))

            const commitSceneCharacters = (nextChars: SceneCharacter[]) => {
              const first = nextChars[0]
              const second = nextChars[1]
              if (first?.id) setCharacterA(first.id as 'tantie' | 'mboa_boy' | 'pa_buea')
              setCharacterB((second?.id as 'tantie' | 'mboa_boy' | 'pa_buea') || 'none')

              updateActiveScene({
                characters: nextChars,
                charA_id: first?.id || 'mboa_boy',
                charB_id: second ? second.id : null,
                charA_expression: first?.expression || 'happy',
                charB_expression: second?.expression || 'happy',
                dialogueA: first?.dialogue || '',
                dialogueB: second ? second.dialogue || '' : '',
                action: first?.expression || 'happy',
              })
            }

            const handleAddCharacter = () => {
              if (sceneChars.length >= 6) return
              const nextIdx = sceneChars.length
              const castCycle: ('mboa_boy' | 'tantie' | 'pa_buea')[] = ['mboa_boy', 'tantie', 'pa_buea']
              const nextChar: SceneCharacter = {
                id: castCycle[nextIdx % castCycle.length],
                expression: 'happy',
                dialogue: '',
                flip: nextIdx >= 1,
              }
              commitSceneCharacters([...sceneChars, nextChar])
            }

            const handleRemoveCharacter = (idxToRemove: number) => {
              if (sceneChars.length <= 1) return
              commitSceneCharacters(sceneChars.filter((_, i) => i !== idxToRemove))
            }

            const updateCharacterAt = (idx: number, patch: Partial<SceneCharacter>) => {
              const updated = sceneChars.map((ch, i) => (i === idx ? { ...ch, ...patch } : ch))
              commitSceneCharacters(updated)
            }

              return (
              <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-5">
                {/* Scene Editor Header + Duration Tweak */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>2. Scene #{activeSceneIndex + 1} Comic Editor</span>
                    <span className="text-[#FACC15]">🎬</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAdjustSceneDuration(-0.5)}
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[10px] font-bold text-neutral-300 border border-neutral-700 cursor-pointer"
                      title="Shorten scene by 0.5s"
                    >
                      -0.5s
                    </button>
                    <span className="text-[10px] font-mono text-[#FACC15] bg-black/50 px-2.5 py-0.5 rounded-full border border-neutral-800">
                      {activeScene.start}s – {activeScene.end}s ({sceneDuration}s)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdjustSceneDuration(0.5)}
                      className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[10px] font-bold text-neutral-300 border border-neutral-700 cursor-pointer"
                      title="Extend scene by 0.5s"
                    >
                      +0.5s
                    </button>
                    {timelineBlocks.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteScene(activeSceneIndex)}
                        className="px-2 py-0.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-[10px] font-bold text-red-300 border border-red-500/30 cursor-pointer ml-1"
                        title="Delete this scene"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Number of Characters Control (1 to 6 characters) */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold text-neutral-300">
                      Characters in Scene:
                    </span>
                    <div className="inline-flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-full px-1.5 py-0.5">
                      <button
                        type="button"
                        disabled={sceneChars.length <= 1}
                        onClick={() => handleRemoveCharacter(sceneChars.length - 1)}
                        className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black flex items-center justify-center disabled:opacity-35 cursor-pointer"
                        title="Remove last character"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-black text-[#FACC15] px-2">
                        {sceneChars.length}
                      </span>
                      <button
                        type="button"
                        disabled={sceneChars.length >= 6}
                        onClick={handleAddCharacter}
                        className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black flex items-center justify-center disabled:opacity-35 cursor-pointer"
                        title="Add character"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {sceneChars.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddCharacter}
                      className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#536D56] hover:bg-[#607d64] text-white cursor-pointer shadow"
                    >
                      + Add Character
                    </button>
                  )}
                </div>

                {/* Per-Character Cards */}
                <div className="space-y-4">
                  {sceneChars.map((sc, cIdx) => {
                    const charExpr = (sc.expression as ComicExpression) || 'happy'
                    const badgeColors = [
                      'text-emerald-400',
                      'text-sky-400',
                      'text-[#FACC15]',
                      'text-pink-400',
                      'text-purple-400',
                      'text-orange-400',
                    ]
                    const dotColors = [
                      'bg-emerald-400',
                      'bg-sky-400',
                      'bg-[#FACC15]',
                      'bg-pink-400',
                      'bg-purple-400',
                      'bg-orange-400',
                    ]

                      return (
                      <div
                        key={cIdx}
                        className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                              badgeColors[cIdx % badgeColors.length]
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${dotColors[cIdx % dotColors.length]}`}
                            />
                            Character {cIdx + 1}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCharacterAt(cIdx, { flip: !sc.flip })}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 cursor-pointer"
                              title="Flip character facing direction"
                            >
                              {sc.flip ? '⇄ Facing Left' : '⇄ Facing Right'}
                            </button>
                            {sceneChars.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCharacter(cIdx)}
                                className="text-[10px] px-2 py-0.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-500/30 cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Character Cast Picker */}
                        <div className="grid grid-cols-3 gap-2">
                          {CHARACTERS.map((char) => {
                            const isSelected = sc.id === char.id
                              return (
                              <button
                                key={char.id}
                                type="button"
                                onClick={() => updateCharacterAt(cIdx, { id: char.id })}
                                className={`flex flex-col items-center text-center p-2 rounded-2xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#536D56]/30 border-[#F43F5E] shadow'
                                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                                }`}
                              >
                                <div className="w-10 h-10 rounded-full overflow-hidden mb-1">
                                  <CharacterAvatarCircle
                                    characterId={char.id}
                                    expression={isSelected ? charExpr : 'happy'}
                                  />
                                </div>
                                <span className="text-[11px] font-black text-white leading-tight">
                                  {char.displayName}
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Expression Picker (14 emotions) */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            Expression:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {COMIC_EXPRESSIONS.map((exp) => {
                              const isSelected = charExpr === exp.id
                                return (
                                <motion.button
                                  key={exp.id}
                                  type="button"
                                  whileTap={{ scale: 0.92 }}
                                  onClick={() => updateCharacterAt(cIdx, { expression: exp.id })}
                                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-[#536D56] text-white border-[#F43F5E] shadow'
                                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                                  }`}
                                >
                                  <span>{exp.emoji}</span>
                                  <span>{exp.label}</span>
                                </motion.button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Comic Dialogue */}
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={sc.dialogue || ''}
                            onChange={(e) => updateCharacterAt(cIdx, { dialogue: e.target.value })}
                            placeholder={`Character ${cIdx + 1} speech (EN / FR / Pidgin)...`}
                            maxLength={80}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#536D56]"
                          />
                          <div className="flex flex-wrap gap-1">
                            {COMIC_STARTER_CHIPS.map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => updateCharacterAt(cIdx, { dialogue: chip })}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/80 transition cursor-pointer"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* 3. Scene Background, Camera, Prop & SFX */}
          <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-xl space-y-4">
            <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>3. Scene Background, Camera, Prop & SFX</span>
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
                    <motion.button
                      key={bg.id}
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => updateActiveScene({ bg: bg.id })}
                      className={`p-2 rounded-2xl border text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#536D56]/30 border-[#F43F5E] text-white shadow'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-xl mb-0.5">{bg.icon}</div>
                      <div className="text-[10px] font-bold truncate">{bg.label}</div>
                    </motion.button>
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
                    <motion.button
                      key={m.id}
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => updateActiveScene({ bgMotion: m.id })}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-[#536D56] text-white border-[#F43F5E] font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="mr-1">{m.icon}</span>
                      <span className="text-[10px]">{m.label}</span>
                    </motion.button>
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
          {awaitingAuthToSubmit && user && token && !submitSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <span>✓</span>
              <span>
                Signed in as <strong>{user.display_name}</strong>! Your animation is preserved — click{' '}
                <strong>Submit Story to Challenge</strong> below to publish.
              </span>
            </div>
          )}

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
      {/* 3. BOTTOM SCENE TIMELINE BAR (Dynamic 2-8 Scenes) */}
      {/* ========================================================= */}
      <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/40 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>Scene Timeline ({timelineBlocks.length} Scenes)</span>
              <span className="text-[#FACC15]">🎬</span>
            </label>

            {/* - / + Scene Count Controls (2 to 8 scenes) */}
            <div className="inline-flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-full px-1.5 py-0.5">
              <button
                type="button"
                disabled={timelineBlocks.length <= 2}
                onClick={() => handleSceneCountChange(timelineBlocks.length - 1)}
                className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black flex items-center justify-center disabled:opacity-35 cursor-pointer"
                title="Decrease scenes (min 2)"
              >
                -
              </button>
              <span className="text-[11px] font-mono font-bold text-[#FACC15] px-1.5">
                {timelineBlocks.length}
              </span>
              <button
                type="button"
                disabled={timelineBlocks.length >= 8}
                onClick={() => handleSceneCountChange(timelineBlocks.length + 1)}
                className="w-5 h-5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black flex items-center justify-center disabled:opacity-35 cursor-pointer"
                title="Increase scenes (max 8)"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetEvenSplit}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 cursor-pointer"
              title="Divide total duration evenly across all scenes"
            >
              Even Split
            </button>
            {timelineBlocks.length < 8 && (
              <button
                type="button"
                onClick={() => handleSceneCountChange(timelineBlocks.length + 1)}
                className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#536D56] hover:bg-[#607d64] text-white cursor-pointer shadow"
              >
                + Add Scene
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {timelineBlocks.map((block, idx) => {
            const isEditing = activeSceneIndex === idx
            const isLive = currentHighlightedBlockIndex === idx && isPlaying
            const bgInfo = STORY_BACKGROUNDS.find((b) => b.id === (block.bg || 'street_buea'))
            const exprAId =
              (block.charA_expression as ComicExpression) ||
              expressionFromAction(block.charA_action || block.action)
            const exprBId =
              (block.charB_expression as ComicExpression) ||
              expressionFromAction(block.charB_action)
            const exprAInfo = COMIC_EXPRESSIONS.find((e) => e.id === exprAId)
            const exprBInfo = COMIC_EXPRESSIONS.find((e) => e.id === exprBId)
            const sfxInfo = STORY_SFX_LIST.find((s) => s.id === block.sfx)
            const hasB = block.charB_id !== undefined ? Boolean(block.charB_id) : characterB !== 'none'

              return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectScene(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelectScene(idx)
                  }
                }}
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
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-neutral-400">
                      {block.start}s–{block.end}s
                    </span>
                    {timelineBlocks.length > 2 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteScene(idx)
                        }}
                        className="ml-1 w-4 h-4 rounded-full bg-neutral-800 hover:bg-red-600 text-neutral-400 hover:text-white text-[9px] flex items-center justify-center cursor-pointer"
                        title="Delete scene"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-[#8FA993] font-semibold mt-1">
                  <span>{bgInfo?.icon || '🌄'}</span>
                  <span className="truncate">{bgInfo?.label || 'Buea Street'}</span>
                </div>

                <div className="text-[11px] font-bold text-white mt-1 truncate">
                  {exprAInfo?.emoji || '😊'} {exprAInfo?.label || 'Happy'}
                  {hasB && (
                    <span className="text-[#A1A1AA] text-[10px] ml-1">
                      · {exprBInfo?.emoji || '😊'} {exprBInfo?.label || 'Happy'}
                    </span>
                  )}
                </div>

                {/* Dialogue Preview Snippet */}
                <p className="text-[9px] text-neutral-400 mt-1 line-clamp-1 italic">
                  "{block.dialogueA || block.dialogueB || 'No dialogue'}"
                </p>

                {/* SFX / Prop Badge */}
                {(sfxInfo && sfxInfo.id !== 'none') || (block.prop && block.prop !== 'none') ? (
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
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
      </>
      )}
    </div>
  )
}
