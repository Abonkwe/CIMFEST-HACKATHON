import React, { useRef, useEffect } from 'react'
import Lottie from 'lottie-react'
import { useLottieAnimation } from '../lib/lottieActions'
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
 * Renders a smooth, expressive 60fps Lottie character animation (FR-20, FR-24).
 * Dynamically fetches and in-memory caches Lottie JSON.
 * Gracefully falls back to <PuppetCharacter /> if a .json file is missing or fails to load.
 */
export const LottieCharacter: React.FC<LottieCharacterProps> = ({
  characterId,
  action = 'idle',
  facingLeft = false,
  isPoseB = false,
  prop = 'none',
  isPlaying = false,
  className = '',
  style = {},
}) => {
  const { animationData, isLoading, hasError } = useLottieAnimation(action)
  const lottieRef = useRef<any>(null)

  // Pause/resume Lottie animation automatically when audio/scene play state toggles
  useEffect(() => {
    if (!lottieRef.current) return
    try {
      if (isPlaying) {
        lottieRef.current.play?.()
      } else {
        lottieRef.current.pause?.()
      }
    } catch {
      // Ignore if engine handle not yet mounted
    }
  }, [isPlaying])

  // Safe Fallback: If missing from /public/assets/lottie/ or failed to load,
  // fall back gracefully to our rigged <PuppetCharacter /> so the stage never renders blank.
  if (hasError || (!isLoading && !animationData)) {
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

  // Loading state while dynamic fetch completes
  if (isLoading && !animationData) {
    return (
      <div className={`relative flex items-end justify-center select-none pointer-events-none ${className}`} style={style}>
        <PuppetCharacter
          characterId={characterId}
          action={action}
          facingLeft={facingLeft}
          isPoseB={isPoseB}
          prop={prop}
          className="w-full h-full opacity-60"
        />
      </div>
    )
  }

  // Lottie Animation Render
  // Supports both `src` (lottie-react v3+) and `animationData` (v2+)
  const lottieProps: any = {
    src: animationData,
    animationData: animationData,
    loop: true,
    autoplay: isPlaying,
    lottieRef: lottieRef,
    className: 'w-full h-full object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.6)]',
  }

  return (
    <div
      className={`relative flex items-end justify-center select-none pointer-events-none ${className}`}
      style={style}
    >
      <Lottie {...lottieProps} />
    </div>
  )
}
