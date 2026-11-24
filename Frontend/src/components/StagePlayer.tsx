import React, { useState, useEffect, useMemo } from 'react'
import type { MoveBlock } from '../types'

export type BackgroundTheme =
  | 'sage_starburst'
  | 'amber_sunset'
  | 'slate_night'
  | 'lavender_haze'

export interface StagePlayerProps {
  characterId: string
  backgroundTheme?: BackgroundTheme | string
  movesTimeline?: MoveBlock[]
  bpm?: number
  currentTime?: number
  isPlaying?: boolean
  caption?: string
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

// Normalize character ID to match asset names
export function normalizeCharacterId(rawId?: string): 'tantie' | 'mboa_boy' | 'pa_buea' {
  if (!rawId) return 'tantie'
  const lower = rawId.toLowerCase().trim()
  if (lower.includes('tantie') || lower.includes('girl') || lower.includes('mama')) {
    return 'tantie'
  }
  if (lower.includes('buea') || lower.includes('pa') || lower.includes('elder')) {
    return 'pa_buea'
  }
  return 'mboa_boy'
}

// -------------------------------------------------------------
// Pure CSS & SVG Stage Background Components (NFR-2: Zero heavy images)
// -------------------------------------------------------------

const SageStarburstBackground: React.FC<{ isPlaying: boolean; bpm: number }> = ({ isPlaying, bpm }) => {
  // Pulsing coral-pink #F43F5E starburst over muted olive-sage #536D56
  const pulseDuration = bpm > 0 ? (60 / bpm) * 2 : 1.2
  return (
    <div className="absolute inset-0 bg-[#536D56] overflow-hidden select-none">
      {/* Radial vignette / lighting */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/60 pointer-events-none" />

      {/* SVG Geometric Starburst with Coral #F43F5E rays */}
      <svg
        viewBox="0 0 400 400"
        className={`absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] pointer-events-none transition-transform duration-300 ${
          isPlaying ? 'animate-starburst-pulse' : 'opacity-70'
        }`}
        style={{
          animationDuration: `${pulseDuration}s`,
        }}
      >
        <defs>
          <radialGradient id="starburst-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#F43F5E" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform="translate(200, 200)">
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16
            return (
              <polygon
                key={i}
                points="0,0 -22,-200 22,-200"
                fill="url(#starburst-grad)"
                transform={`rotate(${angle})`}
              />
            )
          })}
          {/* Central Coral Glow Disc */}
          <circle cx="0" cy="0" r="45" fill="#F43F5E" fillOpacity="0.3" />
        </g>
      </svg>

      {/* Halftone / Comic Dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#FACC15 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Stage Floor */}
      <div className="absolute bottom-0 w-full h-[28%] bg-gradient-to-t from-[#202d22] via-[#334636] to-transparent border-t border-[#FACC15]/20">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FACC15]/60 to-transparent" />
      </div>
    </div>
  )
}

const AmberSunsetBackground: React.FC<{ isPlaying: boolean; bpm: number }> = ({ isPlaying, bpm }) => {
  const pulseDuration = bpm > 0 ? 60 / bpm : 0.6
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#2E1065] via-[#9A3412] to-[#D97706] overflow-hidden select-none">
      {/* Sun Disc */}
      <div
        className={`absolute top-[18%] left-1/2 -translate-x-1/2 w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-t from-[#F59E0B] to-[#FEF08A] blur-[1px] shadow-[0_0_60px_#F59E0B] pointer-events-none transition-transform duration-200 ${
          isPlaying ? 'scale-105' : 'scale-100'
        }`}
        style={{
          transitionDuration: `${pulseDuration}s`,
        }}
      />

      {/* Radiant Horizon Glow */}
      <div className="absolute bottom-[24%] left-0 right-0 h-24 bg-gradient-to-t from-[#F59E0B]/40 to-transparent blur-md" />

      {/* Mountain & Acacia Silhouette Horizon */}
      <svg
        viewBox="0 0 600 120"
        preserveAspectRatio="none"
        className="absolute bottom-[22%] w-full h-16 pointer-events-none opacity-90"
      >
        <path
          d="M0 120 L0 80 Q100 40 200 70 T400 65 T600 80 L600 120 Z"
          fill="#261005"
        />
        {/* Acacia Trees Silhouettes */}
        <path
          d="M120 70 L122 55 Q115 48 105 45 Q125 35 145 45 Q135 50 126 55 L126 70 Z"
          fill="#1c0b03"
        />
        <path
          d="M480 72 L482 58 Q475 52 468 50 Q485 42 502 50 Q495 55 486 58 L486 72 Z"
          fill="#1c0b03"
        />
      </svg>

      {/* Stage Floor */}
      <div className="absolute bottom-0 w-full h-[28%] bg-gradient-to-t from-[#1b0802] via-[#431407] to-transparent border-t border-[#F59E0B]/30">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent" />
      </div>
    </div>
  )
}

const SlateNightBackground: React.FC<{ isPlaying: boolean; bpm: number }> = ({ isPlaying, bpm }) => {
  const pulseDuration = bpm > 0 ? (60 / bpm) * 2 : 1.2
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#090D16] via-[#0F172A] to-[#1E1B4B] overflow-hidden select-none">
      {/* Cyan & Lime Spotlights */}
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <linearGradient id="cyan-beam" x1="0%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lime-beam" x1="100%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#84CC16" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#84CC16" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#84CC16" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Left Cyan Spotlight Cone */}
        <polygon
          points="20,0 70,0 230,350 130,350"
          fill="url(#cyan-beam)"
          className={`transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-60'}`}
          style={{ animation: isPlaying ? `starburstPulse ${pulseDuration}s infinite alternate` : 'none' }}
        />

        {/* Right Lime Spotlight Cone */}
        <polygon
          points="380,0 330,0 170,350 270,350"
          fill="url(#lime-beam)"
          className={`transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-60'}`}
          style={{ animation: isPlaying ? `starburstPulse ${pulseDuration * 1.1}s infinite alternate` : 'none' }}
        />
      </svg>

      {/* Floating stage particles */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-[#06B6D4] blur-[1px] animate-pulse" />
      <div className="absolute top-1/3 right-1/4 w-2.5 h-2.5 rounded-full bg-[#84CC16] blur-[1px] animate-pulse" />

      {/* Glossy Club Dance Floor */}
      <div className="absolute bottom-0 w-full h-[28%] bg-gradient-to-t from-[#020617] via-[#0F172A] to-transparent border-t border-[#06B6D4]/40">
        {/* Reflection Highlight Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#06B6D4] to-transparent" />
        {/* Specular Floor Oval */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-48 h-6 bg-cyan-400/20 blur-md rounded-full pointer-events-none" />
      </div>
    </div>
  )
}

const LavenderHazeBackground: React.FC<{ isPlaying: boolean; bpm: number }> = ({ isPlaying, bpm }) => {
  const pulseDuration = bpm > 0 ? (60 / bpm) * 2 : 1.5
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#2E1065] via-[#7C3AED] to-[#DB2777] overflow-hidden select-none">
      {/* Floating Glowing Bokeh Orbs */}
      <div
        className={`absolute top-[12%] left-[15%] w-32 h-32 rounded-full bg-[#C084FC]/40 blur-2xl pointer-events-none transition-transform duration-500 ${
          isPlaying ? 'scale-110' : 'scale-100'
        }`}
        style={{ transitionDuration: `${pulseDuration}s` }}
      />
      <div
        className={`absolute top-[25%] right-[10%] w-40 h-40 rounded-full bg-[#F472B6]/35 blur-2xl pointer-events-none transition-transform duration-500 ${
          isPlaying ? 'scale-115' : 'scale-95'
        }`}
        style={{ transitionDuration: `${pulseDuration * 1.2}s` }}
      />
      <div className="absolute top-[40%] left-[35%] w-28 h-28 rounded-full bg-[#34D399]/25 blur-xl pointer-events-none" />

      {/* Stage Floor */}
      <div className="absolute bottom-0 w-full h-[28%] bg-gradient-to-t from-[#18032E] via-[#3B0764] to-transparent border-t border-[#C084FC]/30">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F472B6] to-transparent" />
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// Clean Inline SVG Fallbacks for Tantie, Mboa Boy, Pa Buea (FR-20, FR-21)
// -------------------------------------------------------------

const InlineCharacterSVG: React.FC<{
  character: 'tantie' | 'mboa_boy' | 'pa_buea'
  isPoseB: boolean
}> = ({ character, isPoseB }) => {
  if (character === 'tantie') {
    return isPoseB ? (
      <svg viewBox="0 0 240 320" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
        <ellipse cx="120" cy="305" rx="50" ry="9" fill="#000000" fillOpacity="0.3" />
        <path d="M86 284 C81 284 76 291 79 298 C82 301 100 301 101 296 C101 290 92 284 86 284 Z" fill="#D97706" stroke="#18181B" strokeWidth="2.5" />
        <path d="M152 284 C147 284 142 291 145 298 C148 301 166 301 167 296 C167 290 158 284 152 284 Z" fill="#D97706" stroke="#18181B" strokeWidth="2.5" />
        <path d="M96 236 L92 288" stroke="#6B4423" strokeWidth="12" strokeLinecap="round" />
        <path d="M144 236 L148 288" stroke="#6B4423" strokeWidth="12" strokeLinecap="round" />
        <path d="M80 142 C68 172 65 212 60 246 C85 254 165 254 190 246 C182 212 176 172 160 142 Z" fill="#536D56" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M75 186 Q122 198 172 186" stroke="#FACC15" strokeWidth="4" strokeDasharray="8 6" />
        <path d="M68 221 Q122 234 180 221" stroke="#F43F5E" strokeWidth="4" strokeDasharray="10 6" />
        <circle cx="122" cy="170" r="9" fill="#FACC15" stroke="#18181B" strokeWidth="2" />
        <circle cx="100" cy="210" r="7" fill="#F43F5E" stroke="#18181B" strokeWidth="2" />
        <circle cx="150" cy="210" r="7" fill="#F43F5E" stroke="#18181B" strokeWidth="2" />
        <path d="M80 144 Q52 115 45 88 Q55 80 64 92" fill="none" stroke="#6B4423" strokeWidth="13" strokeLinecap="round" />
        <path d="M80 144 Q52 115 45 88 Q55 80 64 92" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="48" cy="100" r="7" fill="none" stroke="#FACC15" strokeWidth="3.5" />
        <path d="M160 144 Q188 115 195 88 Q185 80 176 92" fill="none" stroke="#6B4423" strokeWidth="13" strokeLinecap="round" />
        <path d="M160 144 Q188 115 195 88 Q185 80 176 92" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="192" cy="100" r="7" fill="none" stroke="#FACC15" strokeWidth="3.5" />
        <path d="M110 118 L110 145 L130 145 L130 118 Z" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
        <path d="M106 138 Q120 150 134 138" fill="none" stroke="#F43F5E" strokeWidth="4.5" strokeLinecap="round" />
        <g transform="rotate(4 120 95)">
          <circle cx="120" cy="95" r="32" fill="#6B4423" stroke="#18181B" strokeWidth="3" />
          <circle cx="88" cy="97" r="7" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
          <circle cx="82" cy="107" r="9" fill="none" stroke="#FACC15" strokeWidth="3" />
          <circle cx="152" cy="97" r="7" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
          <circle cx="158" cy="107" r="9" fill="none" stroke="#FACC15" strokeWidth="3" />
          <path d="M104 94 Q109 88 114 94" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="132" cy="91" rx="4.5" ry="6" fill="#18181B" />
          <circle cx="133.5" cy="89" r="1.8" fill="#FFFFFF" />
          <path d="M102 79 Q109 74 116 80" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M125 78 Q132 73 139 79" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M117 96 Q120 101 123 96" fill="none" stroke="#42250E" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M106 105 Q120 126 134 105 Z" fill="#E11D48" stroke="#18181B" strokeWidth="2.5" />
          <path d="M109 105 Q120 113 131 105" fill="#FFFFFF" />
          <ellipse cx="98" cy="101" rx="4" ry="2.5" fill="#F43F5E" fillOpacity="0.5" />
          <ellipse cx="142" cy="101" rx="4" ry="2.5" fill="#F43F5E" fillOpacity="0.5" />
          <path d="M88 81 C85 47 100 32 120 32 C140 32 155 47 152 81 C158 72 168 57 162 45 C150 21 90 21 78 45 C72 57 82 72 88 81 Z" fill="#FACC15" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
          <path d="M105 35 C95 15 145 15 135 35 Z" fill="#F43F5E" stroke="#18181B" strokeWidth="2.5" />
          <path d="M92 62 Q120 49 148 62" stroke="#059669" strokeWidth="3.5" />
          <circle cx="120" cy="45" r="4" fill="#536D56" />
        </g>
      </svg>
    ) : (
      <svg viewBox="0 0 240 320" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
        <ellipse cx="120" cy="305" rx="55" ry="10" fill="#000000" fillOpacity="0.25" />
        <path d="M90 288 C85 288 80 295 82 302 C84 305 102 305 104 300 C104 294 96 288 90 288 Z" fill="#D97706" stroke="#18181B" strokeWidth="2.5" />
        <path d="M148 288 C143 288 138 295 140 302 C142 305 160 305 162 300 C162 294 154 288 148 288 Z" fill="#D97706" stroke="#18181B" strokeWidth="2.5" />
        <path d="M96 240 L94 292" stroke="#6B4423" strokeWidth="12" strokeLinecap="round" />
        <path d="M144 240 L146 292" stroke="#6B4423" strokeWidth="12" strokeLinecap="round" />
        <path d="M80 145 C65 175 60 215 55 250 C80 258 160 258 185 250 C180 215 175 175 160 145 Z" fill="#536D56" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M72 190 Q120 205 168 190" stroke="#FACC15" strokeWidth="4" strokeDasharray="8 6" />
        <path d="M64 225 Q120 240 176 225" stroke="#F43F5E" strokeWidth="4" strokeDasharray="10 6" />
        <circle cx="120" cy="175" r="9" fill="#FACC15" stroke="#18181B" strokeWidth="2" />
        <circle cx="95" cy="215" r="7" fill="#F43F5E" stroke="#18181B" strokeWidth="2" />
        <circle cx="145" cy="215" r="7" fill="#F43F5E" stroke="#18181B" strokeWidth="2" />
        <path d="M80 148 Q50 170 48 195 Q54 205 65 198" fill="none" stroke="#6B4423" strokeWidth="13" strokeLinecap="round" />
        <path d="M80 148 Q50 170 48 195 Q54 205 65 198" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="190" r="7" fill="none" stroke="#FACC15" strokeWidth="3.5" />
        <path d="M160 148 Q188 170 178 195 Q168 200 162 190" fill="none" stroke="#6B4423" strokeWidth="13" strokeLinecap="round" />
        <path d="M160 148 Q188 170 178 195 Q168 200 162 190" fill="none" stroke="#18181B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="176" cy="190" r="7" fill="none" stroke="#FACC15" strokeWidth="3.5" />
        <path d="M110 120 L110 148 L130 148 L130 120 Z" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
        <path d="M106 140 Q120 152 134 140" fill="none" stroke="#F43F5E" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="120" cy="98" r="32" fill="#6B4423" stroke="#18181B" strokeWidth="3" />
        <circle cx="88" cy="100" r="7" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
        <circle cx="84" cy="108" r="9" fill="none" stroke="#FACC15" strokeWidth="3" />
        <circle cx="152" cy="100" r="7" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
        <circle cx="156" cy="108" r="9" fill="none" stroke="#FACC15" strokeWidth="3" />
        <ellipse cx="108" cy="94" rx="4" ry="5.5" fill="#18181B" />
        <circle cx="109.5" cy="92.5" r="1.5" fill="#FFFFFF" />
        <path d="M104 88 L102 85 M108 86 L108 82 M112 88 L114 85" stroke="#18181B" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="132" cy="94" rx="4" ry="5.5" fill="#18181B" />
        <circle cx="133.5" cy="92.5" r="1.5" fill="#FFFFFF" />
        <path d="M128 88 L126 85 M132 86 L132 82 M136 88 L138 85" stroke="#18181B" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M102 83 Q109 78 115 82" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M125 82 Q131 78 138 83" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M117 99 Q120 104 123 99" fill="none" stroke="#42250E" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M109 110 Q120 122 131 110" fill="#E11D48" stroke="#18181B" strokeWidth="2.5" />
        <path d="M112 110 Q120 114 128 110" fill="#FFFFFF" />
        <ellipse cx="98" cy="104" rx="4" ry="2.5" fill="#F43F5E" fillOpacity="0.4" />
        <ellipse cx="142" cy="104" rx="4" ry="2.5" fill="#F43F5E" fillOpacity="0.4" />
        <path d="M88 84 C85 50 100 35 120 35 C140 35 155 50 152 84 C158 75 168 60 162 48 C150 24 90 24 78 48 C72 60 82 75 88 84 Z" fill="#FACC15" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M105 38 C95 18 145 18 135 38 Z" fill="#F43F5E" stroke="#18181B" strokeWidth="2.5" />
        <path d="M92 65 Q120 52 148 65" stroke="#059669" strokeWidth="3.5" />
        <circle cx="120" cy="48" r="4" fill="#536D56" />
      </svg>
    )
  }

  if (character === 'mboa_boy') {
    return isPoseB ? (
      <svg viewBox="0 0 240 320" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
        <ellipse cx="120" cy="305" rx="46" ry="8" fill="#000000" fillOpacity="0.25" />
        <path d="M76 284 C74 276 86 272 96 275 L97 291 C95 297 76 297 76 284 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
        <path d="M76 289 L96 289" stroke="#F43F5E" strokeWidth="3" />
        <path d="M144 275 C154 272 166 276 164 284 C164 297 145 297 143 291 L144 275 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
        <path d="M144 289 L164 289" stroke="#F43F5E" strokeWidth="3" />
        <path d="M84 194 L78 276 L98 276 L108 204 Z" fill="#1E293B" stroke="#18181B" strokeWidth="2.5" />
        <path d="M156 194 L162 276 L142 276 L132 204 Z" fill="#1E293B" stroke="#18181B" strokeWidth="2.5" />
        <rect x="78" y="271" width="20" height="5" rx="2" fill="#0F172A" />
        <rect x="142" y="271" width="20" height="5" rx="2" fill="#0F172A" />
        <path d="M75 134 C68 159 72 199 76 209 C95 214 145 214 164 209 C168 199 172 159 165 134 Z" fill="#059669" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M92 179 C92 169 148 169 148 179 L145 202 C135 206 105 206 95 202 Z" fill="#047857" stroke="#18181B" strokeWidth="2" />
        <path d="M110 136 Q105 152 108 162" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M128 136 Q135 152 132 162" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M102 130 Q125 154 140 132" fill="none" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
        <polygon points="126,152 128,157 133,157 129,160 131,165 126,162 121,165 123,160 119,157 124,157" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
        <path d="M75 136 Q50 110 46 88 Q56 80 65 92" fill="none" stroke="#543217" strokeWidth="12" strokeLinecap="round" />
        <path d="M75 136 Q50 110 46 88 Q56 80 65 92" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M75 134 Q62 120 56 106" stroke="#059669" strokeWidth="15" strokeLinecap="round" />
        <path d="M165 136 Q190 110 194 88 Q184 80 175 92" fill="none" stroke="#543217" strokeWidth="12" strokeLinecap="round" />
        <path d="M165 136 Q190 110 194 88 Q184 80 175 92" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M165 134 Q178 120 184 106" stroke="#059669" strokeWidth="15" strokeLinecap="round" />
        <rect x="112" y="112" width="16" height="24" fill="#543217" stroke="#18181B" strokeWidth="2" />
        <g transform="rotate(-4 120 88)">
          <circle cx="120" cy="88" r="30" fill="#543217" stroke="#18181B" strokeWidth="3" />
          <circle cx="90" cy="88" r="6" fill="#543217" stroke="#18181B" strokeWidth="2" />
          <circle cx="150" cy="88" r="6" fill="#543217" stroke="#18181B" strokeWidth="2" />
          <circle cx="90" cy="90" r="1.8" fill="#F59E0B" />
          <rect x="94" y="80" width="22" height="15" rx="3" fill="#0F172A" stroke="#18181B" strokeWidth="2" />
          <rect x="124" y="80" width="22" height="15" rx="3" fill="#0F172A" stroke="#18181B" strokeWidth="2" />
          <path d="M116 84 L124 84" stroke="#F59E0B" strokeWidth="2.5" />
          <path d="M98 82 L104 94" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M128 82 L134 94" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M118 97 Q120 101 122 97" stroke="#3D2109" strokeWidth="2" strokeLinecap="round" />
          <path d="M110 104 Q120 118 130 104 Z" fill="#E11D48" stroke="#18181B" strokeWidth="2" />
          <path d="M112 104 Q120 110 128 104" fill="#FFFFFF" />
          <ellipse cx="120" cy="62" rx="34" ry="12" fill="#1E293B" stroke="#18181B" strokeWidth="2.5" />
          <path d="M92 72 C90 44 150 44 148 72 Z" fill="#0F172A" stroke="#18181B" strokeWidth="2.5" />
          <path d="M110 70 Q120 64 130 70" stroke="#94A3B8" strokeWidth="2.5" />
          <rect x="113" y="52" width="4.5" height="7" fill="#059669" />
          <rect x="117.5" y="52" width="4.5" height="7" fill="#DC2626" />
          <rect x="122" y="52" width="4.5" height="7" fill="#FACC15" />
        </g>
      </svg>
    ) : (
      <svg viewBox="0 0 240 320" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
        <ellipse cx="120" cy="305" rx="58" ry="11" fill="#000000" fillOpacity="0.3" />
        <path d="M72 292 C72 284 84 280 94 282 L96 298 C96 304 74 306 72 292 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
        <path d="M72 297 L95 297" stroke="#F43F5E" strokeWidth="3" />
        <ellipse cx="76" cy="298" rx="3" ry="2" fill="#18181B" />
        <path d="M144 282 C154 280 166 284 166 292 C164 306 142 304 142 298 L144 282 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
        <path d="M143 297 L166 297" stroke="#F43F5E" strokeWidth="3" />
        <ellipse cx="162" cy="298" rx="3" ry="2" fill="#18181B" />
        <path d="M84 200 L76 285 L96 285 L108 210 Z" fill="#1E293B" stroke="#18181B" strokeWidth="2.5" />
        <path d="M156 200 L164 285 L144 285 L132 210 Z" fill="#1E293B" stroke="#18181B" strokeWidth="2.5" />
        <rect x="76" y="280" width="20" height="5" rx="2" fill="#0F172A" />
        <rect x="144" y="280" width="20" height="5" rx="2" fill="#0F172A" />
        <path d="M75 140 C68 165 72 205 76 215 C95 220 145 220 164 215 C168 205 172 165 165 140 Z" fill="#059669" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M92 185 C92 175 148 175 148 185 L145 208 C135 212 105 212 95 208 Z" fill="#047857" stroke="#18181B" strokeWidth="2" />
        <path d="M112 142 L110 168" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M128 142 L130 168" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M102 135 Q120 156 138 135" fill="none" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
        <polygon points="120,154 122,159 127,159 123,162 125,167 120,164 115,167 117,162 113,159 118,159" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
        <path d="M75 142 Q48 170 54 200 Q62 208 68 198" fill="none" stroke="#543217" strokeWidth="12" strokeLinecap="round" />
        <path d="M75 142 Q48 170 54 200 Q62 208 68 198" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M75 140 Q62 155 58 172" stroke="#059669" strokeWidth="15" strokeLinecap="round" />
        <path d="M165 142 Q192 165 186 195 Q176 200 172 190" fill="none" stroke="#543217" strokeWidth="12" strokeLinecap="round" />
        <path d="M165 142 Q192 165 186 195 Q176 200 172 190" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M165 140 Q178 155 182 172" stroke="#059669" strokeWidth="15" strokeLinecap="round" />
        <rect x="112" y="118" width="16" height="24" fill="#543217" stroke="#18181B" strokeWidth="2" />
        <circle cx="120" cy="94" r="30" fill="#543217" stroke="#18181B" strokeWidth="3" />
        <circle cx="90" cy="94" r="6" fill="#543217" stroke="#18181B" strokeWidth="2" />
        <circle cx="150" cy="94" r="6" fill="#543217" stroke="#18181B" strokeWidth="2" />
        <circle cx="90" cy="96" r="1.8" fill="#F59E0B" />
        <rect x="94" y="86" width="22" height="15" rx="3" fill="#0F172A" stroke="#18181B" strokeWidth="2" />
        <rect x="124" y="86" width="22" height="15" rx="3" fill="#0F172A" stroke="#18181B" strokeWidth="2" />
        <path d="M116 90 L124 90" stroke="#F59E0B" strokeWidth="2.5" />
        <path d="M98 88 L104 100" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M128 88 L134 100" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M118 103 Q120 107 122 103" stroke="#3D2109" strokeWidth="2" strokeLinecap="round" />
        <path d="M114 112 Q122 117 129 110" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="120" cy="68" rx="34" ry="12" fill="#1E293B" stroke="#18181B" strokeWidth="2.5" />
        <path d="M92 78 C90 50 150 50 148 78 Z" fill="#0F172A" stroke="#18181B" strokeWidth="2.5" />
        <path d="M110 76 Q120 70 130 76" stroke="#94A3B8" strokeWidth="2.5" />
        <rect x="113" y="58" width="4.5" height="7" fill="#059669" />
        <rect x="117.5" y="58" width="4.5" height="7" fill="#DC2626" />
        <rect x="122" y="58" width="4.5" height="7" fill="#FACC15" />
      </svg>
    )
  }

  // pa_buea
  return isPoseB ? (
    <svg viewBox="0 0 240 320" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
      <ellipse cx="120" cy="305" rx="48" ry="9" fill="#000000" fillOpacity="0.25" />
      <path d="M80 286 C76 284 72 292 76 297 C80 300 96 300 98 294 C98 289 88 286 80 286 Z" fill="#451A03" stroke="#18181B" strokeWidth="2.5" />
      <path d="M148 282 C144 280 140 288 144 293 C148 296 164 296 166 290 C166 285 156 282 148 282 Z" fill="#451A03" stroke="#18181B" strokeWidth="2.5" />
      <path d="M86 210 L80 288 L98 288 L108 220 Z" fill="#334155" stroke="#18181B" strokeWidth="2.5" />
      <path d="M154 210 L162 284 L144 284 L132 220 Z" fill="#334155" stroke="#18181B" strokeWidth="2.5" />
      <path d="M78 135 C70 165 72 210 76 225 C95 230 145 230 164 225 C168 210 170 165 162 135 Z" fill="#0369A1" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
      <rect x="117" y="135" width="6" height="55" fill="#FACC15" stroke="#B45309" strokeWidth="1" />
      <circle cx="120" cy="145" r="2" fill="#451A03" />
      <circle cx="120" cy="160" r="2" fill="#451A03" />
      <circle cx="120" cy="175" r="2" fill="#451A03" />
      <path d="M98 160 Q120 170 142 160" stroke="#FACC15" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M78 136 Q46 112 40 85 Q50 78 60 90" fill="none" stroke="#6B4423" strokeWidth="12" strokeLinecap="round" />
      <path d="M78 136 Q46 112 40 85 Q50 78 60 90" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M78 134 Q62 118 56 102" stroke="#0369A1" strokeWidth="14" strokeLinecap="round" />
      <path d="M162 136 Q192 115 198 88" fill="none" stroke="#6B4423" strokeWidth="12" strokeLinecap="round" />
      <path d="M162 136 Q192 115 198 88" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M162 134 Q178 118 185 102" stroke="#0369A1" strokeWidth="14" strokeLinecap="round" />
      <circle cx="198" cy="88" r="6" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
      <line x1="198" y1="88" x2="225" y2="28" stroke="#92400E" strokeWidth="5" strokeLinecap="round" />
      <path d="M225 28 C228 20 236 22 235 30" fill="none" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
      <rect x="112" y="112" width="16" height="24" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
      <g transform="rotate(5 120 88)">
        <circle cx="120" cy="88" r="30" fill="#6B4423" stroke="#18181B" strokeWidth="3" />
        <circle cx="90" cy="89" r="6.5" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
        <circle cx="150" cy="89" r="6.5" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
        <circle cx="106" cy="84" r="10" fill="#FFFFFF" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="2.2" />
        <circle cx="134" cy="84" r="10" fill="#FFFFFF" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="2.2" />
        <line x1="116" y1="84" x2="124" y2="84" stroke="#F59E0B" strokeWidth="2.2" />
        <line x1="96" y1="84" x2="90" y2="87" stroke="#F59E0B" strokeWidth="1.8" />
        <line x1="144" y1="84" x2="150" y2="87" stroke="#F59E0B" strokeWidth="1.8" />
        <path d="M102 85 Q106 80 110 85" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M130 85 Q134 80 138 85" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M98 71 Q106 66 114 71" fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
        <path d="M126 71 Q134 66 142 71" fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
        <path d="M117 90 Q120 96 123 90" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M106 97 Q120 95 134 97 Q120 106 106 97 Z" fill="#E2E8F0" stroke="#18181B" strokeWidth="1.8" />
        <path d="M115 112 Q120 120 125 112 Z" fill="#E2E8F0" stroke="#18181B" strokeWidth="1.5" />
        <path d="M110 102 Q120 118 130 102 Z" fill="#E11D48" stroke="#18181B" strokeWidth="2" />
        <rect x="117" y="102" width="3" height="3" fill="#F59E0B" />
        <path d="M86 72 C80 44 140 39 158 62 C164 68 150 76 86 72 Z" fill="#78350F" stroke="#18181B" strokeWidth="2.8" />
        <path d="M92 72 C115 78 150 74 156 68" fill="none" stroke="#451A03" strokeWidth="4" strokeLinecap="round" />
        <circle cx="122" cy="48" r="3" fill="#451A03" />
      </g>
    </svg>
  ) : (
    <svg viewBox="0 0 240 320" className="w-full h-full drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
      <ellipse cx="120" cy="305" rx="56" ry="10" fill="#000000" fillOpacity="0.28" />
      <path d="M82 292 C78 290 74 298 78 303 C82 306 98 306 100 300 C100 295 90 292 82 292 Z" fill="#451A03" stroke="#18181B" strokeWidth="2.5" />
      <path d="M142 292 C138 290 134 298 138 303 C142 306 158 306 160 300 C160 295 150 292 142 292 Z" fill="#451A03" stroke="#18181B" strokeWidth="2.5" />
      <ellipse cx="180" cy="304" rx="4" ry="2" fill="#78350F" stroke="#18181B" strokeWidth="1.5" />
      <path d="M86 215 L82 294 L100 294 L108 225 Z" fill="#334155" stroke="#18181B" strokeWidth="2.5" />
      <path d="M154 215 L158 294 L140 294 L132 225 Z" fill="#334155" stroke="#18181B" strokeWidth="2.5" />
      <line x1="180" y1="304" x2="175" y2="185" stroke="#92400E" strokeWidth="5" strokeLinecap="round" />
      <path d="M175 185 C175 178 185 174 190 180" fill="none" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
      <path d="M78 140 C70 170 72 215 76 230 C95 235 145 235 164 230 C168 215 170 170 162 140 Z" fill="#0369A1" stroke="#18181B" strokeWidth="3" strokeLinejoin="round" />
      <rect x="117" y="140" width="6" height="55" fill="#FACC15" stroke="#B45309" strokeWidth="1" />
      <circle cx="120" cy="150" r="2" fill="#451A03" />
      <circle cx="120" cy="165" r="2" fill="#451A03" />
      <circle cx="120" cy="180" r="2" fill="#451A03" />
      <path d="M98 165 Q120 175 142 165" stroke="#FACC15" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M78 142 Q52 170 56 195 Q64 202 70 192" fill="none" stroke="#6B4423" strokeWidth="12" strokeLinecap="round" />
      <path d="M78 142 Q52 170 56 195 Q64 202 70 192" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M78 140 Q64 158 60 175" stroke="#0369A1" strokeWidth="14" strokeLinecap="round" />
      <path d="M162 142 Q185 162 176 182" fill="none" stroke="#6B4423" strokeWidth="12" strokeLinecap="round" />
      <path d="M162 142 Q185 162 176 182" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M162 140 Q175 158 174 175" stroke="#0369A1" strokeWidth="14" strokeLinecap="round" />
      <circle cx="175" cy="182" r="6" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
      <rect x="112" y="118" width="16" height="24" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
      <circle cx="120" cy="94" r="30" fill="#6B4423" stroke="#18181B" strokeWidth="3" />
      <circle cx="90" cy="95" r="6.5" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
      <circle cx="150" cy="95" r="6.5" fill="#6B4423" stroke="#18181B" strokeWidth="2" />
      <circle cx="106" cy="90" r="10" fill="#FFFFFF" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="2.2" />
      <circle cx="134" cy="90" r="10" fill="#FFFFFF" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="2.2" />
      <line x1="116" y1="90" x2="124" y2="90" stroke="#F59E0B" strokeWidth="2.2" />
      <line x1="96" y1="90" x2="90" y2="93" stroke="#F59E0B" strokeWidth="1.8" />
      <line x1="144" y1="90" x2="150" y2="93" stroke="#F59E0B" strokeWidth="1.8" />
      <ellipse cx="106" cy="90" rx="3" ry="4" fill="#18181B" />
      <circle cx="107" cy="89" r="1.2" fill="#FFFFFF" />
      <ellipse cx="134" cy="90" rx="3" ry="4" fill="#18181B" />
      <circle cx="135" cy="89" r="1.2" fill="#FFFFFF" />
      <path d="M98 77 Q106 72 114 77" fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      <path d="M126 77 Q134 72 142 77" fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      <path d="M117 96 Q120 102 123 96" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M106 104 Q120 102 134 104 Q120 114 106 104 Z" fill="#E2E8F0" stroke="#18181B" strokeWidth="1.8" />
      <path d="M115 116 Q120 126 125 116 Z" fill="#E2E8F0" stroke="#18181B" strokeWidth="1.5" />
      <path d="M112 110 Q120 115 128 110" fill="none" stroke="#18181B" strokeWidth="2" strokeLinecap="round" />
      <path d="M86 78 C80 50 140 45 158 68 C164 74 150 82 86 78 Z" fill="#78350F" stroke="#18181B" strokeWidth="2.8" />
      <path d="M92 78 C115 84 150 80 156 74" fill="none" stroke="#451A03" strokeWidth="4" strokeLinecap="round" />
      <circle cx="122" cy="54" r="3" fill="#451A03" />
    </svg>
  )
}

// -------------------------------------------------------------
// Main StagePlayer Component
// -------------------------------------------------------------

export const StagePlayer: React.FC<StagePlayerProps> = ({
  characterId,
  backgroundTheme = 'sage_starburst',
  movesTimeline = [],
  bpm = 110,
  currentTime = 0,
  isPlaying = false,
  caption,
  sticker,
  onStickerTap,
  showControls = false,
  onTogglePlay,
  onSeek,
  duration = 24,
  className = '',
  aspectRatio = 'aspect-[16/10]',
  mode = 'studio',
  audioElement = null,
}) => {
  const normChar = normalizeCharacterId(characterId)
  const [extImageFailed, setExtImageFailed] = useState(false)
  const [rafTime, setRafTime] = useState(0)

  // Sync to HTML5 <audio>.currentTime via requestAnimationFrame for buttery 60fps responsiveness
  useEffect(() => {
    if (!isPlaying || !audioElement) return

    let rafId: number
    const loop = () => {
      if (audioElement && !isNaN(audioElement.currentTime)) {
        setRafTime(audioElement.currentTime)
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isPlaying, audioElement])

  // Effective time used for rhythm & moves
  const effectiveTime = isPlaying && audioElement ? rafTime : currentTime

  // Calculate rhythm sync (FR-20, FR-21)
  // Half-beat alternates pose A and pose B
  const halfBeatDuration = useMemo(() => 30 / Math.max(bpm || 110, 40), [bpm])
  const halfBeatIndex = Math.floor(effectiveTime / halfBeatDuration)
  const isPoseB = isPlaying ? halfBeatIndex % 2 === 1 : false

  // Active move determination from movesTimeline
  const activeMove = useMemo(() => {
    if (!movesTimeline || movesTimeline.length === 0) return 'sway'
    const found = movesTimeline.find(
      (m) => effectiveTime >= m.start && effectiveTime < m.end
    )
    return (found?.action || 'sway').toLowerCase()
  }, [movesTimeline, effectiveTime])

  // Snappy CSS Transforms for the 4 moves: sway, stomp, jump, flex
  const characterTransform = useMemo(() => {
    if (!isPlaying) {
      return 'translateY(0px) rotate(0deg) scale(1)'
    }

    switch (activeMove) {
      case 'sway':
        // Alternates hip/body tilt left and right with snappy groove
        return isPoseB
          ? 'rotate(6deg) translateX(14px) translateY(-3px) scale(1)'
          : 'rotate(-6deg) translateX(-14px) translateY(-3px) scale(1)'

      case 'stomp':
        // Downward impact squish on beat, spring back up on half-beat
        return isPoseB
          ? 'translateY(-10px) scale(0.97, 1.05) rotate(3deg)'
          : 'translateY(12px) scale(1.07, 0.92) rotate(-2deg)'

      case 'jump':
        // Dynamic hop in the air with squash & stretch
        return isPoseB
          ? 'translateY(-30px) scale(0.94, 1.08) rotate(2deg)'
          : 'translateY(6px) scale(1.05, 0.94) rotate(-1deg)'

      case 'flex':
        // Swagger muscle pump with chest expansion
        return isPoseB
          ? 'scale(1.15) translateY(-8px) rotate(3deg)'
          : 'scale(1.08) translateY(-3px) rotate(-3deg)'

      default:
        return isPoseB
          ? 'rotate(4deg) translateY(-4px)'
          : 'rotate(-4deg) translateY(0px)'
    }
  }, [isPlaying, activeMove, isPoseB])

  const poseFileName = `${normChar}_pose_${isPoseB ? 'b' : 'a'}.svg`
  const extSvgPath = `/assets/characters/${poseFileName}`

  // Render Background Theme
  const renderBackground = () => {
    switch (backgroundTheme) {
      case 'amber_sunset':
        return <AmberSunsetBackground isPlaying={isPlaying} bpm={bpm} />
      case 'slate_night':
        return <SlateNightBackground isPlaying={isPlaying} bpm={bpm} />
      case 'lavender_haze':
        return <LavenderHazeBackground isPlaying={isPlaying} bpm={bpm} />
      case 'sage_starburst':
      default:
        return <SageStarburstBackground isPlaying={isPlaying} bpm={bpm} />
    }
  }

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs))
    const m = Math.floor(s / 60)
    const rem = s % 60
    return `${m}:${rem < 10 ? '0' : ''}${rem}`
  }

  return (
    <div
      className={`relative w-full ${aspectRatio} rounded-3xl overflow-hidden shadow-2xl border border-white/10 select-none group ${className}`}
    >
      {/* 1. Theme Stage Background (Pure CSS + SVG, NFR-2) */}
      {renderBackground()}

      {/* 2. Top Bar Details & Live Beat Badge */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white border border-white/10 shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="capitalize">{normChar.replace('_', ' ')}</span>
          <span className="text-neutral-400">·</span>
          <span className="font-mono text-[#FACC15]">{bpm} BPM</span>
        </div>

        {/* Current Move Pill */}
        {isPlaying && (
          <div className="px-2.5 py-1 rounded-full bg-neutral-900/80 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-[#F43F5E]/40 flex items-center gap-1 shadow">
            <span className="text-[#F43F5E]">✦</span>
            <span>{activeMove}</span>
          </div>
        )}
      </div>

      {/* 3. Comic Speech Bubble & Reaction Stickers (FR-23) */}
      <div className="absolute top-10 sm:top-12 left-0 right-0 z-30 flex flex-col items-center pointer-events-none px-4">
        {/* Comic Speech Bubble */}
        {caption && caption.trim().length > 0 && (
          <div className="relative max-w-[85%] sm:max-w-xs animate-comic-pop">
            <div className="bg-white text-neutral-950 font-black text-xs sm:text-sm px-4 py-2 rounded-2xl border-[2.5px] border-neutral-950 shadow-[3px_3px_0px_#000] text-center tracking-tight leading-tight">
              "{caption}"
            </div>
            {/* Comic Speech Bubble Beak / Tail */}
            <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] border-t-neutral-950 mx-auto -mt-[1px]" />
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-white mx-auto -mt-[10px]" />
          </div>
        )}

        {/* Quick Reaction Sticker Popup */}
        {sticker && (
          <div
            onClick={() => onStickerTap && onStickerTap(sticker)}
            className="mt-1 animate-comic-pop pointer-events-auto cursor-pointer"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FACC15] text-neutral-950 font-black text-xs border-[2px] border-neutral-950 shadow-[3px_3px_0px_#000] rotate-[-3deg] hover:scale-105 active:scale-95 transition-transform">
              <span>🔥</span>
              <span>{sticker}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. 2-Pose Character Stage Arena */}
      <div className="absolute inset-0 z-20 flex items-end justify-center pb-5 sm:pb-8 pointer-events-none">
        <div
          className="relative w-44 sm:w-56 md:w-64 aspect-[3/4] flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: characterTransform,
            transformOrigin: 'bottom center',
          }}
        >
          {/* External SVG with Inline SVG Fallback */}
          {!extImageFailed ? (
            <img
              src={extSvgPath}
              alt={`${normChar} dancing`}
              onError={() => setExtImageFailed(true)}
              className="w-full h-full object-contain filter drop-shadow-[0_12px_14px_rgba(0,0,0,0.7)]"
            />
          ) : (
            <InlineCharacterSVG character={normChar} isPoseB={isPoseB} />
          )}

          {/* Jump / Air Shadow effect */}
          {activeMove === 'jump' && isPlaying && (
            <div
              className={`absolute -bottom-2 w-32 h-4 rounded-full bg-black/40 blur-sm transition-all duration-100 ${
                isPoseB ? 'scale-75 opacity-25' : 'scale-105 opacity-50'
              }`}
            />
          )}
        </div>
      </div>

      {/* 5. Playback Mode Click Overlay for Feed / Previews */}
      {mode === 'playback' && !isPlaying && (
        <div
          onClick={onTogglePlay}
          className="absolute inset-0 z-30 bg-black/35 hover:bg-black/20 transition-all flex items-center justify-center cursor-pointer group/btn"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/95 text-neutral-950 flex items-center justify-center shadow-2xl group-hover/btn:scale-110 group-active/btn:scale-95 transition-transform">
            <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-current translate-x-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* 6. Built-in Transport Controls (Optional or Studio Bar) */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2">
          {/* Progress Bar / Scrubber */}
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 24}
              step={0.1}
              value={effectiveTime}
              onChange={(e) => onSeek && onSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#F43F5E]"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onTogglePlay}
                className="w-8 h-8 rounded-full bg-white text-neutral-950 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow cursor-pointer"
              >
                {isPlaying ? (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <span className="font-mono text-[11px] text-neutral-300">
                {formatTime(effectiveTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                Theme:
              </span>
              <span className="text-[11px] font-bold text-[#FACC15] capitalize">
                {backgroundTheme.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
