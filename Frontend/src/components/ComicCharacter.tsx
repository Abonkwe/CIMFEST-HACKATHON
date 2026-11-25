import React, { useEffect, useState } from 'react'
import type { ComicExpression } from '../types'

export type ComicCharacterId = 'mboa_boy' | 'tantie' | 'pa_buea'

export interface ComicCharacterProps {
  characterId: string
  expression?: ComicExpression | string
  flip?: boolean
  className?: string
}

export const COMIC_EXPRESSIONS: {
  id: ComicExpression
  label: string
  emoji: string
  accent: string
}[] = [
  { id: 'happy', label: 'Happy', emoji: '😊', accent: '#10B981' },
  { id: 'laughing', label: 'Laughing', emoji: '😂', accent: '#FACC15' },
  { id: 'sad', label: 'Sad', emoji: '😢', accent: '#38BDF8' },
  { id: 'angry', label: 'Angry', emoji: '😡', accent: '#F43F5E' },
  { id: 'shocked', label: 'Shocked', emoji: '😱', accent: '#A855F7' },
  { id: 'love', label: 'Love', emoji: '😍', accent: '#EC4899' },
  { id: 'confused', label: 'Confused', emoji: '🤨', accent: '#FB923C' },
  { id: 'jealous', label: 'Jealous', emoji: '😒', accent: '#22C55E' },
  { id: 'embarrassed', label: 'Embarrassed', emoji: '😳', accent: '#F472B6' },
  { id: 'excited', label: 'Excited', emoji: '🤩', accent: '#EAB308' },
  { id: 'suspicious', label: 'Suspicious', emoji: '🧐', accent: '#8B5CF6' },
  { id: 'nervous', label: 'Nervous', emoji: '😬', accent: '#06B6D4' },
  { id: 'proud', label: 'Proud', emoji: '😎', accent: '#F59E0B' },
  { id: 'bored', label: 'Bored', emoji: '🥱', accent: '#94A3B8' },
]

export function normalizeComicCharacterId(rawId?: string | null): ComicCharacterId {
  if (!rawId) return 'mboa_boy'
  const lower = rawId.toLowerCase().trim()
  if (lower.includes('tantie') || lower.includes('girl') || lower.includes('mama')) {
    return 'tantie'
  }
  if (lower.includes('buea') || lower.includes('pa') || lower.includes('elder')) {
    return 'pa_buea'
  }
  return 'mboa_boy'
}

export function normalizeExpression(raw?: string | null): ComicExpression {
  const lower = (raw || 'happy').toLowerCase().trim()
  if (lower === 'embarassed') return 'embarrassed'
  const valid: ComicExpression[] = [
    'happy',
    'laughing',
    'sad',
    'angry',
    'shocked',
    'love',
    'confused',
    'jealous',
    'embarrassed',
    'excited',
    'suspicious',
    'nervous',
    'proud',
    'bored',
  ]
  if (valid.includes(lower as ComicExpression)) {
    return lower as ComicExpression
  }
  return 'happy'
}

export function expressionFromAction(action?: string | null): ComicExpression {
  const lower = (action || '').toLowerCase()
  if (lower.includes('laugh')) return 'laughing'
  if (lower.includes('cry') || lower.includes('sad')) return 'sad'
  if (lower.includes('angry') || lower.includes('argue')) return 'angry'
  if (lower.includes('shock') || lower.includes('slip')) return 'shocked'
  if (lower.includes('kneel') || lower.includes('love')) return 'love'
  if (lower.includes('turn') || lower.includes('confus')) return 'confused'
  return 'happy'
}

// Module-level cache for custom SVG asset checks in /public/assets/characters/
const customAssetCache = new Map<string, string | null>()

async function resolveCustomCharacterAsset(
  charId: string,
  expression: ComicExpression
): Promise<string | null> {
  const cacheKey = `${charId}:${expression}`
  if (customAssetCache.has(cacheKey)) {
    return customAssetCache.get(cacheKey) ?? null
  }

  const candidates = [
    `/assets/characters/${charId}_${expression}.svg`,
    `/assets/characters/${charId}_comic.svg`,
  ]

  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      const contentType = res.headers.get('content-type') || ''
      if (res.ok && (contentType.includes('svg') || contentType.includes('xml') || contentType === '')) {
        customAssetCache.set(cacheKey, url)
        return url
      }
    } catch {
      // Ignore network/404 and fall back to built-in SVG
    }
  }

  customAssetCache.set(cacheKey, null)
  return null
}

const INK = '#111115'

const CHARACTER_PALETTES: Record<
  ComicCharacterId,
  {
    skin: string
    skinShade: string
    shirt: string
    shirtAccent: string
  }
> = {
  mboa_boy: {
    skin: '#A46238',
    skinShade: '#884B26',
    shirt: '#536D56',
    shirtAccent: '#FACC15',
  },
  tantie: {
    skin: '#8C4A27',
    skinShade: '#70371A',
    shirt: '#E11D48',
    shirtAccent: '#FACC15',
  },
  pa_buea: {
    skin: '#6E3B23',
    skinShade: '#542915',
    shirt: '#1D4ED8',
    shirtAccent: '#FACC15',
  },
}

export const ComicCharacter: React.FC<ComicCharacterProps> = ({
  characterId,
  expression = 'happy',
  flip = false,
  className = '',
}) => {
  const charId = normalizeComicCharacterId(characterId)
  const expr = normalizeExpression(expression)
  const palette = CHARACTER_PALETTES[charId]

  const [customSvgUrl, setCustomSvgUrl] = useState<string | null>(() => {
    const key = `${charId}:${expr}`
    return customAssetCache.get(key) ?? null
  })

  useEffect(() => {
    let active = true
    resolveCustomCharacterAsset(charId, expr).then((url) => {
      if (active) setCustomSvgUrl(url)
    })
    return () => {
      active = false
    }
  }, [charId, expr])

  if (customSvgUrl) {
    return (
      <div
        className={`relative w-full h-full flex items-end justify-center select-none ${className}`}
      >
        <img
          src={customSvgUrl}
          alt={`${charId} ${expr}`}
          className={`w-full h-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)] ${
            flip ? '-scale-x-100' : ''
          }`}
        />
      </div>
    )
  }

  // Laughing adds a lively comic head-tilt
  const headTransform = expr === 'laughing' ? 'rotate(-5 160 175)' : undefined

  return (
    <svg
      viewBox="0 0 320 360"
      className={`w-full h-full overflow-visible select-none drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)] ${className}`}
      role="img"
      aria-label={`${charId} looking ${expr}`}
    >
      <g transform={flip ? 'translate(320, 0) scale(-1, 1)' : undefined}>
        {/* Ground Shadow */}
        <ellipse cx="160" cy="350" rx="88" ry="9" fill="#000000" fillOpacity="0.32" />

        {/* ==================== TORSO & OUTFIT ==================== */}
        <g stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          {/* Shoulders / Body */}
          <path
            d="M66 352 C68 272 96 236 160 236 C224 236 252 272 254 352 Z"
            fill={palette.shirt}
          />

          {/* Outfit-specific Afro-pop details */}
          {charId === 'mboa_boy' && (
            <>
              {/* Hoodie Collar & Hood Fold */}
              <path
                d="M114 238 Q160 272 206 238 Q190 222 160 222 Q130 222 114 238 Z"
                fill="#3E5440"
              />
              {/* Drawstrings */}
              <path d="M142 258 L138 308" stroke={palette.shirtAccent} strokeWidth="4.5" />
              <path d="M178 258 L182 308" stroke={palette.shirtAccent} strokeWidth="4.5" />
              <circle cx="138" cy="312" r="4" fill={palette.shirtAccent} stroke={INK} strokeWidth="3" />
              <circle cx="182" cy="312" r="4" fill={palette.shirtAccent} stroke={INK} strokeWidth="3" />
              {/* Center Pocket Line */}
              <path d="M112 350 L122 316 L198 316 L208 350" fill="#465D49" strokeWidth="4" />
            </>
          )}

          {charId === 'tantie' && (
            <>
              {/* Wax-Print Embroidered V-Neckline */}
              <path
                d="M118 238 L160 284 L202 238"
                fill="none"
                stroke={palette.shirtAccent}
                strokeWidth="7"
              />
              <path
                d="M118 238 L160 284 L202 238"
                fill="none"
                stroke={INK}
                strokeWidth="3.5"
              />
              {/* Emerald & Gold Wax-Print Shoulder Motifs */}
              <circle cx="98" cy="295" r="10" fill="#10B981" strokeWidth="3.5" />
              <circle cx="222" cy="295" r="10" fill="#10B981" strokeWidth="3.5" />
              <polygon points="160,305 174,325 160,345 146,325" fill={palette.shirtAccent} strokeWidth="3.5" />
            </>
          )}

          {charId === 'pa_buea' && (
            <>
              {/* Royal Cameroonian Tunic Placket & Gold Embroidery */}
              <path
                d="M132 238 L160 264 L188 238"
                fill="#1E3A8A"
                strokeWidth="4.5"
              />
              <rect
                x="151"
                y="260"
                width="18"
                height="72"
                rx="6"
                fill={palette.shirtAccent}
                strokeWidth="4"
              />
              {/* Royal Geometric Chest Bars */}
              <path d="M120 278 L144 278 M176 278 L200 278" stroke={palette.shirtAccent} strokeWidth="5" />
              <path d="M126 296 L144 296 M176 296 L194 296" stroke={palette.shirtAccent} strokeWidth="5" />
            </>
          )}

          {/* Neck */}
          <path
            d="M140 206 L140 242 Q160 254 180 242 L180 206 Z"
            fill={palette.skinShade}
          />
        </g>

        {/* ==================== HEAD & EXPRESSIONS ==================== */}
        <g transform={headTransform}>
          {/* Ears */}
          <g stroke={INK} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="97" cy="154" rx="13" ry="18" fill={palette.skinShade} />
            <ellipse cx="223" cy="154" rx="13" ry="18" fill={palette.skinShade} />
            {charId === 'tantie' && (
              <>
                <circle cx="94" cy="176" r="10" fill="none" stroke="#FACC15" strokeWidth="4.5" />
                <circle cx="226" cy="176" r="10" fill="none" stroke="#FACC15" strokeWidth="4.5" />
              </>
            )}
          </g>

          {/* Head Base */}
          <ellipse
            cx="160"
            cy="150"
            rx="62"
            ry="68"
            fill={palette.skin}
            stroke={INK}
            strokeWidth="5"
          />

          {/* Subtle Comic Cheek Cel-Shade */}
          <path
            d="M106 168 Q114 205 160 212 Q206 205 214 168 Q195 200 160 202 Q125 200 106 168 Z"
            fill={palette.skinShade}
            opacity="0.45"
          />

          {/* Pa Buea's Distinguished Beard (framed below mouth so expressions stay 100% clear) */}
          {charId === 'pa_buea' && (
            <path
              d="M104 166 C104 216 128 232 160 232 C192 232 216 216 216 166 C204 182 192 204 160 204 C128 204 116 182 104 166 Z"
              fill="#E4E4E7"
              stroke={INK}
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
          )}

          {/* ==================== HEADWEAR / HAIR ==================== */}
          {charId === 'mboa_boy' && (
            <g stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              {/* Fresh Hairline */}
              <path d="M102 124 Q160 104 218 124 L214 106 Q160 88 106 106 Z" fill="#18181B" />
              {/* Urban Beanie */}
              <path d="M98 112 C98 54 222 54 222 112 Z" fill="#FACC15" />
              <rect x="94" y="96" width="132" height="22" rx="11" fill="#F43F5E" />
              {/* Beanie Ribs */}
              <path d="M135 66 L138 96 M160 60 L160 96 M185 66 L182 96" strokeWidth="3.5" />
            </g>
          )}

          {charId === 'tantie' && (
            <g stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              {/* Iconic Cameroonian Wax-Print Gele / Headwrap */}
              <path
                d="M94 126 C82 78 122 44 162 46 C206 48 238 80 226 126 Q160 102 94 126 Z"
                fill="#F43F5E"
              />
              {/* Headwrap Knot / Bow on Side */}
              <path
                d="M196 64 C224 44 246 66 226 92 C216 102 200 94 196 80 Z"
                fill="#FACC15"
              />
              {/* Wax-Print Geometric Band */}
              <path
                d="M98 112 Q160 88 222 112"
                fill="none"
                stroke="#FACC15"
                strokeWidth="7"
              />
              <path
                d="M106 94 Q160 72 214 94"
                fill="none"
                stroke="#10B981"
                strokeWidth="5"
              />
            </g>
          )}

          {charId === 'pa_buea' && (
            <g stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              {/* Royal Buea Embroidered Cap (Chechia) */}
              <path
                d="M100 116 L108 58 Q160 44 212 58 L220 116 Q160 100 100 116 Z"
                fill="#6D28D9"
              />
              {/* Gold Embroidery Trim */}
              <path
                d="M102 108 Q160 92 218 108"
                fill="none"
                stroke="#FACC15"
                strokeWidth="6"
              />
              <polygon
                points="160,64 170,78 160,92 150,78"
                fill="#FACC15"
                strokeWidth="3.5"
              />
            </g>
          )}

          {/* ==================== NOSE (Comic Stylized) ==================== */}
          <path
            d="M156 154 Q165 162 155 167"
            fill="none"
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* ==================== SWAPPABLE EXPRESSIONS ==================== */}
          {expr === 'happy' && (
            <g>
              {/* Relaxed Brows */}
              <path d="M120 126 Q134 118 148 126" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M172 126 Q186 118 200 126" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Warm Eyes */}
              <ellipse cx="134" cy="144" rx="10" ry="12" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="136" cy="144" r="5.5" fill={INK} />
              <circle cx="138" cy="141" r="2" fill="#FFFFFF" />
              <ellipse cx="186" cy="144" rx="10" ry="12" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="184" cy="144" r="5.5" fill={INK} />
              <circle cx="186" cy="141" r="2" fill="#FFFFFF" />
              {/* Bright Curved Smile */}
              <path
                d="M134 178 Q160 202 186 178 Z"
                fill="#FFFFFF"
                stroke={INK}
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
            </g>
          )}

          {expr === 'laughing' && (
            <g>
              {/* Joyful Raised Brows */}
              <path d="M118 122 Q134 112 148 122" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M172 122 Q186 112 202 122" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Crescent Joyful Eyes */}
              <path d="M122 146 Q134 132 146 146" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
              <path d="M174 146 Q186 132 198 146" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
              {/* Wide Open Laughing Mouth */}
              <path
                d="M128 174 Q160 170 192 174 C192 202 176 208 160 208 C144 208 128 202 128 174 Z"
                fill="#7F1D1D"
                stroke={INK}
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
              {/* Teeth & Tongue */}
              <path d="M132 175 L188 175 L185 184 L135 184 Z" fill="#FFFFFF" />
              <ellipse cx="160" cy="198" rx="15" ry="7" fill="#FB7185" />
              {/* Comic Laugh Energy Marks */}
              <path d="M84 128 L72 120 M82 142 L68 142" stroke="#FACC15" strokeWidth="4" strokeLinecap="round" />
            </g>
          )}

          {expr === 'sad' && (
            <g>
              {/* Drooping Brows */}
              <path d="M120 130 Q134 126 146 118" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M200 130 Q186 126 174 118" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Sad Eyes */}
              <ellipse cx="134" cy="146" rx="9" ry="11" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="134" cy="148" r="5" fill={INK} />
              <ellipse cx="186" cy="146" rx="9" ry="11" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="186" cy="148" r="5" fill={INK} />
              {/* Glistening Blue Tear Drops */}
              <path
                d="M126 158 C120 168 120 176 126 176 C132 176 132 168 126 158 Z"
                fill="#38BDF8"
                stroke={INK}
                strokeWidth="2.5"
              />
              <path
                d="M194 158 C188 168 188 176 194 176 C200 176 200 168 194 158 Z"
                fill="#38BDF8"
                stroke={INK}
                strokeWidth="2.5"
              />
              {/* Downturned Mouth */}
              <path
                d="M138 194 Q160 176 182 194"
                fill="none"
                stroke={INK}
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
          )}

          {expr === 'angry' && (
            <g>
              {/* Sharp V-Shaped Furrowed Brows */}
              <path d="M118 120 L148 134" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
              <path d="M202 120 L172 134" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
              {/* Intense Eyes */}
              <ellipse cx="134" cy="146" rx="9" ry="9" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="136" cy="146" r="4.5" fill={INK} />
              <ellipse cx="186" cy="146" rx="9" ry="9" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="184" cy="146" r="4.5" fill={INK} />
              {/* Gritted / Shouting Mouth */}
              <rect
                x="134"
                y="176"
                width="52"
                height="20"
                rx="8"
                fill="#FFFFFF"
                stroke={INK}
                strokeWidth="4.5"
              />
              <path d="M148 176 L148 196 M160 176 L160 196 M172 176 L172 196" stroke={INK} strokeWidth="2.5" />
              {/* Subtle Comic Anger Vein Mark */}
              <path
                d="M196 108 Q202 114 208 108 M196 122 Q202 116 208 122 M194 114 Q200 114 194 120 M210 114 Q204 114 210 120"
                fill="none"
                stroke="#F43F5E"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {expr === 'shocked' && (
            <g>
              {/* High Shocked Brows */}
              <path d="M120 116 Q134 106 148 116" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M172 116 Q186 106 200 116" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Wide Circular Eyes */}
              <circle cx="134" cy="144" r="14" fill="#FFFFFF" stroke={INK} strokeWidth="4.5" />
              <circle cx="134" cy="144" r="4.5" fill={INK} />
              <circle cx="186" cy="144" r="14" fill="#FFFFFF" stroke={INK} strokeWidth="4.5" />
              <circle cx="186" cy="144" r="4.5" fill={INK} />
              {/* Open "O" Mouth */}
              <ellipse
                cx="160"
                cy="186"
                rx="14"
                ry="17"
                fill="#7F1D1D"
                stroke={INK}
                strokeWidth="4.5"
              />
              {/* Comic Exclamation / Sweat Drop */}
              <path
                d="M236 118 C230 130 230 140 236 140 C242 140 242 130 236 118 Z"
                fill="#38BDF8"
                stroke={INK}
                strokeWidth="2.5"
              />
              <path d="M74 110 L86 120 M70 126 L84 130" stroke="#FACC15" strokeWidth="4" strokeLinecap="round" />
            </g>
          )}

          {expr === 'love' && (
            <g>
              {/* Sweet Relaxed Brows */}
              <path d="M120 122 Q134 114 148 122" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              <path d="M172 122 Q186 114 200 122" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              {/* Heart-Shaped Eyes */}
              <path
                d="M134 155 C120 146 120 132 130 132 C133 132 134 136 134 136 C134 136 135 132 138 132 C148 132 148 146 134 155 Z"
                fill="#F43F5E"
                stroke={INK}
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path
                d="M186 155 C172 146 172 132 182 132 C185 132 186 136 186 136 C186 136 187 132 190 132 C200 132 200 146 186 155 Z"
                fill="#F43F5E"
                stroke={INK}
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {/* Rosy Cheeks */}
              <ellipse cx="116" cy="166" rx="10" ry="6" fill="#FB7185" opacity="0.7" />
              <ellipse cx="204" cy="166" rx="10" ry="6" fill="#FB7185" opacity="0.7" />
              {/* Sweet Smile */}
              <path
                d="M140 180 Q160 198 180 180"
                fill="none"
                stroke={INK}
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
          )}

          {expr === 'confused' && (
            <g>
              {/* One Raised Eyebrow, One Flat */}
              <path d="M118 120 Q134 108 148 120" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M172 128 L200 128" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Asymmetrical Eyes */}
              <circle cx="134" cy="144" r="11" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="136" cy="143" r="5" fill={INK} />
              <ellipse cx="186" cy="146" rx="10" ry="8" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="188" cy="146" r="4.5" fill={INK} />
              {/* Squiggly / Tilted Mouth */}
              <path
                d="M138 186 Q149 178 160 186 Q171 194 182 184"
                fill="none"
                stroke={INK}
                strokeWidth="4.5"
                strokeLinecap="round"
              />
              {/* Floating "?" Comic Mark (counter-flipped when flip=true so ? reads forward) */}
              <g transform={flip ? 'translate(244, 96) scale(-1, 1) translate(-244, -96)' : undefined}>
                <text
                  x="232"
                  y="108"
                  fontSize="36"
                  fontWeight="900"
                  fill="#FACC15"
                  stroke={INK}
                  strokeWidth="3"
                >
                  ?
                </text>
              </g>
            </g>
          )}

          {expr === 'jealous' && (
            <g>
              {/* Furrowed Envy Brows */}
              <path d="M118 124 L148 130" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              <path d="M172 126 Q188 118 202 126" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Narrowed Side-Glance Eyes */}
              <rect x="122" y="138" width="24" height="12" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="140" cy="144" r="4.5" fill={INK} />
              <rect x="174" y="138" width="24" height="12" rx="6" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="192" cy="144" r="4.5" fill={INK} />
              {/* Tight Pursed Envy Mouth */}
              <path d="M138 184 Q152 178 164 185 Q176 188 184 180" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Green Envy Aura Mark */}
              <path d="M224 114 L234 104 M230 124 L242 120" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
            </g>
          )}

          {expr === 'embarrassed' && (
            <g>
              {/* Shy Tilted Brows */}
              <path d="M118 128 Q134 120 146 116" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              <path d="M202 128 Q186 120 174 116" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
              {/* Shy Averted Eyes */}
              <ellipse cx="134" cy="144" rx="10" ry="11" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="139" cy="146" r="5" fill={INK} />
              <ellipse cx="186" cy="144" rx="10" ry="11" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="191" cy="146" r="5" fill={INK} />
              {/* Bright Rosy Blush + Comic Hatch Lines */}
              <ellipse cx="116" cy="166" rx="12" ry="7" fill="#F472B6" opacity="0.75" />
              <ellipse cx="204" cy="166" rx="12" ry="7" fill="#F472B6" opacity="0.75" />
              <path d="M110 169 L114 163 M117 169 L121 163 M199 169 L203 163 M206 169 L210 163" stroke="#BE185D" strokeWidth="2" strokeLinecap="round" />
              {/* Sheepish Wavy Smile */}
              <path d="M140 184 Q150 192 160 184 Q170 192 180 184" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Small Sweat Drop */}
              <path d="M232 120 C227 130 227 138 232 138 C237 138 237 130 232 120 Z" fill="#38BDF8" stroke={INK} strokeWidth="2.5" />
            </g>
          )}

          {expr === 'excited' && (
            <g>
              {/* High Excited Brows */}
              <path d="M118 114 Q134 104 148 114" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M172 114 Q186 104 202 114" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Sparkling Star-Burst Eyes */}
              <circle cx="134" cy="144" r="13" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <polygon points="134,134 137,141 144,144 137,147 134,154 131,147 124,144 131,141" fill="#FACC15" stroke={INK} strokeWidth="1.5" />
              <circle cx="186" cy="144" r="13" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <polygon points="186,134 189,141 196,144 189,147 186,154 183,147 176,144 183,141" fill="#FACC15" stroke={INK} strokeWidth="1.5" />
              {/* Huge Beaming Smile */}
              <path d="M130 174 Q160 208 190 174 Z" fill="#FFFFFF" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
              {/* Golden Excitement Rays */}
              <path d="M76 116 L90 124 M74 138 L88 138 M244 116 L230 124 M246 138 L232 138" stroke="#FACC15" strokeWidth="4.5" strokeLinecap="round" />
            </g>
          )}

          {expr === 'suspicious' && (
            <g>
              {/* One Sharp Raised Brow, One Flat Low Brow */}
              <path d="M118 118 Q134 108 148 122" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              <path d="M172 130 L202 128" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              {/* Half-Lidded Squinting Eyes */}
              <path d="M122 142 L146 142 Q146 153 134 153 Q122 153 122 142 Z" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="139" cy="146" r="4" fill={INK} />
              <path d="M174 142 L198 142 Q198 153 186 153 Q174 153 174 142 Z" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="191" cy="146" r="4" fill={INK} />
              {/* Skeptical Sideways Mouth */}
              <path d="M142 186 L180 182" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
            </g>
          )}

          {expr === 'nervous' && (
            <g>
              {/* Worried Raised Brows */}
              <path d="M118 126 Q132 120 146 114" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M202 126 Q188 120 174 114" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Wide Worried Eyes with Tiny Pupils */}
              <circle cx="134" cy="144" r="12" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="134" cy="144" r="3.5" fill={INK} />
              <circle cx="186" cy="144" r="12" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <circle cx="186" cy="144" r="3.5" fill={INK} />
              {/* Wavy Chattering Mouth */}
              <path d="M134 184 Q143 177 152 184 Q161 191 170 184 Q179 177 186 184" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Prominent Sweat Drop */}
              <path d="M234 112 C227 125 227 136 234 136 C241 136 241 125 234 112 Z" fill="#38BDF8" stroke={INK} strokeWidth="3" />
            </g>
          )}

          {expr === 'proud' && (
            <g>
              {/* Confident High Brows */}
              <path d="M118 120 Q134 112 148 120" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M172 120 Q186 112 202 120" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Confident Closed-Arc Smug Eyes */}
              <path d="M122 144 Q134 136 146 144" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              <path d="M174 144 Q186 136 198 144" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              {/* Broad Confident Grin */}
              <path d="M134 178 Q162 200 188 176" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
              {/* Golden Shine Sparkle */}
              <polygon points="236,104 239,112 247,115 239,118 236,126 233,118 225,115 233,112" fill="#FACC15" stroke={INK} strokeWidth="2" />
            </g>
          )}

          {expr === 'bored' && (
            <g>
              {/* Flat Horizontal Brows */}
              <path d="M120 128 L148 128" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M172 128 L200 128" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              {/* Heavy Drooping Half-Closed Eyelids */}
              <circle cx="134" cy="144" r="10" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <path d="M124 144 L144 144 L144 134 Q134 132 124 134 Z" fill={palette.skinShade} stroke={INK} strokeWidth="3.5" />
              <circle cx="134" cy="148" r="3.5" fill={INK} />
              <circle cx="186" cy="144" r="10" fill="#FFFFFF" stroke={INK} strokeWidth="4" />
              <path d="M176 144 L196 144 L196 134 Q186 132 176 134 Z" fill={palette.skinShade} stroke={INK} strokeWidth="3.5" />
              <circle cx="186" cy="148" r="3.5" fill={INK} />
              {/* Flat Unimpressed / Small O Yawn Mouth */}
              <ellipse cx="160" cy="186" rx="10" ry="6" fill="#7F1D1D" stroke={INK} strokeWidth="4" />
            </g>
          )}
        </g>
      </g>
    </svg>
  )
}
