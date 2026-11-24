import React, { useState, useEffect, useMemo, useRef, Suspense, Component, type ErrorInfo, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useFBX } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'
import type { MoveBlock, StoryBackground, StoryProp, StorySFX, BgMotion } from '../types'
import { storySFX } from '../lib/audioUtils'
import { PuppetCharacter } from './PuppetCharacter'

// Configure Draco decoder for compressed .glb character models (NFR-2, NFR-8)
useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

// Model and animation asset URLs present on disk in /public/assets/
const MODEL_PATHS: Record<string, string> = {
  tantie: '/assets/models/tantie/base.glb',
  mboa_boy: '/assets/models/mboa_boy/base.glb',
  pa_buea: '/assets/models/mboa_boy/base.glb',
}

const ANIMATION_FBX_PATHS: Record<string, string> = {
  idle: '/assets/models/animations/idle.fbx',
  walk_in: '/assets/models/animations/walk.fbx',
  approach: '/assets/models/animations/walk.fbx',
  walk_away: '/assets/models/animations/walk.fbx',
  turn_around: '/assets/models/animations/walk.fbx',
  wave_happy: '/assets/models/animations/wave.fbx',
  shocked: '/assets/models/animations/shocked.fbx',
  angry_argue: '/assets/models/animations/argue.fbx',
  cry_sad: '/assets/models/animations/cry.fbx',
  laugh: '/assets/models/animations/laugh.fbx',
  celebrate: '/assets/models/animations/celebrate.fbx',
  slip_fall: '/assets/models/animations/fall.fbx',
  kneel: '/assets/models/animations/kneel.fbx',
  // Cameroonian dance moves
  dance_afro: '/assets/models/animations/celebrate.fbx',
  dance_makossa: '/assets/models/animations/wave.fbx',
  dance_bikutsi: '/assets/models/animations/laugh.fbx',
  dance_hype: '/assets/models/animations/celebrate.fbx',
  // Legacy mappings
  sway: '/assets/models/animations/wave.fbx',
  stomp: '/assets/models/animations/walk.fbx',
  jump: '/assets/models/animations/celebrate.fbx',
  flex: '/assets/models/animations/celebrate.fbx',
}

// Preload models and unique animation clips to prevent runtime stutter
try {
  useGLTF.preload('/assets/models/mboa_boy/base.glb')
  useGLTF.preload('/assets/models/tantie/base.glb')
  Object.values(ANIMATION_FBX_PATHS).forEach((url) => {
    useFBX.preload(url)
  })
} catch {
  // Preload is an optimization; ignore if early execution environment lacks window
}

// Normalize character identifier to available 3D character meshes
function normalizeCharId(id?: string | null): 'tantie' | 'mboa_boy' | 'pa_buea' {
  if (!id) return 'tantie'
  const lower = id.toLowerCase().trim()
  if (lower.includes('tantie') || lower.includes('mama') || lower.includes('girl')) return 'tantie'
  if (lower.includes('buea') || lower.includes('pa')) return 'pa_buea'
  return 'mboa_boy'
}

// Normalize action identifier to mapped animation clips
function normalizeAction(raw?: string): string {
  if (!raw) return 'idle'
  const lower = raw.toLowerCase().trim()
  if (ANIMATION_FBX_PATHS[lower]) return lower
  if (lower.includes('walk') || lower.includes('step') || lower.includes('move')) return 'walk_in'
  if (lower.includes('approach')) return 'approach'
  if (lower.includes('wave')) return 'wave_happy'
  if (lower.includes('shock') || lower.includes('scared')) return 'shocked'
  if (lower.includes('argue') || lower.includes('angry')) return 'angry_argue'
  if (lower.includes('cry') || lower.includes('sad')) return 'cry_sad'
  if (lower.includes('laugh')) return 'laugh'
  if (lower.includes('celebrat') || lower.includes('win')) return 'celebrate'
  if (lower.includes('slip') || lower.includes('fall')) return 'slip_fall'
  if (lower.includes('kneel') || lower.includes('propos')) return 'kneel'
  if (lower.includes('makossa')) return 'dance_makossa'
  if (lower.includes('afro')) return 'dance_afro'
  if (lower.includes('bikutsi')) return 'dance_bikutsi'
  if (lower.includes('hype')) return 'dance_hype'
  return 'idle'
}

export interface MixamoStoryStageProps {
  characterId?: string
  characterAId?: string
  characterBId?: string | null
  backgroundTheme?: StoryBackground | string
  bgMotion?: BgMotion
  prop?: StoryProp | string
  movesTimeline?: MoveBlock[]
  bpm?: number
  currentTime?: number
  isPlaying?: boolean
  caption?: string
  captionA?: string
  captionB?: string
  sticker?: string | null
  onStickerTap?: (sticker: string) => void
  showControls?: boolean
  onTogglePlay?: () => void
  onSeek?: (seconds: number) => void
  duration?: number
  className?: string
  aspectRatio?: string
  mode?: 'studio' | 'playback' | 'compact'
  audioElement?: HTMLAudioElement | null
}

// -------------------------------------------------------------
// React Error Boundary for 3D Canvas Fallback (NFR-8)
// -------------------------------------------------------------
interface ErrorBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Canvas 3D Error caught by ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// -------------------------------------------------------------
// 3D Mixamo Character Actor Component
// -------------------------------------------------------------
interface MixamoActorProps {
  characterId: string
  action: string
  role: 'characterA' | 'characterB'
  hasPartner: boolean
  bpm: number
  isPlaying: boolean
}

const MixamoActor: React.FC<MixamoActorProps> = ({
  characterId,
  action,
  role,
  hasPartner,
  bpm,
  isPlaying,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const normChar = normalizeCharId(characterId)
  const modelUrl = MODEL_PATHS[normChar] || MODEL_PATHS.mboa_boy
  const animKey = normalizeAction(action)
  const animFbxUrl = ANIMATION_FBX_PATHS[animKey] || ANIMATION_FBX_PATHS.idle

  // Load GLB model and FBX animation clip via Drei hooks
  const { scene } = useGLTF(modelUrl)
  const fbx = useFBX(animFbxUrl)

  // Safe SkinnedMesh cloning with SkeletonUtils to allow multiple characters simultaneously
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene) as THREE.Group

    // Normalize bone names on cloned skeleton and preserve sRGB textures
    cloned.traverse((child) => {
      if (child.name) {
        child.name = child.name.replace(/^mixamorig\d*:?/i, 'mixamorig')
      }
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        const mesh = child as THREE.Mesh
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((mat) => {
            const standardMat = mat as THREE.MeshStandardMaterial
            if (standardMat.map) {
              standardMat.map.colorSpace = THREE.SRGBColorSpace
              standardMat.map.needsUpdate = true
            }
          })
        }
      }
    })

    // Auto-scale and ground to standard human height (1.75m in stage units)
    const box = new THREE.Box3().setFromObject(cloned)
    const size = box.getSize(new THREE.Vector3())
    const targetHeight = 1.75
    const scaleFactor = targetHeight / (size.y || 1)
    cloned.scale.setScalar(scaleFactor)

    const scaledBox = new THREE.Box3().setFromObject(cloned)
    cloned.position.y = -scaledBox.min.y
    cloned.position.x = 0
    cloned.position.z = 0

    return cloned
  }, [scene])

  // Process animation clip: strip root-motion hips drift & retarget tracks to normalized bones
  const cleanedClip = useMemo(() => {
    if (!fbx || !fbx.animations || fbx.animations.length === 0) return null
    const original = fbx.animations[0]
    const clip = original.clone()
    clip.name = animKey

    clip.tracks = clip.tracks.map((track) => {
      const normalizedTrackName = track.name.replace(/^mixamorig\d*:?/i, 'mixamorig')

      // Strip root motion X & Z drift from hips so in-place acting doesn't float away,
      // but preserve Y position (essential for slip_fall, kneel, and dancing bounce)
      if (normalizedTrackName.toLowerCase().includes('hips.position')) {
        const values = track.values.slice()
        for (let i = 0; i < values.length; i += 3) {
          values[i] = 0 // In-place X
          // values[i + 1] is Y (ground height descent)
          values[i + 2] = 0 // In-place Z
        }
        return new THREE.VectorKeyframeTrack(normalizedTrackName, track.times, values)
      }

      if (normalizedTrackName !== track.name) {
        if (track instanceof THREE.QuaternionKeyframeTrack) {
          return new THREE.QuaternionKeyframeTrack(normalizedTrackName, track.times, track.values)
        }
        if (track instanceof THREE.VectorKeyframeTrack) {
          return new THREE.VectorKeyframeTrack(normalizedTrackName, track.times, track.values)
        }
        const clonedTrack = track.clone()
        clonedTrack.name = normalizedTrackName
        return clonedTrack
      }
      return track
    })

    return clip
  }, [fbx, animKey])

  // AnimationMixer instance with proper cleanup on unmount
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const currentActionRef = useRef<THREE.AnimationAction | null>(null)

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(clonedScene)
    mixerRef.current = mixer

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(clonedScene)
      mixerRef.current = null
      currentActionRef.current = null

      // Dispose cloned mesh resources to prevent GPU memory leaks (NFR-8)
      clonedScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.geometry?.dispose()
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach((m) => m.dispose())
          }
        }
      })
    }
  }, [clonedScene])

  // Cross-fade clips over 0.35s and adjust dance tempo according to song BPM
  useEffect(() => {
    const mixer = mixerRef.current
    if (!mixer || !cleanedClip) return

    const prevAction = currentActionRef.current
    const nextAction = mixer.clipAction(cleanedClip)

    // Calculate tempo scaling for Cameroonian dance moves
    const isDance =
      animKey.startsWith('dance_') || ['sway', 'stomp', 'jump', 'flex'].includes(animKey)
    nextAction.timeScale = isDance ? Math.max(0.6, (bpm || 112) / 112) : 1.0

    nextAction.reset()
    if (prevAction && prevAction !== nextAction) {
      prevAction.fadeOut(0.35)
      nextAction.fadeIn(0.35)
    } else {
      nextAction.fadeIn(0.15)
    }
    nextAction.play()
    currentActionRef.current = nextAction
  }, [cleanedClip, animKey, bpm])

  // Setup initial stage position on spawn
  useEffect(() => {
    if (!groupRef.current) return
    const isCharA = role === 'characterA'
    const defaultX = isCharA ? (hasPartner ? -0.85 : 0) : 0.85
    const initialSpawnX = animKey === 'walk_in' ? (isCharA ? -2.4 : 2.4) : defaultX
    groupRef.current.position.set(initialSpawnX, 0, 0)
    groupRef.current.rotation.y = isCharA ? (hasPartner ? 0.6 : 0) : -0.6
  }, [role, hasPartner, animKey])

  // Smooth position and rotation lerping across scenes via useFrame
  useFrame((_, delta) => {
    if (mixerRef.current && isPlaying) {
      mixerRef.current.update(delta)
    }

    if (groupRef.current) {
      const isCharA = role === 'characterA'
      let targetX = isCharA ? (hasPartner ? -0.85 : 0) : 0.85
      let targetZ = 0
      let targetRotY = isCharA ? (hasPartner ? 0.6 : 0) : -0.6

      if (isCharA) {
        if (animKey === 'walk_in') {
          targetX = hasPartner ? -0.85 : 0
          targetRotY = 0.75
        } else if (animKey === 'approach') {
          targetX = hasPartner ? -0.42 : 0
          targetRotY = 0.65
        } else if (animKey === 'walk_away') {
          targetX = -2.6
          targetRotY = -Math.PI / 2
        } else if (animKey === 'turn_around') {
          targetX = hasPartner ? -0.85 : 0
          targetRotY = -Math.PI * 0.7
        }
      } else {
        // characterB
        if (animKey === 'walk_in') {
          targetX = 0.85
          targetRotY = -0.75
        } else if (animKey === 'approach') {
          targetX = 0.42
          targetRotY = -0.65
        } else if (animKey === 'walk_away') {
          targetX = 2.6
          targetRotY = Math.PI / 2
        } else if (animKey === 'turn_around') {
          targetX = 0.85
          targetRotY = Math.PI * 0.7
        }
      }

      // Smooth lerp
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        targetX,
        Math.min(1, delta * 3.5)
      )
      groupRef.current.position.z = THREE.MathUtils.lerp(
        groupRef.current.position.z,
        targetZ,
        Math.min(1, delta * 3.5)
      )
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotY,
        Math.min(1, delta * 4.5)
      )
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  )
}

// -------------------------------------------------------------
// 2D SVG & CSS Illustrated Story Backgrounds
// -------------------------------------------------------------
const StreetBueaBackground: React.FC<{ isPlaying: boolean; bgMotion?: BgMotion }> = ({
  isPlaying,
  bgMotion,
}) => {
  const isScrollingLeft = isPlaying && bgMotion === 'scroll_left'
  const isScrollingRight = isPlaying && bgMotion === 'scroll_right'

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#1E293B] via-[#334155] to-[#1E3A1E] overflow-hidden select-none">
      <svg
        className="absolute top-2 w-[200%] h-12 opacity-35 animate-[street-clouds_32s_linear_infinite] pointer-events-none"
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
      >
        <path
          d="M50 30 Q70 10 90 30 T130 30 Q145 15 160 30 Z M350 25 Q370 5 390 25 T430 25 Z M650 30 Q670 10 690 30 T730 30 Z M850 20 Q870 5 890 20 Z"
          fill="#E2E8F0"
        />
      </svg>
      <svg
        viewBox="0 0 800 240"
        preserveAspectRatio="none"
        className="absolute top-[8%] left-0 right-0 w-full h-[54%] pointer-events-none opacity-85"
      >
        <polygon points="0,240 180,90 320,35 460,95 620,130 800,240" fill="#0F172A" />
        <polygon points="260,65 320,35 380,72 350,95 290,90" fill="#1E293B" opacity="0.6" />
        <path d="M0 240 Q150 160 300 190 T600 170 T800 210 L800 240 Z" fill="#14361C" />
      </svg>
      <div
        className={`absolute bottom-0 w-[200%] h-[56%] pointer-events-none ${
          isScrollingLeft
            ? 'animate-[buea-scroll-left_6s_linear_infinite]'
            : isScrollingRight
            ? 'animate-[buea-scroll-right_6s_linear_infinite]'
            : ''
        }`}
      >
        <svg viewBox="0 0 1600 200" preserveAspectRatio="none" className="w-full h-full">
          <rect x="30" y="40" width="130" height="120" fill="#2E3C2B" stroke="#162215" strokeWidth="2" />
          <rect x="50" y="60" width="30" height="40" rx="15" fill="#FACC15" fillOpacity="0.7" />
          <rect x="100" y="60" width="30" height="40" rx="15" fill="#FACC15" fillOpacity="0.7" />
          <polygon points="20,40 95,15 170,40" fill="#991B1B" />
          <rect x="230" y="55" width="160" height="105" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
          <rect x="250" y="75" width="40" height="30" fill="#38BDF8" fillOpacity="0.6" />
          <rect x="320" y="75" width="40" height="30" fill="#38BDF8" fillOpacity="0.6" />
          <rect x="830" y="40" width="130" height="120" fill="#2E3C2B" stroke="#162215" strokeWidth="2" />
          <rect x="850" y="60" width="30" height="40" rx="15" fill="#FACC15" fillOpacity="0.7" />
          <rect x="900" y="60" width="30" height="40" rx="15" fill="#FACC15" fillOpacity="0.7" />
          <polygon points="820,40 895,15 970,40" fill="#991B1B" />
          <rect x="1030" y="55" width="160" height="105" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
          <rect x="1050" y="75" width="40" height="30" fill="#38BDF8" fillOpacity="0.6" />
          <rect x="1120" y="75" width="40" height="30" fill="#38BDF8" fillOpacity="0.6" />
          <path d="M190 160 Q193 100 200 40" stroke="#451A03" strokeWidth="6" fill="none" />
          <path d="M200 40 Q160 25 150 45 M200 40 Q180 15 180 5 M200 40 Q225 10 235 25 M200 40 Q240 30 245 50 M200 40 Q200 15 215 10" stroke="#15803D" strokeWidth="4" fill="none" />
          <path d="M990 160 Q993 100 1000 40" stroke="#451A03" strokeWidth="6" fill="none" />
          <path d="M1000 40 Q960 25 950 45 M1000 40 Q980 15 980 5 M1000 40 Q1025 10 1035 25 M1000 40 Q1040 30 1045 50" stroke="#15803D" strokeWidth="4" fill="none" />
          <line x1="430" y1="160" x2="430" y2="45" stroke="#18181B" strokeWidth="3" />
          <circle cx="430" cy="45" r="5" fill="#FACC15" />
          <circle cx="430" cy="45" r="16" fill="#FACC15" fillOpacity="0.25" />
          <line x1="1230" y1="160" x2="1230" y2="45" stroke="#18181B" strokeWidth="3" />
          <circle cx="1230" cy="45" r="5" fill="#FACC15" />
          <circle cx="1230" cy="45" r="16" fill="#FACC15" fillOpacity="0.25" />
          <rect x="0" y="160" width="1600" height="12" fill="#475569" />
          <rect x="0" y="172" width="1600" height="28" fill="#18181B" />
          <line x1="0" y1="186" x2="1600" y2="186" stroke="#FEF08A" strokeWidth="2.5" strokeDasharray="30 20" />
        </svg>
      </div>
    </div>
  )
}

const LivingRoomBackground: React.FC = () => (
  <div className="absolute inset-0 bg-[#291711] overflow-hidden select-none">
    <div className="absolute top-0 left-0 right-0 h-[72%] bg-gradient-to-b from-[#7C2D12] to-[#451A03] border-b-[6px] border-[#2E1005]">
      <div className="absolute top-4 left-6 w-20 h-28 sm:w-24 sm:h-32 border-4 border-[#F59E0B] bg-[#1E293B] shadow-lg rounded-sm overflow-hidden flex flex-col items-center justify-center p-1">
        <span className="text-xl sm:text-2xl">🇨🇲</span>
        <span className="text-[8px] font-mono text-[#FACC15] mt-1 text-center font-bold">BUEA 237</span>
      </div>
      <div className="absolute top-3 right-8 w-28 sm:w-40 h-24 sm:h-32 border-4 border-[#D97706] bg-[#0284C7] rounded-t-full overflow-hidden shadow-xl">
        <svg viewBox="0 0 100 80" className="w-full h-full">
          <circle cx="50" cy="30" r="14" fill="#FACC15" />
          <polygon points="0,80 40,40 70,60 100,35 100,80" fill="#15803D" />
        </svg>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-[28%] bg-gradient-to-b from-[#78350F] to-[#451A03] border-t-2 border-[#B45309]/30" />
  </div>
)

const ChopHouseBackground: React.FC = () => (
  <div className="absolute inset-0 bg-[#17130E] overflow-hidden select-none">
    <div className="absolute top-0 left-0 right-0 h-[68%] bg-gradient-to-b from-[#3E2312] to-[#24130A] border-b-[6px] border-[#180E07]">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl bg-[#991B1B] border-2 border-[#FEF08A] shadow-[0_4px_12px_rgba(239,68,68,0.4)] flex items-center gap-2">
        <span className="text-sm">🍲</span>
        <span className="font-black text-[11px] sm:text-xs text-[#FEF08A] tracking-wider uppercase font-sans">
          CHOP CHOP BUEA · NDOLE & FISH
        </span>
      </div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-[32%] bg-[#262626]">
      <div
        className="w-full h-full opacity-30"
        style={{
          backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
        }}
      />
    </div>
  </div>
)

const ParkSunsetBackground: React.FC<{ isPlaying: boolean; bgMotion?: BgMotion }> = ({
  isPlaying,
  bgMotion,
}) => {
  const isScrollingLeft = isPlaying && bgMotion === 'scroll_left'
  const isScrollingRight = isPlaying && bgMotion === 'scroll_right'

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#B45309] via-[#BE185D] to-[#1E1B4B] overflow-hidden select-none">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-gradient-to-t from-[#F59E0B] to-[#FEF08A] opacity-90 blur-[1px] shadow-[0_0_80px_#F59E0B]" />
      <div
        className={`absolute bottom-0 w-[200%] h-[46%] pointer-events-none ${
          isScrollingLeft
            ? 'animate-[buea-scroll-left_7s_linear_infinite]'
            : isScrollingRight
            ? 'animate-[buea-scroll-right_7s_linear_infinite]'
            : ''
        }`}
      >
        <svg viewBox="0 0 1600 160" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0 160 Q200 70 400 110 T800 80 T1200 120 T1600 70 L1600 160 Z" fill="#064E3B" />
          <path d="M0 160 Q300 110 600 135 T1200 110 T1600 130 L1600 160 Z" fill="#022C22" />
        </svg>
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// SVG Scene Props Overlay
// -------------------------------------------------------------
const ScenePropOverlay: React.FC<{ prop?: StoryProp | string }> = ({ prop }) => {
  if (!prop || prop === 'none') return null

  return (
    <div className="absolute bottom-[24%] left-1/2 -translate-x-1/2 z-15 pointer-events-none flex items-center justify-center">
      {prop === 'phone' && (
        <svg viewBox="0 0 60 100" className="w-9 h-14 sm:w-11 sm:h-16 animate-bounce">
          <rect x="8" y="5" width="44" height="90" rx="10" fill="#18181B" stroke="#FACC15" strokeWidth="2.5" />
          <rect x="13" y="16" width="34" height="66" rx="4" fill="#0284C7" />
          <circle cx="30" cy="11" r="2" fill="#E4E4E7" />
          <rect x="16" y="24" width="22" height="7" rx="3" fill="#22C55E" />
          <circle cx="30" cy="88" r="3.5" fill="#E4E4E7" />
        </svg>
      )}
      {prop === 'gift_box' && (
        <svg viewBox="0 0 100 100" className="w-12 h-12 sm:w-16 sm:h-16 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
          <rect x="15" y="40" width="70" height="50" rx="6" fill="#DC2626" stroke="#991B1B" strokeWidth="2" />
          <rect x="10" y="30" width="80" height="15" rx="4" fill="#EF4444" stroke="#991B1B" strokeWidth="2" />
          <rect x="44" y="30" width="12" height="60" fill="#FACC15" />
          <path d="M50 30 C35 15 25 30 50 30 C75 30 65 15 50 30 Z" fill="#FACC15" />
        </svg>
      )}
      {(prop === 'table' || prop === 'table_chair') && (
        <svg viewBox="0 0 160 80" className="w-28 h-14 sm:w-36 sm:h-18">
          <ellipse cx="80" cy="30" rx="60" ry="12" fill="#78350F" stroke="#451A03" strokeWidth="2" />
          <rect x="75" y="30" width="10" height="42" fill="#451A03" />
          <ellipse cx="80" cy="72" rx="28" ry="6" fill="#291711" />
        </svg>
      )}
      {prop === 'car' && (
        <svg viewBox="0 0 140 70" className="w-24 h-12 sm:w-30 sm:h-15">
          <path d="M10 50 L25 28 L50 20 L95 20 L115 32 L132 45 L132 55 L10 55 Z" fill="#FACC15" stroke="#18181B" strokeWidth="3" />
          <path d="M30 30 L50 24 L50 42 L24 42 Z" fill="#0284C7" fillOpacity="0.7" stroke="#18181B" strokeWidth="1.5" />
          <circle cx="35" cy="54" r="11" fill="#18181B" />
          <circle cx="108" cy="54" r="11" fill="#18181B" />
          <rect x="62" y="14" width="22" height="7" rx="2" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
          <text x="65" y="20" fontSize="5" fontWeight="bold" fill="#000">TAXI</text>
        </svg>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Main MixamoStoryStage Engine Component
// -------------------------------------------------------------
export const MixamoStoryStage: React.FC<MixamoStoryStageProps> = ({
  characterId = 'tantie',
  characterAId,
  characterBId,
  backgroundTheme = 'street_buea',
  bgMotion = 'static',
  prop = 'none',
  movesTimeline = [],
  bpm = 112,
  currentTime = 0,
  isPlaying = false,
  caption,
  captionA,
  captionB,
  sticker,
  onStickerTap,
  onTogglePlay,
  onSeek,
  duration,
  aspectRatio = 'aspect-[16/10]',
  mode = 'studio',
  audioElement = null,
  className = '',
}) => {
  const normCharA = normalizeCharId(characterAId || characterId || 'tantie')
  const normCharB = characterBId && characterBId !== 'none' ? normalizeCharId(characterBId) : null
  const hasCharB = Boolean(normCharB)

  const [rafTime, setRafTime] = useState(0)
  const [visibleSticker, setVisibleSticker] = useState<string | null>(sticker || null)
  const [stickerFading, setStickerFading] = useState(false)

  // Auto-fading reaction sticker logic (1.5s lifecycle)
  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout>
    let hideTimer: ReturnType<typeof setTimeout>

    const startTimer = setTimeout(() => {
      if (sticker) {
        setVisibleSticker(sticker)
        setStickerFading(false)

        fadeTimer = setTimeout(() => {
          setStickerFading(true)
        }, 1100)

        hideTimer = setTimeout(() => {
          setVisibleSticker(null)
          setStickerFading(false)
        }, 1500)
      } else {
        setVisibleSticker(null)
        setStickerFading(false)
      }
    }, 0)

    return () => {
      clearTimeout(startTimer)
      if (fadeTimer) clearTimeout(fadeTimer)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [sticker])

  // Determine cropped audio window from timeline
  const clipStart = useMemo(() => {
    if (movesTimeline && movesTimeline.length > 0 && typeof movesTimeline[0].start === 'number') {
      return movesTimeline[0].start
    }
    return 0
  }, [movesTimeline])

  const clipEnd = useMemo(() => {
    if (movesTimeline && movesTimeline.length > 0) {
      const last = movesTimeline[movesTimeline.length - 1]
      if (typeof last.end === 'number' && last.end > clipStart) {
        return last.end
      }
    }
    return duration || 24
  }, [movesTimeline, clipStart, duration])

  const clipDuration = Math.max(clipEnd - clipStart, 0.5)

  // Sync to HTML5 <audio>.currentTime smoothly via requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || !audioElement) return

    let rafId: number
    const loop = () => {
      if (audioElement && !isNaN(audioElement.currentTime)) {
        const cur = audioElement.currentTime
        if (cur >= clipEnd) {
          if (mode === 'studio') {
            audioElement.currentTime = clipStart
            setRafTime(clipStart)
          } else {
            audioElement.pause()
            audioElement.currentTime = clipStart
            setRafTime(clipStart)
            if (onTogglePlay) onTogglePlay()
            return
          }
        } else if (cur < clipStart - 0.25) {
          audioElement.currentTime = clipStart
          setRafTime(clipStart)
        } else {
          setRafTime(cur)
        }
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isPlaying, audioElement, clipStart, clipEnd, mode, onTogglePlay])

  const effectiveTime = isPlaying && audioElement ? rafTime : currentTime

  // Active scene block determination from movesTimeline
  const activeBlock = useMemo(() => {
    if (!movesTimeline || movesTimeline.length === 0) return null
    return (
      movesTimeline.find((m) => effectiveTime >= m.start && effectiveTime < m.end) ||
      movesTimeline[0]
    )
  }, [movesTimeline, effectiveTime])

  const actionA: string = (activeBlock?.charA_action || activeBlock?.action || 'idle')
  const actionB: string = (activeBlock?.charB_action || (hasCharB ? 'turn_around' : 'none'))
  const activeBg: StoryBackground | string = (activeBlock?.bg || backgroundTheme || 'street_buea')
  const activeBgMotion: BgMotion = (activeBlock?.bgMotion || bgMotion || 'static')
  const activeProp: StoryProp | string = (activeBlock?.prop || prop || 'none')
  const dialogueA: string | undefined = activeBlock?.dialogueA || captionA || (!activeBlock?.dialogueB ? caption : undefined)
  const dialogueB: string | undefined = activeBlock?.dialogueB || captionB

  // Sound Effects (SFX) trigger once on block boundary entry
  const lastPlayedSFXBlockRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isPlaying || !activeBlock) return
    const blockIndex = movesTimeline ? movesTimeline.indexOf(activeBlock) : -1
    if (blockIndex !== -1 && blockIndex !== lastPlayedSFXBlockRef.current) {
      lastPlayedSFXBlockRef.current = blockIndex
      if (activeBlock.sfx && activeBlock.sfx !== 'none') {
        storySFX.play(activeBlock.sfx as StorySFX)
      }
    }
  }, [isPlaying, activeBlock, movesTimeline])

  // Render 2D illustrated story background
  const renderBackground = () => {
    switch (activeBg) {
      case 'living_room':
        return <LivingRoomBackground />
      case 'chop_house':
        return <ChopHouseBackground />
      case 'park_sunset':
        return <ParkSunsetBackground isPlaying={isPlaying} bgMotion={activeBgMotion} />
      case 'street_buea':
      default:
        return <StreetBueaBackground isPlaying={isPlaying} bgMotion={activeBgMotion} />
    }
  }

  // Fallback 2D puppet stage if WebGL crashes or asset fails (NFR-8)
  const fallback2DStage = (
    <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-4">
      <div className={`flex items-end justify-center ${hasCharB ? 'w-1/2' : 'w-full'} h-[80%]`}>
        <PuppetCharacter characterId={normCharA} action={actionA} className="h-full" />
      </div>
      {hasCharB && normCharB && (
        <div className="w-1/2 h-[80%] flex items-end justify-center">
          <PuppetCharacter characterId={normCharB} action={actionB} facingLeft className="h-full" />
        </div>
      )}
    </div>
  )

  return (
    <div
      className={`relative w-full ${aspectRatio} rounded-3xl overflow-hidden shadow-2xl border border-white/10 select-none group ${className}`}
    >
      <style>{`
        @keyframes buea-scroll-left {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes buea-scroll-right {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @keyframes street-clouds {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>

      {/* Camera Zoom Stage Wrapper */}
      <div
        className={`relative w-full h-full transition-transform duration-700 ease-out origin-center ${
          activeBgMotion === 'zoom_in' ? 'scale-[1.14]' : 'scale-100'
        }`}
      >
        {/* 1. Theme Story Background */}
        {renderBackground()}

        {/* 2. Scene Center Prop (SVG Overlay) */}
        <ScenePropOverlay prop={activeProp} />

        {/* 3. Top Centered Mini Pill (BPM + Scene Action) */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white border border-white/10 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="capitalize">{normCharA.replace('_', ' ')}</span>
            {normCharB && (
              <>
                <span className="text-neutral-400">&</span>
                <span className="capitalize">{normCharB.replace('_', ' ')}</span>
              </>
            )}
            <span className="text-neutral-400">·</span>
            <span className="font-mono text-[#FACC15]">{bpm} BPM</span>
          </div>

          {isPlaying && (
            <div className="px-2 py-0.5 rounded-full bg-neutral-900/80 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider border border-[#F43F5E]/40 flex items-center gap-1 shadow">
              <span className="text-[#F43F5E]">✦</span>
              <span>{actionA}</span>
            </div>
          )}
        </div>

        {/* 4. Comic Speech Dialogue A: Top-Left (Tail pointing down-left toward Character A) */}
        {dialogueA && dialogueA.trim().length > 0 && (
          <div className="absolute top-3 left-3 max-w-[44%] z-20 flex flex-col items-start pointer-events-none animate-comic-pop">
            <div className="relative bg-white text-neutral-950 font-black text-[11px] sm:text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border-[2.5px] border-neutral-950 shadow-[3px_3px_0px_#000] text-left tracking-tight leading-snug">
              "{dialogueA}"
              <svg
                className="absolute -bottom-2.5 left-3 w-4 h-3.5 text-neutral-950 -rotate-[15deg] pointer-events-none"
                viewBox="0 0 16 14"
                fill="currentColor"
              >
                <path d="M0 0 L16 0 L4 14 Z" />
              </svg>
              <svg
                className="absolute -bottom-2 left-3.5 w-3.5 h-3 text-white -rotate-[15deg] pointer-events-none"
                viewBox="0 0 14 12"
                fill="currentColor"
              >
                <path d="M0 0 L14 0 L3 12 Z" />
              </svg>
            </div>
          </div>
        )}

        {/* 5. Comic Speech Dialogue B: Top-Right (Tail pointing down-right toward Character B) */}
        {dialogueB && dialogueB.trim().length > 0 && (
          <div className="absolute top-3 right-3 max-w-[44%] z-20 flex flex-col items-end pointer-events-none animate-comic-pop">
            <div className="relative bg-white text-neutral-950 font-black text-[11px] sm:text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border-[2.5px] border-neutral-950 shadow-[3px_3px_0px_#000] text-right tracking-tight leading-snug">
              "{dialogueB}"
              <svg
                className="absolute -bottom-2.5 right-3 w-4 h-3.5 text-neutral-950 rotate-[15deg] pointer-events-none"
                viewBox="0 0 16 14"
                fill="currentColor"
              >
                <path d="M0 0 L16 0 L12 14 Z" />
              </svg>
              <svg
                className="absolute -bottom-2 right-3.5 w-3.5 h-3 text-white rotate-[15deg] pointer-events-none"
                viewBox="0 0 14 12"
                fill="currentColor"
              >
                <path d="M0 0 L14 0 L11 12 Z" />
              </svg>
            </div>
          </div>
        )}

        {/* 6. Reaction Sticker: Bottom-Left (1.5s Auto-Fade) */}
        {visibleSticker && (
          <div
            onClick={() => onStickerTap && onStickerTap(visibleSticker)}
            className={`absolute bottom-3 left-3 z-30 transition-all duration-300 ease-out pointer-events-auto cursor-pointer ${
              stickerFading ? 'opacity-0 scale-90 translate-y-2' : 'opacity-100 scale-100 animate-comic-pop'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FACC15] text-neutral-950 font-black text-xs sm:text-sm border-[2.5px] border-neutral-950 shadow-[3px_3px_0px_#000] rotate-[-3deg] hover:scale-105 active:scale-95 transition-transform">
              <span className="text-sm">🔥</span>
              <span>{visibleSticker}</span>
            </div>
          </div>
        )}

        {/* 7. 3D Mixamo Interactive Storytelling Canvas Arena */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <CanvasErrorBoundary fallback={fallback2DStage}>
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                    <span className="text-[10px] font-mono text-neutral-300">Loading 3D Stage...</span>
                  </div>
                </div>
              }
            >
              <Canvas
                shadows
                camera={{ position: [0, 1.35, 4.3], fov: 38 }}
                gl={{ alpha: true, antialias: true }}
                style={{ pointerEvents: 'none' }}
              >
                {/* Balanced Three-Point Studio Lighting */}
                <ambientLight intensity={1.0} />
                <directionalLight
                  position={[2.5, 4.5, 3]}
                  intensity={1.4}
                  castShadow
                  shadow-mapSize-width={1024}
                  shadow-mapSize-height={1024}
                  shadow-camera-near={0.5}
                  shadow-camera-far={12}
                  shadow-camera-left={-2.5}
                  shadow-camera-right={2.5}
                  shadow-camera-top={3}
                  shadow-camera-bottom={-1}
                  shadow-bias={-0.0005}
                />
                <directionalLight position={[-2.5, 3, -2.5]} intensity={0.6} color="#E0F2FE" />

                {/* Soft Ground Shadow Plane */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
                  <planeGeometry args={[10, 10]} />
                  <shadowMaterial opacity={0.35} />
                </mesh>

                {/* Character A Actor */}
                <MixamoActor
                  characterId={normCharA}
                  action={actionA}
                  role="characterA"
                  hasPartner={hasCharB}
                  bpm={bpm}
                  isPlaying={isPlaying}
                />

                {/* Character B Actor */}
                {hasCharB && normCharB && (
                  <MixamoActor
                    characterId={normCharB}
                    action={actionB}
                    role="characterB"
                    hasPartner={true}
                    bpm={bpm}
                    isPlaying={isPlaying}
                  />
                )}
              </Canvas>
            </Suspense>
          </CanvasErrorBoundary>
        </div>
      </div>

      {/* 8. Playback Mode Click Overlay for Feed / Previews */}
      {mode === 'playback' && !isPlaying && (
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (onSeek) onSeek(clipStart)
            if (onTogglePlay) onTogglePlay()
          }}
          className="absolute inset-0 z-30 bg-black/35 hover:bg-black/20 transition-all flex items-center justify-center cursor-pointer group/btn"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 group-hover/btn:bg-white text-neutral-950 flex items-center justify-center shadow-2xl group-hover/btn:scale-110 active:scale-95 transition-transform">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-1" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* 9. Cropped Audio Window Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 z-30 overflow-hidden pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#536D56] via-[#FACC15] to-[#F43F5E] transition-all duration-75"
          style={{
            width: `${Math.min(100, Math.max(0, ((effectiveTime - clipStart) / clipDuration) * 100))}%`,
          }}
        />
      </div>
    </div>
  )
}
