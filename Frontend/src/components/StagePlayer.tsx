import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import type { MoveBlock, StoryBackground, StoryProp, StorySFX, BgMotion, ComicExpression } from '../types'
import { storySFX } from '../lib/audioUtils'
import { ComicCharacter, expressionFromAction, normalizeComicCharacterId } from './ComicCharacter'

export type BackgroundTheme = StoryBackground

export interface StagePlayerProps {
  characterId: string
  characterAId?: string
  characterBId?: string | null
  backgroundTheme?: StoryBackground | string
  bgMotion?: BgMotion
  prop?: StoryProp
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
// 1. Illustrated CSS / SVG Story Environments (NFR-2: Zero heavy images)
// -------------------------------------------------------------

/**
 * 1. Street Buea: Volcanic Mount Cameroon ridge, colonial arch buildings, palm trees, road divider, streetlamps
 */
const StreetBueaBackground: React.FC<{ isPlaying: boolean; bgMotion?: BgMotion }> = ({ isPlaying, bgMotion }) => {
  const isScrollingLeft = isPlaying && bgMotion === 'scroll_left'
  const isScrollingRight = isPlaying && bgMotion === 'scroll_right'

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#1E293B] via-[#334155] to-[#1E3A1E] overflow-hidden select-none">
      {/* Drifting Clouds */}
      <svg className="absolute top-2 w-[200%] h-12 opacity-35 animate-[street-clouds_32s_linear_infinite] pointer-events-none" viewBox="0 0 1000 60" preserveAspectRatio="none">
        <path d="M50 30 Q70 10 90 30 T130 30 Q145 15 160 30 Z M350 25 Q370 5 390 25 T430 25 Z M650 30 Q670 10 690 30 T730 30 Z M850 20 Q870 5 890 20 Z" fill="#E2E8F0" />
      </svg>

      {/* Mount Cameroon Volcanic Ridge */}
      <svg viewBox="0 0 800 240" preserveAspectRatio="none" className="absolute top-[8%] left-0 right-0 w-full h-[54%] pointer-events-none opacity-85">
        {/* Distant majestic mountain peak */}
        <polygon points="0,240 180,90 320,35 460,95 620,130 800,240" fill="#0F172A" />
        <polygon points="260,65 320,35 380,72 350,95 290,90" fill="#1E293B" opacity="0.6" />
        {/* Lush green foothills */}
        <path d="M0 240 Q150 160 300 190 T600 170 T800 210 L800 240 Z" fill="#14361C" />
      </svg>

      {/* Parallax Moving Street Layer (Buea Colonial Architecture, Palm Trees, Lamp Posts) */}
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
          {/* Colonial Storefronts & Buildings */}
          <rect x="30" y="40" width="130" height="120" fill="#2E3C2B" stroke="#162215" strokeWidth="2" />
          <rect x="50" y="60" width="30" height="40" rx="15" fill="#FACC15" fillOpacity="0.7" />
          <rect x="100" y="60" width="30" height="40" rx="15" fill="#FACC15" fillOpacity="0.7" />
          <polygon points="20,40 95,15 170,40" fill="#991B1B" />

          <rect x="230" y="55" width="160" height="105" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
          <rect x="250" y="75" width="40" height="30" fill="#38BDF8" fillOpacity="0.6" />
          <rect x="320" y="75" width="40" height="30" fill="#38BDF8" fillOpacity="0.6" />

          {/* Repeat Buildings on right half */}
          <rect x="830" y="40" width="130" height="120" fill="#2E3C2B" stroke="#162215" strokeWidth="2" />
          <rect x="850" y="60" width="30" height="40" rx="15" fill="#FACC15" fillOpacity="0.7" />
          <rect x="900" y="60" width="30" height="40" rx="15" fill="#FACC15" fillOpacity="0.7" />
          <polygon points="820,40 895,15 970,40" fill="#991B1B" />

          <rect x="1030" y="55" width="160" height="105" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
          <rect x="1050" y="75" width="40" height="30" fill="#38BDF8" fillOpacity="0.6" />
          <rect x="1120" y="75" width="40" height="30" fill="#38BDF8" fillOpacity="0.6" />

          {/* Tropical Palm Trees */}
          <path d="M190 160 Q193 100 200 40" stroke="#451A03" strokeWidth="6" fill="none" />
          <path d="M200 40 Q160 25 150 45 M200 40 Q180 15 180 5 M200 40 Q225 10 235 25 M200 40 Q240 30 245 50 M200 40 Q200 15 215 10" stroke="#15803D" strokeWidth="4" fill="none" />

          <path d="M990 160 Q993 100 1000 40" stroke="#451A03" strokeWidth="6" fill="none" />
          <path d="M1000 40 Q960 25 950 45 M1000 40 Q980 15 980 5 M1000 40 Q1025 10 1035 25 M1000 40 Q1040 30 1045 50" stroke="#15803D" strokeWidth="4" fill="none" />

          {/* Street Lampposts with warm halo */}
          <line x1="430" y1="160" x2="430" y2="45" stroke="#18181B" strokeWidth="3" />
          <circle cx="430" cy="45" r="5" fill="#FACC15" />
          <circle cx="430" cy="45" r="16" fill="#FACC15" fillOpacity="0.25" />

          <line x1="1230" y1="160" x2="1230" y2="45" stroke="#18181B" strokeWidth="3" />
          <circle cx="1230" cy="45" r="5" fill="#FACC15" />
          <circle cx="1230" cy="45" r="16" fill="#FACC15" fillOpacity="0.25" />

          {/* Sidewalk & Asphalt Road */}
          <rect x="0" y="160" width="1600" height="12" fill="#475569" />
          <rect x="0" y="172" width="1600" height="28" fill="#18181B" />
          <line x1="0" y1="186" x2="1600" y2="186" stroke="#FEF08A" strokeWidth="2.5" strokeDasharray="30 20" />
        </svg>
      </div>
    </div>
  )
}

/**
 * 2. Living Room: Cozy home parlor with doorway, picture window looking at Mount Cameroon, wall art, sofa silhouette
 */
const LivingRoomBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-[#291711] overflow-hidden select-none">
      {/* Wall with warm ochre & Cameroonian geometric texture */}
      <div className="absolute top-0 left-0 right-0 h-[72%] bg-gradient-to-b from-[#7C2D12] to-[#451A03] border-b-[6px] border-[#2E1005]">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FACC15_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Arched Door on the Left */}
        <div className="absolute bottom-0 left-[6%] w-16 sm:w-20 h-40 sm:h-48 rounded-t-full border-[3px] border-[#291711] bg-[#3B170B] shadow-inner">
          <div className="absolute top-1/2 right-2 w-2.5 h-2.5 rounded-full bg-[#FACC15] shadow" />
        </div>

        {/* Picture Window looking outside at Mount Cameroon */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-36 sm:w-48 h-24 sm:h-32 rounded-xl border-[4px] border-[#3B170B] bg-[#0F172A] overflow-hidden shadow-2xl">
          {/* View through window */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#38BDF8]/40 to-[#14532D]">
            <polygon points="10,120 70,40 120,70 180,120" fill="#0F172A" />
          </div>
          {/* Window pane crosses */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-[#3B170B]" />
          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-[#3B170B]" />
          {/* Curtains */}
          <div className="absolute top-0 bottom-0 left-0 w-4 bg-[#E11D48]/80 shadow" />
          <div className="absolute top-0 bottom-0 right-0 w-4 bg-[#E11D48]/80 shadow" />
        </div>

        {/* Framed Cameroon Art on Right */}
        <div className="absolute top-10 right-[8%] w-14 sm:w-18 h-18 sm:h-22 rounded-lg border-[3px] border-[#FACC15] bg-[#18181B] p-1 shadow-lg text-center flex flex-col items-center justify-center">
          <span className="text-sm sm:text-base">🇨🇲</span>
          <span className="text-[8px] font-black text-[#FACC15] tracking-wider mt-0.5">BUEA 237</span>
        </div>

        {/* Potted Monstera / Tropical Plant */}
        <div className="absolute bottom-0 right-[4%] w-12 h-20 pointer-events-none">
          <svg viewBox="0 0 50 80" className="w-full h-full">
            <path d="M25 80 L25 40 M25 50 Q10 35 5 45 M25 45 Q40 30 45 40 M25 35 Q15 20 20 15 M25 35 Q35 15 30 10" stroke="#16A34A" strokeWidth="3" fill="none" />
            <polygon points="15,80 35,80 38,60 12,60" fill="#D97706" />
          </svg>
        </div>
      </div>

      {/* Parquet Hardwood Floor with Traditional Wax-Print Rug */}
      <div className="absolute bottom-0 w-full h-[28%] bg-gradient-to-t from-[#1A0B05] to-[#2E1005]">
        {/* Cameroonian Geometric Wax-Print Rug in center */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[68%] h-[65%] rounded-2xl bg-gradient-to-r from-[#D97706] via-[#B91C1C] to-[#047857] border-[2px] border-[#FACC15] shadow-lg flex items-center justify-center opacity-85">
          <div className="w-[85%] h-[60%] border border-[#FEF08A] rounded-xl border-dashed" />
        </div>
      </div>
    </div>
  )
}

/**
 * 3. Chop House: Local Cameroonian café & bar scene with chalkboard menu, counter, string lights
 */
const ChopHouseBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-[#1C0E07] overflow-hidden select-none">
      {/* Warm Timber Walls */}
      <div className="absolute top-0 left-0 right-0 h-[70%] bg-gradient-to-b from-[#3D1E0C] to-[#261105]">
        {/* Festive String Fairy Lights along ceiling */}
        <svg viewBox="0 0 400 30" preserveAspectRatio="none" className="absolute top-0 left-0 right-0 w-full h-7">
          <path d="M0 5 Q50 20 100 5 Q150 20 200 5 Q250 20 300 5 Q350 20 400 5" stroke="#52525B" strokeWidth="1.5" fill="none" />
          {[25, 75, 125, 175, 225, 275, 325, 375].map((cx, i) => (
            <g key={i}>
              <circle cx={cx} cy={14} r="4" fill={i % 2 === 0 ? '#FACC15' : '#F43F5E'} />
              <circle cx={cx} cy={14} r="10" fill={i % 2 === 0 ? '#FACC15' : '#F43F5E'} fillOpacity="0.25" />
            </g>
          ))}
        </svg>

        {/* Large Chalkboard Menu in Center */}
        <div className="absolute top-9 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-24 sm:h-28 rounded-xl border-[4px] border-[#78350F] bg-[#18181B] p-2 shadow-2xl text-center flex flex-col justify-center">
          <div className="text-[10px] sm:text-xs font-black text-[#FACC15] tracking-widest border-b border-[#3F3F46] pb-1 uppercase">
            ★ Chez Tantie · 237 Delices ★
          </div>
          <div className="text-[8px] sm:text-[9px] text-[#A1A1AA] font-mono mt-1 space-y-0.5">
            <div>NDOLÉ & PLANTAIN · 1,500 FCFA</div>
            <div>POISSON BRAISÉ & BATON · 2,000 FCFA</div>
            <div>SOYA CHAUD & PIMENT · 500 FCFA</div>
          </div>
        </div>

        {/* Bar Counter Shelves */}
        <div className="absolute bottom-2 left-6 right-6 h-6 border-t-2 border-[#78350F] flex justify-around items-end px-4">
          <div className="w-3 h-5 rounded-t bg-[#059669]/70" />
          <div className="w-2.5 h-6 rounded-t bg-[#D97706]/70" />
          <div className="w-3 h-5 rounded-t bg-[#E11D48]/70" />
          <div className="w-2.5 h-6 rounded-t bg-[#0284C7]/70" />
        </div>
      </div>

      {/* Checkerboard Bistro Floor */}
      <div className="absolute bottom-0 w-full h-[30%] bg-[#221008] border-t-2 border-[#78350F]">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,#29140B_25%,transparent_25%),linear-gradient(-45deg,#29140B_25%,transparent_25%)] [background-size:24px_24px] opacity-70" />
      </div>
    </div>
  )
}

/**
 * 4. Park Sunset: Botanical mountain park with orange-red sunset gradient, rolling hills, umbrella trees, lampposts
 */
const ParkSunsetBackground: React.FC<{ isPlaying: boolean; bgMotion?: BgMotion }> = ({ isPlaying, bgMotion }) => {
  const isScrollingLeft = isPlaying && bgMotion === 'scroll_left'
  const isScrollingRight = isPlaying && bgMotion === 'scroll_right'

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#311042] via-[#9A3412] to-[#D97706] overflow-hidden select-none">
      {/* Golden Glowing Sunset Disc */}
      <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-t from-[#F59E0B] to-[#FEF08A] blur-[1px] shadow-[0_0_60px_#F59E0B] pointer-events-none" />

      {/* Mountain Ridge Silhouette */}
      <svg viewBox="0 0 800 160" preserveAspectRatio="none" className="absolute top-[28%] left-0 right-0 w-full h-32 pointer-events-none opacity-80">
        <polygon points="0,160 120,70 280,30 450,80 620,50 800,160" fill="#2E1065" />
      </svg>

      {/* Moving Park Layer: Lush Green Canopy & Cobblestone Path */}
      <div
        className={`absolute bottom-0 w-[200%] h-[52%] pointer-events-none ${
          isScrollingLeft
            ? 'animate-[buea-scroll-left_7s_linear_infinite]'
            : isScrollingRight
            ? 'animate-[buea-scroll-right_7s_linear_infinite]'
            : ''
        }`}
      >
        <svg viewBox="0 0 1600 180" preserveAspectRatio="none" className="w-full h-full">
          {/* Lush Green Hills */}
          <path d="M0 140 Q200 80 400 120 T800 90 T1200 110 T1600 130 L1600 180 L0 180 Z" fill="#14361C" />

          {/* Tropical Umbrella Trees */}
          <path d="M120 140 L124 70 M124 70 Q90 50 80 60 M124 70 Q160 50 170 60 M124 70 Q124 35 124 30" stroke="#261005" strokeWidth="5" fill="none" />
          <ellipse cx="124" cy="45" rx="50" ry="18" fill="#15803D" />

          <path d="M920 140 L924 70" stroke="#261005" strokeWidth="5" fill="none" />
          <ellipse cx="924" cy="45" rx="50" ry="18" fill="#15803D" />

          {/* Classic Park Lampposts */}
          <line x1="320" y1="140" x2="320" y2="40" stroke="#18181B" strokeWidth="3" />
          <circle cx="320" cy="40" r="5" fill="#FEF08A" />
          <circle cx="320" cy="40" r="14" fill="#FEF08A" fillOpacity="0.3" />

          <line x1="1120" y1="140" x2="1120" y2="40" stroke="#18181B" strokeWidth="3" />
          <circle cx="1120" cy="40" r="5" fill="#FEF08A" />
          <circle cx="1120" cy="40" r="14" fill="#FEF08A" fillOpacity="0.3" />

          {/* Cobblestone Stone Path */}
          <path d="M0 150 Q400 140 800 155 T1600 150 L1600 180 L0 180 Z" fill="#451A03" />
        </svg>
      </div>
    </div>
  )
}

// Legacy Swatch Backgrounds
const SageStarburstBackground: React.FC = () => (
  <div className="absolute inset-0 bg-[#536D56] overflow-hidden select-none">
    <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#F43F5E]/30 blur-2xl" />
    <div className="absolute bottom-0 w-full h-[28%] bg-[#202d22]" />
  </div>
)
const AmberSunsetBackground: React.FC = () => (
  <div className="absolute inset-0 bg-gradient-to-b from-[#2E1065] via-[#9A3412] to-[#D97706] overflow-hidden select-none">
    <div className="absolute bottom-0 w-full h-[28%] bg-[#1b0802]" />
  </div>
)
const SlateNightBackground: React.FC = () => (
  <div className="absolute inset-0 bg-gradient-to-b from-[#090D16] via-[#0F172A] to-[#1E1B4B] overflow-hidden select-none">
    <div className="absolute bottom-0 w-full h-[28%] bg-[#080d1a]" />
  </div>
)
const LavenderHazeBackground: React.FC = () => (
  <div className="absolute inset-0 bg-gradient-to-b from-[#3B0764] via-[#701A75] to-[#831843] overflow-hidden select-none">
    <div className="absolute bottom-0 w-full h-[28%] bg-[#1a052e]" />
  </div>
)

// -------------------------------------------------------------
// 2. Scene Props Component (SVG Overlay)
// -------------------------------------------------------------

const ScenePropOverlay: React.FC<{ prop?: StoryProp | string }> = ({ prop }) => {
  if (!prop || prop === 'none') return null
  return (
    <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-15 pointer-events-none drop-shadow-[0_10px_14px_rgba(0,0,0,0.6)] animate-comic-pop transition-all duration-300">
      {prop === 'phone' && (
        <svg viewBox="0 0 60 100" className="w-9 h-15 sm:w-11 sm:h-18">
          <rect x="2" y="2" width="56" height="96" rx="10" fill="#18181B" stroke="#FACC15" strokeWidth="2.5" />
          <rect x="6" y="10" width="48" height="76" rx="4" fill="#0284C7" />
          <rect x="10" y="24" width="40" height="22" rx="4" fill="#FFFFFF" />
          <text x="14" y="38" fontSize="8" fontWeight="bold" fill="#000">1 New Msg 💬</text>
          <circle cx="30" cy="92" r="3" fill="#71717A" />
          <circle cx="48" cy="18" r="4" fill="#EF4444" />
        </svg>
      )}
      {prop === 'gift_box' && (
        <svg viewBox="0 0 90 90" className="w-13 h-13 sm:w-16 sm:h-16">
          <rect x="10" y="30" width="70" height="55" rx="6" fill="#E11D48" stroke="#18181B" strokeWidth="3" />
          <rect x="5" y="22" width="80" height="15" rx="4" fill="#BE123C" stroke="#18181B" strokeWidth="3" />
          <rect x="40" y="22" width="10" height="63" fill="#FACC15" />
          <path d="M45 22 C35 6 16 12 35 22 Z" fill="#FACC15" stroke="#18181B" strokeWidth="2" />
          <path d="M45 22 C55 6 74 12 55 22 Z" fill="#FACC15" stroke="#18181B" strokeWidth="2" />
          <circle cx="45" cy="22" r="4" fill="#CA8A04" />
        </svg>
      )}
      {prop === 'table' && (
        <svg viewBox="0 0 120 80" className="w-20 h-14 sm:w-26 sm:h-18">
          <ellipse cx="60" cy="20" rx="56" ry="14" fill="#78350F" stroke="#18181B" strokeWidth="3" />
          <ellipse cx="60" cy="18" rx="50" ry="11" fill="#92400E" />
          <rect x="55" y="24" width="10" height="48" fill="#451A03" stroke="#18181B" strokeWidth="2.5" />
          <ellipse cx="60" cy="72" rx="28" ry="6" fill="#451A03" stroke="#18181B" strokeWidth="2.5" />
          <rect x="42" y="10" width="8" height="12" rx="2" fill="#E0F2FE" fillOpacity="0.8" stroke="#0284C7" strokeWidth="1" />
          <rect x="70" y="10" width="8" height="12" rx="2" fill="#FEF08A" fillOpacity="0.8" stroke="#CA8A04" strokeWidth="1" />
        </svg>
      )}
      {prop === 'car' && (
        <svg viewBox="0 0 140 70" className="w-24 h-12 sm:w-30 sm:h-15">
          <path d="M10 50 L25 28 L50 20 L95 20 L115 32 L132 45 L132 55 L10 55 Z" fill="#FACC15" stroke="#18181B" strokeWidth="3" />
          <path d="M30 30 L50 24 L50 42 L24 42 Z" fill="#0284C7" fillOpacity="0.7" stroke="#18181B" strokeWidth="1.5" />
          <path d="M55 24 L90 24 L108 34 L108 42 L55 42 Z" fill="#0284C7" fillOpacity="0.7" stroke="#18181B" strokeWidth="1.5" />
          <circle cx="35" cy="54" r="11" fill="#18181B" />
          <circle cx="35" cy="54" r="5" fill="#E4E4E7" />
          <circle cx="108" cy="54" r="11" fill="#18181B" />
          <circle cx="108" cy="54" r="5" fill="#E4E4E7" />
          <rect x="62" y="14" width="22" height="7" rx="2" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
          <text x="65" y="20" fontSize="5" fontWeight="bold" fill="#000">TAXI</text>
        </svg>
      )}
    </div>
  )
}

// -------------------------------------------------------------
// 3. Main StagePlayer Component (Motion-Comic Stage Engine)
// -------------------------------------------------------------

export const StagePlayer: React.FC<StagePlayerProps> = ({
  characterId,
  characterAId,
  characterBId,
  backgroundTheme = 'street_buea',
  bgMotion = 'static',
  prop = 'none',
  movesTimeline = [],
  bpm = 110,
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
  const [rafTime, setRafTime] = useState(0)

  // Auto-fading reaction sticker state (1.5s auto-fade)
  const [visibleSticker, setVisibleSticker] = useState<string | null>(sticker || null)
  const [stickerFading, setStickerFading] = useState(false)

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

  // Determine cropped audio window from movesTimeline (NFR-2, FR-20 - FR-24)
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

  // Sync to HTML5 <audio>.currentTime via requestAnimationFrame, with fallback timer if muted/unavailable
  const isLoopingRef = useRef(false)
  const lastRafTimeRef = useRef(0)
  const fallbackTimeRef = useRef(clipStart)
  const lastFrameTsRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      isLoopingRef.current = false
      lastFrameTsRef.current = null
      fallbackTimeRef.current = currentTime >= clipStart && currentTime < clipEnd ? currentTime : clipStart
      return
    }

    fallbackTimeRef.current = currentTime >= clipStart && currentTime < clipEnd ? currentTime : clipStart
    lastFrameTsRef.current = performance.now()

    let rafId: number
    const loop = (now: number) => {
      const dt = lastFrameTsRef.current ? Math.min(0.1, (now - lastFrameTsRef.current) / 1000) : 0
      lastFrameTsRef.current = now

      const audioActive =
        audioElement &&
        !isNaN(audioElement.currentTime) &&
        !audioElement.paused &&
        !audioElement.ended

      let cur: number
      if (audioActive && audioElement) {
        cur = audioElement.currentTime
        fallbackTimeRef.current = cur
      } else {
        fallbackTimeRef.current += dt
        cur = fallbackTimeRef.current
      }

      // End of cropped clip reached -> loop or stop cleanly
      if (cur >= clipEnd) {
        if (!isLoopingRef.current) {
          isLoopingRef.current = true
          if (mode === 'studio') {
            if (audioElement) {
              try {
                audioElement.currentTime = clipStart
              } catch (e) {
                console.warn('Seek error during loop:', e)
              }
            }
            fallbackTimeRef.current = clipStart
            lastRafTimeRef.current = clipStart
            setRafTime(clipStart)

            if (audioElement) {
              const onSeeked = () => {
                audioElement.removeEventListener('seeked', onSeeked)
                isLoopingRef.current = false
              }
              audioElement.addEventListener('seeked', onSeeked, { once: true })
              setTimeout(() => {
                isLoopingRef.current = false
              }, 250)
            } else {
              isLoopingRef.current = false
            }
          } else {
            if (audioElement) {
              audioElement.pause()
              try {
                audioElement.currentTime = clipStart
              } catch {}
            }
            fallbackTimeRef.current = clipStart
            lastRafTimeRef.current = clipStart
            setRafTime(clipStart)
            isLoopingRef.current = false
            if (onTogglePlay) onTogglePlay()
            return
          }
        }
      } else {
        // Throttle React state updates to ~25-30fps for smooth performance
        if (Math.abs(cur - lastRafTimeRef.current) >= 0.035) {
          lastRafTimeRef.current = cur
          setRafTime(cur)
        }
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
      isLoopingRef.current = false
      lastFrameTsRef.current = null
    }
  }, [isPlaying, audioElement, clipStart, clipEnd, mode, onTogglePlay])

  // Effective time used for scene playback
  const effectiveTime = isPlaying ? rafTime : currentTime

  // Active scene block & index determination from movesTimeline
  const activeSceneIndex = useMemo(() => {
    if (!movesTimeline || movesTimeline.length === 0) return 0
    const idx = movesTimeline.findIndex((m) => effectiveTime >= m.start && effectiveTime < m.end)
    return idx !== -1 ? idx : 0
  }, [movesTimeline, effectiveTime])

  const activeBlock = movesTimeline?.[activeSceneIndex] || null

  // Per-scene character resolution (falls back to StagePlayer props)
  const normCharA = normalizeComicCharacterId(
    activeBlock?.charA_id || characterAId || characterId || 'mboa_boy'
  )
  const rawCharB =
    activeBlock?.charB_id !== undefined ? activeBlock.charB_id : characterBId
  const normCharB =
    rawCharB && rawCharB !== 'none' ? normalizeComicCharacterId(rawCharB) : null
  const hasCharB = Boolean(normCharB)

  // Extract Scene Properties & Expressions
  const actionA: string = activeBlock?.charA_action || activeBlock?.action || 'approach'
  const actionB: string = activeBlock?.charB_action || (hasCharB ? 'turn_around' : 'none')
  const exprA: ComicExpression =
    (activeBlock?.charA_expression as ComicExpression) || expressionFromAction(actionA)
  const exprB: ComicExpression =
    (activeBlock?.charB_expression as ComicExpression) || expressionFromAction(actionB)
  const activeBg: StoryBackground | string = activeBlock?.bg || backgroundTheme || 'street_buea'
  const activeBgMotion: BgMotion = activeBlock?.bgMotion || bgMotion || 'static'
  const activeProp: StoryProp | string = activeBlock?.prop || prop || 'none'
  const dialogueA: string | undefined =
    activeBlock?.dialogueA || captionA || (!activeBlock?.dialogueB ? caption : undefined)
  const dialogueB: string | undefined = activeBlock?.dialogueB || captionB

  // Sound Effects (SFX) trigger once on block entry
  const lastPlayedSFXBlockRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isPlaying) {
      lastPlayedSFXBlockRef.current = null
      return
    }
    if (!activeBlock) return
    if (activeSceneIndex !== -1 && activeSceneIndex !== lastPlayedSFXBlockRef.current) {
      lastPlayedSFXBlockRef.current = activeSceneIndex
      if (activeBlock.sfx && activeBlock.sfx !== 'none') {
        storySFX.play(activeBlock.sfx as StorySFX)
      }
    }
  }, [isPlaying, activeBlock, activeSceneIndex])

  // Render Background Environment
  const renderBackground = () => {
    switch (activeBg) {
      case 'living_room':
        return <LivingRoomBackground />
      case 'chop_house':
        return <ChopHouseBackground />
      case 'park_sunset':
        return <ParkSunsetBackground isPlaying={isPlaying} bgMotion={activeBgMotion} />
      case 'sage_starburst':
        return <SageStarburstBackground />
      case 'amber_sunset':
        return <AmberSunsetBackground />
      case 'slate_night':
        return <SlateNightBackground />
      case 'lavender_haze':
        return <LavenderHazeBackground />
      case 'street_buea':
      default:
        return <StreetBueaBackground isPlaying={isPlaying} bgMotion={activeBgMotion} />
    }
  }

  return (
    <div
      className={`relative w-full ${aspectRatio} rounded-3xl overflow-hidden shadow-2xl border border-white/10 select-none group ${className}`}
    >
      {/* 0. Scoped CSS Animations for Parallax Scrolling & Camera Zoom */}
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

      {/* Camera Pan/Zoom Stage Wrapper */}
      <div
        className={`relative w-full h-full transition-transform duration-700 ease-out origin-center ${
          activeBgMotion === 'zoom_in' ? 'scale-[1.12]' : 'scale-100'
        }`}
      >
        {/* 1. Theme Story Background with subtle smooth cinematic pan/zoom */}
        <motion.div
          key={`bg-${activeBg}-${activeSceneIndex}`}
          initial={{ opacity: 0.85, scale: 1.02 }}
          animate={
            isPlaying
              ? {
                  opacity: 1,
                  scale: [1.0, 1.06, 1.03],
                  x: [0, -8, 6, 0],
                }
              : { opacity: 1, scale: 1, x: 0 }
          }
          transition={
            isPlaying
              ? {
                  opacity: { duration: 0.35 },
                  scale: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
                  x: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
                }
              : { duration: 0.3 }
          }
          className="absolute inset-0 w-full h-full"
        >
          {renderBackground()}
        </motion.div>

        {/* 2. Scene Center Prop (SVG Overlay) */}
        <ScenePropOverlay prop={activeProp} />

        {/* 3. Top Centered Mini Pill (Scene + Cast + BPM) */}
        <div className="hidden sm:flex absolute top-2 left-1/2 -translate-x-1/2 z-30 items-center gap-1.5 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white border border-white/10 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Scene {activeSceneIndex + 1}</span>
            <span className="text-neutral-400">·</span>
            <span className="font-mono text-[#FACC15]">{bpm} BPM</span>
          </div>
        </div>

        {/* 4. Comic Speech Dialogue A: Top-Left (Tail pointing down-left toward Character A) */}
        {dialogueA && dialogueA.trim().length > 0 && (
          <motion.div
            key={`dlgA-${activeSceneIndex}-${dialogueA}`}
            initial={{ opacity: 0, scale: 0.78, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 24 }}
            className="absolute top-3 left-3 max-w-[44%] z-20 flex flex-col items-start pointer-events-none"
          >
            <div className="relative bg-white text-neutral-950 font-black text-[11px] sm:text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border-[2.5px] border-neutral-950 shadow-[3px_3px_0px_#000] text-left tracking-tight leading-snug">
              "{dialogueA}"
              {/* Tail pointing down-left toward Character 1 */}
              <svg className="absolute -bottom-2.5 left-4 w-4 h-3.5 text-neutral-950 -rotate-[15deg] pointer-events-none" viewBox="0 0 16 14" fill="currentColor">
                <path d="M0 0 L16 0 L4 14 Z" />
              </svg>
              <svg className="absolute -bottom-2 left-[18px] w-3.5 h-3 text-white -rotate-[15deg] pointer-events-none" viewBox="0 0 14 12" fill="currentColor">
                <path d="M0 0 L14 0 L3 12 Z" />
              </svg>
            </div>
          </motion.div>
        )}

        {/* 5. Comic Speech Dialogue B: Top-Right (Tail pointing down-right toward Character B) */}
        {dialogueB && dialogueB.trim().length > 0 && (
          <motion.div
            key={`dlgB-${activeSceneIndex}-${dialogueB}`}
            initial={{ opacity: 0, scale: 0.78, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 24, delay: 0.05 }}
            className="absolute top-3 right-3 max-w-[44%] z-20 flex flex-col items-end pointer-events-none"
          >
            <div className="relative bg-white text-neutral-950 font-black text-[11px] sm:text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl border-[2.5px] border-neutral-950 shadow-[3px_3px_0px_#000] text-right tracking-tight leading-snug">
              "{dialogueB}"
              {/* Tail pointing down-right toward Character 2 */}
              <svg className="absolute -bottom-2.5 right-4 w-4 h-3.5 text-neutral-950 rotate-[15deg] pointer-events-none" viewBox="0 0 16 14" fill="currentColor">
                <path d="M0 0 L16 0 L12 14 Z" />
              </svg>
              <svg className="absolute -bottom-2 right-[18px] w-3.5 h-3 text-white rotate-[15deg] pointer-events-none" viewBox="0 0 14 12" fill="currentColor">
                <path d="M0 0 L14 0 L11 12 Z" />
              </svg>
            </div>
          </motion.div>
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

        {/* 7. Motion-Comic Character Stage: Crisp Pop-In on Scene Switch */}
        <div className="absolute inset-0 z-10 flex items-end justify-center pt-12 pb-2 sm:pb-3 pointer-events-none overflow-hidden">
          {/* CHARACTER 1 (Left side in 2-char mode, or centered in solo mode) */}
          <motion.div
            key={`charA-${activeSceneIndex}-${normCharA}-${exprA}`}
            className={`absolute bottom-2 sm:bottom-3 flex items-end justify-center ${
              hasCharB
                ? 'left-[6%] sm:left-[12%] w-32 sm:w-44 md:w-52 h-[66%] sm:h-[74%]'
                : 'left-1/2 -translate-x-1/2 w-40 sm:w-52 md:w-60 h-[70%] sm:h-[76%]'
            }`}
            initial={{ opacity: 0, scale: 0.84, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            style={{ transformOrigin: 'bottom center' }}
          >
            <ComicCharacter
              characterId={normCharA}
              expression={exprA}
              flip={false}
              className="w-full h-full"
            />
          </motion.div>

          {/* CHARACTER 2 (Right side, mirrored via flip={true} to face Character 1) */}
          {hasCharB && normCharB && (
            <motion.div
              key={`charB-${activeSceneIndex}-${normCharB}-${exprB}`}
              className="absolute bottom-2 sm:bottom-3 right-[6%] sm:right-[12%] w-32 sm:w-44 md:w-52 h-[66%] sm:h-[74%] flex items-end justify-center"
              initial={{ opacity: 0, scale: 0.84, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24, delay: 0.04 }}
              style={{ transformOrigin: 'bottom center' }}
            >
              <ComicCharacter
                characterId={normCharB}
                expression={exprB}
                flip={true}
                className="w-full h-full"
              />
            </motion.div>
          )}
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
          <motion.div
            whileTap={{ scale: 0.92 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/90 group-hover/btn:bg-white text-neutral-950 flex items-center justify-center shadow-2xl group-hover/btn:scale-110 transition-transform"
          >
            <svg className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-1" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </motion.div>
        </div>
      )}

      {/* 9. Cropped Audio Window Progress Bar (subtle indicator) */}
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
