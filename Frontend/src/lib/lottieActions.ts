import { useState, useEffect } from 'react'

/**
 * Story action to local Lottie .json path mapping (SRS FR-20, FR-24)
 * Assets are stored locally in /public/assets/lottie/ for fast offline/low-bandwidth loading.
 */
export const ACTION_TO_LOTTIE_PATH: Record<string, string> = {
  idle: '/assets/lottie/idle.json',
  walk_in: '/assets/lottie/walk.json',
  approach: '/assets/lottie/walk.json',
  walk_away: '/assets/lottie/walk.json',
  turn_around: '/assets/lottie/wave_happy.json',
  wave_happy: '/assets/lottie/wave_happy.json',
  shocked: '/assets/lottie/shocked.json',
  angry_argue: '/assets/lottie/angry.json',
  cry_sad: '/assets/lottie/cry.json',
  laugh: '/assets/lottie/laugh.json',
  celebrate: '/assets/lottie/celebrate.json',
  kneel: '/assets/lottie/celebrate.json',
  slip_fall: '/assets/lottie/shocked.json',
  // Legacy rhythmic dance actions
  sway: '/assets/lottie/wave_happy.json',
  stomp: '/assets/lottie/walk.json',
  jump: '/assets/lottie/celebrate.json',
  flex: '/assets/lottie/celebrate.json',
}

/**
 * In-memory cache for dynamically fetched Lottie JSON objects (NFR-2).
 * Ensures each .json file is only fetched over the network once.
 */
const lottieCache = new Map<string, any>()

/**
 * Fetches and validates a Lottie JSON animation from a path, caching the result in memory.
 * Returns null if the file is missing (e.g. 404) or corrupted, triggering safe fallback.
 */
export async function loadLottieAnimation(path: string): Promise<any | null> {
  if (lottieCache.has(path)) {
    return lottieCache.get(path)
  }

  try {
    const res = await fetch(path, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      return null
    }
    const data = await res.json()
    // Verify valid Bodymovin / Lottie specification fields
    if (data && typeof data === 'object' && (data.v || data.layers || data.fr)) {
      lottieCache.set(path, data)
      return data
    }
    return null
  } catch {
    // Graceful fallback on network error or JSON parse issue
    return null
  }
}

/**
 * React hook that dynamically loads Lottie animation data for a given story action.
 * Returns { animationData, isLoading, hasError, path }.
 */
export function useLottieAnimation(action: string) {
  const normAction = (action || 'idle').toLowerCase()
  const path = ACTION_TO_LOTTIE_PATH[normAction] || ACTION_TO_LOTTIE_PATH.idle

  const [animationData, setAnimationData] = useState<any | null>(() => lottieCache.get(path) || null)
  const [isLoading, setIsLoading] = useState<boolean>(!lottieCache.has(path))
  const [hasError, setHasError] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true

    if (lottieCache.has(path)) {
      setAnimationData(lottieCache.get(path))
      setIsLoading(false)
      setHasError(false)
      return
    }

    setIsLoading(true)
    loadLottieAnimation(path)
      .then((data) => {
        if (!isMounted) return
        if (data) {
          setAnimationData(data)
          setHasError(false)
        } else {
          setAnimationData(null)
          setHasError(true)
        }
      })
      .catch(() => {
        if (!isMounted) return
        setAnimationData(null)
        setHasError(true)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [path])

  return { animationData, isLoading, hasError, path }
}

/**
 * Smooth Framer Motion spring transition specified for Lottie positioning wrappers:
 * transition={{ type: "spring", stiffness: 120, damping: 20 }}
 */
export const LOTTIE_STAGE_SPRING = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
}

export interface LottieStageMotion {
  x: number
  y: number
  rotate: number
  scaleX: number
}

/**
 * Calculates the stage coordinate glide & transforms for the persistent wrapper:
 * - walk_in: glides smoothly from off-screen left/right into stage position while walk.json plays
 * - approach: glides closer to the other character while walk.json plays
 * - walk_away: flips direction and glides off-screen while walk.json plays
 * - slip_fall: smoothly rotates 90 degrees onto the stage floor with a bounce
 */
export function getLottieStageMotion(
  action: string = 'idle',
  facingLeft: boolean = false,
  isPoseB: boolean = false
): LottieStageMotion {
  const dir = facingLeft ? -1 : 1
  const baseScaleX = facingLeft ? -1 : 1
  const a = (action || 'idle').toLowerCase()

  switch (a) {
    case 'walk_in':
      return {
        x: dir * (isPoseB ? 12 : -55),
        y: isPoseB ? -4 : 0,
        rotate: 0,
        scaleX: baseScaleX,
      }

    case 'approach':
      return {
        x: dir * (isPoseB ? 46 : 28),
        y: isPoseB ? -4 : 0,
        rotate: 0,
        scaleX: baseScaleX,
      }

    case 'walk_away':
      return {
        x: -dir * (isPoseB ? 90 : 60),
        y: isPoseB ? -4 : 0,
        rotate: 0,
        scaleX: -baseScaleX, // flips direction to face off-stage
      }

    case 'turn_around':
      return {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: -baseScaleX,
      }

    case 'slip_fall':
      return {
        x: dir * -15,
        y: 85,
        rotate: dir * -88, // 90-degree comedic slip onto floor with bounce
        scaleX: baseScaleX,
      }

    case 'kneel':
      return {
        x: dir * 18,
        y: 42,
        rotate: dir * -4,
        scaleX: baseScaleX,
      }

    case 'shocked':
      return {
        x: -dir * 28,
        y: -14,
        rotate: dir * -3,
        scaleX: baseScaleX,
      }

    case 'angry_argue':
      return {
        x: dir * 22,
        y: 0,
        rotate: dir * 6,
        scaleX: baseScaleX,
      }

    case 'cry_sad':
      return {
        x: 0,
        y: 14,
        rotate: 0,
        scaleX: baseScaleX,
      }

    case 'laugh':
      return {
        x: 0,
        y: isPoseB ? -8 : 0,
        rotate: 0,
        scaleX: baseScaleX,
      }

    case 'celebrate':
    case 'jump':
      return {
        x: 0,
        y: isPoseB ? -36 : -8,
        rotate: 0,
        scaleX: baseScaleX,
      }

    case 'sway':
      return {
        x: isPoseB ? dir * 12 : -dir * 12,
        y: isPoseB ? -5 : 0,
        rotate: isPoseB ? dir * 6 : -dir * 6,
        scaleX: baseScaleX,
      }

    case 'stomp':
      return {
        x: 0,
        y: isPoseB ? -16 : 4,
        rotate: 0,
        scaleX: baseScaleX,
      }

    case 'flex':
      return {
        x: 0,
        y: isPoseB ? -6 : 0,
        rotate: isPoseB ? dir * 4 : -dir * 4,
        scaleX: baseScaleX,
      }

    case 'idle':
    default:
      return {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: baseScaleX,
      }
  }
}
