import React from 'react'
import { ComicCharacter, expressionFromAction } from './ComicCharacter'

export interface LottieCharacterProps {
  characterId: string
  action?: string
  facingLeft?: boolean
  isPoseB?: boolean
  prop?: string
  isPlaying?: boolean
  className?: string
}

export const LottieCharacter: React.FC<LottieCharacterProps> = ({
  characterId,
  action = 'happy',
  facingLeft = false,
  className = '',
}) => {
  return (
    <ComicCharacter
      characterId={characterId}
      expression={expressionFromAction(action)}
      flip={facingLeft}
      className={className}
    />
  )
}
