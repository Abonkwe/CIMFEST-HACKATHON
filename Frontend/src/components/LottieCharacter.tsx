import React from 'react'
import { PuppetCharacter } from './PuppetCharacter'

export interface LottieCharacterProps {
  characterId: string
  action?: string
  facingLeft?: boolean
  isPoseB?: boolean
  prop?: string
  isPlaying?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * 2D Character Animation Fallback (FR-20, FR-24).
 * Rigged SVG character rendering used as an offline/lightweight fallback.
 */
export const LottieCharacter: React.FC<LottieCharacterProps> = ({
  characterId,
  action = 'idle',
  facingLeft = false,
  isPoseB = false,
  prop = 'none',
  className = '',
  style = {},
}) => {
  return (
    <PuppetCharacter
      characterId={characterId}
      action={action}
      facingLeft={facingLeft}
      isPoseB={isPoseB}
      prop={prop}
      className={className}
      style={style}
    />
  )
}
