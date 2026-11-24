import React from 'react'
import { motion } from 'framer-motion'
import { getPuppetPose, PUPPET_SPRING_TRANSITION } from '../lib/puppetActions'

export interface PuppetCharacterProps {
  characterId: string
  action?: string
  facingLeft?: boolean
  isPoseB?: boolean
  prop?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Normalizes character IDs from feed/studio to one of our 3 rigged characters
 */
function normalizeId(raw?: string): 'tantie' | 'mboa_boy' | 'pa_buea' {
  if (!raw) return 'tantie'
  const lower = raw.toLowerCase()
  if (lower.includes('tantie') || lower.includes('mama') || lower.includes('girl')) return 'tantie'
  if (lower.includes('buea') || lower.includes('pa') || lower.includes('elder')) return 'pa_buea'
  return 'mboa_boy'
}

export const PuppetCharacter: React.FC<PuppetCharacterProps> = ({
  characterId,
  action = 'approach',
  facingLeft = false,
  isPoseB = false,
  prop = 'none',
  className = '',
  style = {},
}) => {
  const normChar = normalizeId(characterId)
  const pose = getPuppetPose(action, facingLeft, isPoseB, prop)

  // Character Color Schemes (Thick-ink Editorial Aesthetics)
  const isTantie = normChar === 'tantie'
  const isMboaBoy = normChar === 'mboa_boy'
  const isPaBuea = normChar === 'pa_buea'

  // Skin tones
  const skinTone = isTantie ? '#7C3F1E' : isPaBuea ? '#5C3119' : '#6A371B'
  const skinHighlight = isTantie ? '#8E4B25' : isPaBuea ? '#6D3B20' : '#7D4323'

  return (
    <div
      className={`relative flex items-end justify-center select-none pointer-events-none ${className}`}
      style={style}
    >
      <svg
        viewBox="0 0 320 480"
        className="w-full h-full overflow-visible drop-shadow-[0_12px_16px_rgba(0,0,0,0.6)]"
      >
        <defs>
          {/* Tantie Boubou Wax Print Gradient */}
          <linearGradient id="tantie-wax" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E11D48" />
            <stop offset="50%" stopColor="#BE123C" />
            <stop offset="100%" stopColor="#FACC15" />
          </linearGradient>

          {/* Mboa Boy Streetwear Hoodie Gradient */}
          <linearGradient id="mboa-hoodie" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Pa Buea Traditional Royal Tunic Gradient */}
          <linearGradient id="pa-tunic" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Sunglasses Gradient */}
          <linearGradient id="sunglasses-lens" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E1E1E" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>
        </defs>

        {/* ========================================================= */}
        {/* ROOT JOINT: Overall Position, Fall Rotation & Facing Scale */}
        {/* ========================================================= */}
        <motion.g
          id="puppet-root"
          animate={{
            x: pose.root.x,
            y: pose.root.y,
            rotate: pose.root.rotate,
            scaleX: pose.root.scaleX,
            scaleY: pose.root.scaleY,
          }}
          transition={PUPPET_SPRING_TRANSITION}
          style={{ transformOrigin: '160px 420px' }}
        >
          {/* ======================================================= */}
          {/* 1. LEFT LEG & FOOT (Back Leg Layer) */}
          {/* ======================================================= */}
          <motion.g
            id="left-hip"
            animate={{ rotate: pose.leftLeg.hip }}
            transition={PUPPET_SPRING_TRANSITION}
            style={{ transformOrigin: '140px 270px' }}
          >
            {/* Left Thigh */}
            <path
              d="M130 270 Q130 330 132 350 L148 350 Q150 330 150 270 Z"
              fill={isTantie ? '#4C0519' : isPaBuea ? '#1E293B' : '#18181B'}
              stroke="#09090B"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Left Knee Joint & Shin / Shoe */}
            <motion.g
              id="left-knee"
              animate={{ rotate: pose.leftLeg.knee }}
              transition={PUPPET_SPRING_TRANSITION}
              style={{ transformOrigin: '140px 350px' }}
            >
              {/* Shin */}
              <path
                d="M132 350 L134 415 L146 415 L148 350 Z"
                fill={isTantie ? '#4C0519' : isPaBuea ? '#1E293B' : '#18181B'}
                stroke="#09090B"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              {/* Shoe */}
              <path
                d="M125 415 L152 415 C158 415 162 422 158 428 L122 428 C118 428 118 415 125 415 Z"
                fill={isTantie ? '#FACC15' : isPaBuea ? '#78350F' : '#FFFFFF'}
                stroke="#09090B"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {isMboaBoy && (
                <rect x="120" y="424" width="40" height="4" rx="2" fill="#10B981" />
              )}
            </motion.g>
          </motion.g>

          {/* ======================================================= */}
          {/* 2. RIGHT LEG & FOOT (Front Leg Layer) */}
          {/* ======================================================= */}
          <motion.g
            id="right-hip"
            animate={{ rotate: pose.rightLeg.hip }}
            transition={PUPPET_SPRING_TRANSITION}
            style={{ transformOrigin: '180px 270px' }}
          >
            {/* Right Thigh */}
            <path
              d="M170 270 Q170 330 172 350 L188 350 Q190 330 190 270 Z"
              fill={isTantie ? '#4C0519' : isPaBuea ? '#1E293B' : '#18181B'}
              stroke="#09090B"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Right Knee Joint & Shin / Shoe */}
            <motion.g
              id="right-knee"
              animate={{ rotate: pose.rightLeg.knee }}
              transition={PUPPET_SPRING_TRANSITION}
              style={{ transformOrigin: '180px 350px' }}
            >
              {/* Shin */}
              <path
                d="M172 350 L174 415 L186 415 L188 350 Z"
                fill={isTantie ? '#4C0519' : isPaBuea ? '#1E293B' : '#18181B'}
                stroke="#09090B"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              {/* Shoe */}
              <path
                d="M165 415 L192 415 C198 415 202 422 198 428 L162 428 C158 428 158 415 165 415 Z"
                fill={isTantie ? '#FACC15' : isPaBuea ? '#78350F' : '#FFFFFF'}
                stroke="#09090B"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              {isMboaBoy && (
                <rect x="160" y="424" width="40" height="4" rx="2" fill="#10B981" />
              )}
            </motion.g>
          </motion.g>

          {/* ======================================================= */}
          {/* 3. LEFT ARM (Back Arm Layer) */}
          {/* ======================================================= */}
          <motion.g
            id="left-shoulder"
            animate={{ rotate: pose.leftArm.shoulder }}
            transition={PUPPET_SPRING_TRANSITION}
            style={{ transformOrigin: '120px 175px' }}
          >
            {/* Upper Arm Sleeve */}
            <path
              d="M110 170 Q105 210 108 225 L128 225 Q132 205 130 170 Z"
              fill={isTantie ? 'url(#tantie-wax)' : isMboaBoy ? 'url(#mboa-hoodie)' : 'url(#pa-tunic)'}
              stroke="#09090B"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Left Elbow & Forearm / Hand */}
            <motion.g
              id="left-elbow"
              animate={{ rotate: pose.leftArm.elbow }}
              transition={PUPPET_SPRING_TRANSITION}
              style={{ transformOrigin: '118px 225px' }}
            >
              {/* Forearm (Skin or Sleeve) */}
              <path
                d="M112 225 L106 270 L124 270 L126 225 Z"
                fill={skinTone}
                stroke="#09090B"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              {/* Tantie Bangles */}
              {isTantie && (
                <rect x="106" y="260" width="18" height="5" rx="2" fill="#FACC15" stroke="#09090B" strokeWidth="2" />
              )}
              {/* Hand */}
              <circle cx="114" cy="280" r="11" fill={skinTone} stroke="#09090B" strokeWidth="3.5" />
            </motion.g>
          </motion.g>

          {/* ======================================================= */}
          {/* 4. TORSO & CLOTHING */}
          {/* ======================================================= */}
          <motion.g
            id="puppet-torso"
            animate={{
              rotate: pose.torso.rotate,
              y: pose.torso.y,
            }}
            transition={PUPPET_SPRING_TRANSITION}
            style={{ transformOrigin: '160px 270px' }}
          >
            {/* TANTIE: Flowing African Wax Boubou */}
            {isTantie && (
              <g id="tantie-body">
                <path
                  d="M120 170 C105 200 95 240 100 280 L220 280 C225 240 215 200 200 170 Z"
                  fill="url(#tantie-wax)"
                  stroke="#09090B"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                {/* Traditional Wax Print Patterns */}
                <path d="M125 210 L160 185 L195 210 L160 235 Z" fill="#FACC15" stroke="#09090B" strokeWidth="2.5" />
                <path d="M135 250 L160 230 L185 250 L160 270 Z" fill="#F43F5E" stroke="#09090B" strokeWidth="2.5" />
                <path d="M160 170 L160 280" stroke="#09090B" strokeWidth="3" strokeDasharray="4 4" />
                {/* Royal Gold Collar */}
                <path d="M140 170 Q160 195 180 170" fill="#FACC15" stroke="#09090B" strokeWidth="3.5" />
              </g>
            )}

            {/* MBOA BOY: Urban Streetwear Hoodie */}
            {isMboaBoy && (
              <g id="mboa-body">
                <path
                  d="M115 170 C110 205 110 245 118 280 L202 280 C210 245 210 205 205 170 Z"
                  fill="url(#mboa-hoodie)"
                  stroke="#09090B"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                {/* Hoodie Kangaroo Pocket */}
                <path
                  d="M130 240 L190 240 C195 240 198 250 195 275 L125 275 C122 250 125 240 130 240 Z"
                  fill="#047857"
                  stroke="#09090B"
                  strokeWidth="3.5"
                />
                {/* Hoodie White Drawstrings */}
                <path d="M152 175 L150 210" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                <path d="M168 175 L170 210" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                {/* Collar Ribbing */}
                <path d="M142 170 Q160 185 178 170" fill="none" stroke="#09090B" strokeWidth="4" />
              </g>
            )}

            {/* PA BUEA: Traditional Royal Blue Embroidered Tunic */}
            {isPaBuea && (
              <g id="pa-buea-body">
                <path
                  d="M115 165 C110 200 110 250 112 285 L208 285 C210 250 210 200 205 165 Z"
                  fill="url(#pa-tunic)"
                  stroke="#09090B"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                {/* Royal Gold Filigree Embroidery Down Chest */}
                <path d="M160 165 L160 280" stroke="#FACC15" strokeWidth="4" strokeLinecap="round" />
                <path d="M150 190 Q160 178 170 190" fill="none" stroke="#FACC15" strokeWidth="3" />
                <path d="M148 215 Q160 203 172 215" fill="none" stroke="#FACC15" strokeWidth="3" />
                <path d="M146 240 Q160 228 174 240" fill="none" stroke="#FACC15" strokeWidth="3" />
                {/* Stiff Regal Collar */}
                <path d="M140 165 L150 155 L170 155 L180 165 Z" fill="#FACC15" stroke="#09090B" strokeWidth="3" />
              </g>
            )}

            {/* ======================================================= */}
            {/* 5. HEAD & FACIAL EXPRESSIONS */}
            {/* ======================================================= */}
            <motion.g
              id="puppet-head"
              animate={{
                rotate: pose.head.rotate,
                y: pose.head.y,
              }}
              transition={PUPPET_SPRING_TRANSITION}
              style={{ transformOrigin: '160px 165px' }}
            >
              {/* Neck */}
              <rect
                x="147"
                y="145"
                width="26"
                height="24"
                rx="4"
                fill={skinTone}
                stroke="#09090B"
                strokeWidth="4"
              />

              {/* Head Base Silhouette */}
              <path
                d="M120 110 C120 70 200 70 200 110 C200 148 180 158 160 158 C140 158 120 148 120 110 Z"
                fill={skinTone}
                stroke="#09090B"
                strokeWidth="4"
                strokeLinejoin="round"
              />

              {/* Ears */}
              <circle cx="118" cy="112" r="8" fill={skinHighlight} stroke="#09090B" strokeWidth="3.5" />
              <circle cx="202" cy="112" r="8" fill={skinHighlight} stroke="#09090B" strokeWidth="3.5" />

              {/* Tantie's Gold Hoop Earrings */}
              {isTantie && (
                <>
                  <circle cx="116" cy="122" r="7" fill="none" stroke="#FACC15" strokeWidth="3" />
                  <circle cx="204" cy="122" r="7" fill="none" stroke="#FACC15" strokeWidth="3" />
                </>
              )}

              {/* ----------------------------------------------------- */}
              {/* Character Specific Hair / Headwear */}
              {/* ----------------------------------------------------- */}

              {/* TANTIE: Sculpted Afro Puffs & Headwrap */}
              {isTantie && (
                <g id="tantie-headwear">
                  {/* Left Afro Puff */}
                  <circle cx="112" cy="72" r="28" fill="#18181B" stroke="#09090B" strokeWidth="4" />
                  <circle cx="112" cy="72" r="24" fill="#27272A" />
                  {/* Gold Scrunchie Left */}
                  <ellipse cx="122" cy="88" rx="8" ry="6" fill="#FACC15" stroke="#09090B" strokeWidth="2.5" />

                  {/* Right Afro Puff */}
                  <circle cx="208" cy="72" r="28" fill="#18181B" stroke="#09090B" strokeWidth="4" />
                  <circle cx="208" cy="72" r="24" fill="#27272A" />
                  {/* Gold Scrunchie Right */}
                  <ellipse cx="198" cy="88" rx="8" ry="6" fill="#FACC15" stroke="#09090B" strokeWidth="2.5" />

                  {/* Wax Front Hairline / Band */}
                  <path
                    d="M120 95 Q160 78 200 95 C190 75 130 75 120 95 Z"
                    fill="#BE123C"
                    stroke="#09090B"
                    strokeWidth="3.5"
                  />
                </g>
              )}

              {/* MBOA BOY: Urban Beanie with Cameroon Flag Tag */}
              {isMboaBoy && (
                <g id="mboa-beanie">
                  {/* Beanie Dome */}
                  <path
                    d="M115 100 C110 50 210 50 205 100 Z"
                    fill="#18181B"
                    stroke="#09090B"
                    strokeWidth="4"
                  />
                  {/* Folded Beanie Cuff */}
                  <rect
                    x="112"
                    y="90"
                    width="96"
                    height="18"
                    rx="8"
                    fill="#27272A"
                    stroke="#09090B"
                    strokeWidth="3.5"
                  />
                  {/* Cameroon Flag Badge Tag 🇨🇲 */}
                  <g transform="translate(182, 94)">
                    <rect x="0" y="0" width="4" height="10" fill="#10B981" />
                    <rect x="4" y="0" width="4" height="10" fill="#EF4444" />
                    <rect x="8" y="0" width="4" height="10" fill="#FACC15" />
                    <circle cx="6" cy="5" r="1.2" fill="#FACC15" />
                  </g>
                </g>
              )}

              {/* PA BUEA: Graying Afro Hair, Beard & Mustache */}
              {isPaBuea && (
                <g id="pa-buea-hair">
                  {/* Dignified Hair Outline with Salt & Pepper highlights */}
                  <path
                    d="M118 95 C115 60 205 60 202 95 Z"
                    fill="#3F3F46"
                    stroke="#09090B"
                    strokeWidth="4"
                  />
                  <path d="M135 75 Q160 70 185 75" stroke="#D4D4D8" strokeWidth="2" fill="none" />

                  {/* Full Dignified Graying Beard & Chin */}
                  <path
                    d="M130 125 C130 168 190 168 190 125 C185 155 135 155 130 125 Z"
                    fill="#3F3F46"
                    stroke="#09090B"
                    strokeWidth="3.5"
                  />
                  <path d="M145 150 Q160 156 175 150" stroke="#D4D4D8" strokeWidth="2" fill="none" />

                  {/* Distinguished Mustache */}
                  <path
                    d="M142 130 Q160 135 178 130 C165 138 155 138 142 130 Z"
                    fill="#27272A"
                    stroke="#09090B"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* ----------------------------------------------------- */}
              {/* Dynamic Expression Layer (Eyes, Brows, Mouth, VFX) */}
              {/* ----------------------------------------------------- */}

              {/* EYEBROWS */}
              {pose.head.expression === 'angry' ? (
                // Slanted angry brows
                <>
                  <line x1="135" y1="100" x2="152" y2="105" stroke="#09090B" strokeWidth="4" strokeLinecap="round" />
                  <line x1="168" y1="105" x2="185" y2="100" stroke="#09090B" strokeWidth="4" strokeLinecap="round" />
                </>
              ) : pose.head.expression === 'shocked' ? (
                // Arched raised surprised brows
                <>
                  <path d="M135 94 Q145 88 153 94" fill="none" stroke="#09090B" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M167 94 Q175 88 185 94" fill="none" stroke="#09090B" strokeWidth="3.5" strokeLinecap="round" />
                </>
              ) : pose.head.expression === 'cry' ? (
                // Tilted up sad brows
                <>
                  <line x1="135" y1="102" x2="152" y2="98" stroke="#09090B" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="168" y1="98" x2="185" y2="102" stroke="#09090B" strokeWidth="3.5" strokeLinecap="round" />
                </>
              ) : (
                // Normal friendly brows
                <>
                  <path d="M136 98 Q144 95 152 98" fill="none" stroke="#09090B" strokeWidth="3" strokeLinecap="round" />
                  <path d="M168 98 Q176 95 184 98" fill="none" stroke="#09090B" strokeWidth="3" strokeLinecap="round" />
                </>
              )}

              {/* EYES */}
              {isTantie ? (
                // TANTIE: Chic Designer Cat-Eye Sunglasses
                <g id="tantie-sunglasses">
                  <path
                    d="M130 102 L155 104 C158 116 138 122 130 114 Z"
                    fill="url(#sunglasses-lens)"
                    stroke="#09090B"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M190 102 L165 104 C162 116 182 122 190 114 Z"
                    fill="url(#sunglasses-lens)"
                    stroke="#09090B"
                    strokeWidth="3.5"
                  />
                  {/* Bridge */}
                  <line x1="154" y1="104" x2="166" y2="104" stroke="#09090B" strokeWidth="3.5" />
                  {/* Lens Gloss Reflection */}
                  <line x1="134" y1="105" x2="148" y2="114" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.7" />
                  <line x1="172" y1="105" x2="186" y2="114" stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.7" />
                </g>
              ) : pose.head.expression === 'shocked' ? (
                // Shocked Big Round Eyes
                <>
                  <circle cx="144" cy="107" r="9" fill="#FFFFFF" stroke="#09090B" strokeWidth="3.5" />
                  <circle cx="144" cy="107" r="3" fill="#09090B" />
                  <circle cx="176" cy="107" r="9" fill="#FFFFFF" stroke="#09090B" strokeWidth="3.5" />
                  <circle cx="176" cy="107" r="3" fill="#09090B" />
                </>
              ) : pose.head.expression === 'laugh' ? (
                // Laugh Joyful Arcs (^ ^)
                <>
                  <path d="M138 108 Q144 102 150 108" fill="none" stroke="#09090B" strokeWidth="4" strokeLinecap="round" />
                  <path d="M170 108 Q176 102 182 108" fill="none" stroke="#09090B" strokeWidth="4" strokeLinecap="round" />
                </>
              ) : pose.head.expression === 'cry' ? (
                // Crying Closed Curves
                <>
                  <path d="M138 106 Q144 112 150 106" fill="none" stroke="#09090B" strokeWidth="4" strokeLinecap="round" />
                  <path d="M170 106 Q176 112 182 106" fill="none" stroke="#09090B" strokeWidth="4" strokeLinecap="round" />
                </>
              ) : (
                // Friendly Standard Eyes
                <>
                  <ellipse cx="144" cy="107" rx="6" ry="7" fill="#09090B" />
                  <circle cx="146" cy="105" r="2" fill="#FFFFFF" />
                  <ellipse cx="176" cy="107" rx="6" ry="7" fill="#09090B" />
                  <circle cx="178" cy="105" r="2" fill="#FFFFFF" />
                </>
              )}

              {/* PA BUEA'S WIRE GLASSES */}
              {isPaBuea && (
                <g id="pa-buea-glasses">
                  <circle cx="144" cy="108" r="12" fill="none" stroke="#FACC15" strokeWidth="3" />
                  <circle cx="176" cy="108" r="12" fill="none" stroke="#FACC15" strokeWidth="3" />
                  <line x1="156" y1="108" x2="164" y2="108" stroke="#FACC15" strokeWidth="3" />
                </g>
              )}

              {/* NOSE */}
              <path d="M157 114 Q160 120 165 119" fill="none" stroke="#09090B" strokeWidth="3" strokeLinecap="round" />

              {/* MOUTH */}
              {pose.head.expression === 'laugh' ? (
                // Wide Open Laughing Mouth
                <path
                  d="M146 126 Q160 148 174 126 Z"
                  fill="#991B1B"
                  stroke="#09090B"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
              ) : pose.head.expression === 'shocked' ? (
                // Shocked 'O' Mouth
                <ellipse cx="160" cy="132" rx="7" ry="9" fill="#09090B" />
              ) : pose.head.expression === 'angry' ? (
                // Angry Gritted Teeth Mouth
                <path
                  d="M148 132 L172 132"
                  stroke="#09090B"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              ) : pose.head.expression === 'cry' ? (
                // Crying Quivering Mouth
                <path
                  d="M148 135 Q160 127 172 135"
                  fill="none"
                  stroke="#09090B"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              ) : (
                // Warm Smile
                <path
                  d="M150 127 Q160 137 170 127"
                  fill="none"
                  stroke="#09090B"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              )}

              {/* DYNAMIC VFX OVERLAYS */}
              {/* 1. Falling Animated Teardrops for 'cry_sad' */}
              {pose.vfx.tears && (
                <g id="vfx-tears">
                  <motion.path
                    d="M138 116 C136 122 134 130 134 136 C134 140 138 142 140 140 C142 138 140 132 138 116 Z"
                    fill="#38BDF8"
                    animate={{ y: [0, 18, 30], opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'easeIn' }}
                  />
                  <motion.path
                    d="M182 116 C180 122 178 130 178 136 C178 140 182 142 184 140 C186 138 184 132 182 116 Z"
                    fill="#38BDF8"
                    animate={{ y: [0, 18, 30], opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'easeIn', delay: 0.2 }}
                  />
                </g>
              )}

              {/* 2. Sweat Bead for 'shocked' */}
              {pose.vfx.sweatDrop && (
                <motion.path
                  d="M192 90 C190 94 187 99 187 103 C187 106 190 108 192 107 C194 105 194 101 192 90 Z"
                  fill="#38BDF8"
                  animate={{ y: [0, 8, 14], opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              )}

              {/* 3. Orbiting Cartoon Dizzy Stars for 'slip_fall' */}
              {pose.vfx.dizzyStars && (
                <motion.g
                  id="vfx-dizzy-stars"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                  style={{ transformOrigin: '160px 70px' }}
                >
                  <text x="140" y="55" fontSize="18" fill="#FACC15">✦</text>
                  <text x="175" y="55" fontSize="14" fill="#FACC15">✦</text>
                  <text x="155" y="40" fontSize="16" fill="#F43F5E">✦</text>
                </motion.g>
              )}
            </motion.g>
          </motion.g>

          {/* ======================================================= */}
          {/* 6. RIGHT ARM (Front Arm Layer) */}
          {/* ======================================================= */}
          <motion.g
            id="right-shoulder"
            animate={{ rotate: pose.rightArm.shoulder }}
            transition={PUPPET_SPRING_TRANSITION}
            style={{ transformOrigin: '200px 175px' }}
          >
            {/* Upper Arm Sleeve */}
            <path
              d="M190 170 Q195 210 192 225 L212 225 Q215 205 210 170 Z"
              fill={isTantie ? 'url(#tantie-wax)' : isMboaBoy ? 'url(#mboa-hoodie)' : 'url(#pa-tunic)'}
              stroke="#09090B"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {/* Right Elbow & Forearm / Hand */}
            <motion.g
              id="right-elbow"
              animate={{ rotate: pose.rightArm.elbow }}
              transition={PUPPET_SPRING_TRANSITION}
              style={{ transformOrigin: '202px 225px' }}
            >
              {/* Forearm */}
              <path
                d="M194 225 L196 270 L214 270 L212 225 Z"
                fill={skinTone}
                stroke="#09090B"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              {/* Tantie Bangles */}
              {isTantie && (
                <rect x="196" y="260" width="18" height="5" rx="2" fill="#FACC15" stroke="#09090B" strokeWidth="2" />
              )}
              {/* Hand */}
              <circle cx="206" cy="280" r="11" fill={skinTone} stroke="#09090B" strokeWidth="3.5" />

              {/* Handheld Props attached directly to front hand */}
              {prop === 'phone' && (
                <g id="hand-held-phone" transform="translate(196, 265)">
                  <rect x="0" y="0" width="22" height="34" rx="4" fill="#0F172A" stroke="#FACC15" strokeWidth="2" />
                  <rect x="3" y="4" width="16" height="22" rx="2" fill="#38BDF8" />
                  <circle cx="11" cy="30" r="1.5" fill="#FFFFFF" />
                </g>
              )}
              {prop === 'gift_box' && (
                <g id="hand-held-gift" transform="translate(185, 255)">
                  <rect x="0" y="8" width="40" height="32" rx="4" fill="#BE123C" stroke="#09090B" strokeWidth="2.5" />
                  <rect x="-3" y="2" width="46" height="8" rx="2" fill="#E11D48" stroke="#09090B" strokeWidth="2" />
                  <rect x="16" y="2" width="8" height="38" fill="#FACC15" />
                  {/* Bow */}
                  <ellipse cx="16" cy="0" rx="6" ry="4" fill="#FACC15" stroke="#09090B" strokeWidth="1.5" />
                  <ellipse cx="24" cy="0" rx="6" ry="4" fill="#FACC15" stroke="#09090B" strokeWidth="1.5" />
                </g>
              )}
            </motion.g>
          </motion.g>
        </motion.g>
      </svg>
    </div>
  )
}

