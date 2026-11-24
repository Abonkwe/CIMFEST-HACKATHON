/**
 * Joint Angle Configurations, Expressions & Spring Interpolation Curves
 * for Articulated 2D Vector Puppets (FR-20, FR-21, FR-24, NFR-2)
 *
 * Powers 60fps spring transitions across all 12 story actions + 4 legacy dance moves:
 * - walk_in, approach, walk_away: dynamic walking stride cycles
 * - turn_around: horizontal scale flip with shoulder dip
 * - kneel: authentic one-knee proposal stance
 * - slip_fall: comedic 90-degree backwards slip with dizzy stars
 * - wave_happy: friendly raised arm wave and warm smile
 * - shocked: backward recoil with wide eyes and mouth
 * - angry_argue: forward aggressive lean and pointing gesture
 * - cry_sad: slumped posture with animated falling tears
 * - laugh: head tilted back with rhythmic torso bounce
 * - celebrate: high jump with V-arms raised in victory
 */

export type PuppetExpression =
  | 'neutral'
  | 'happy'
  | 'laugh'
  | 'shocked'
  | 'angry'
  | 'cry'
  | 'love'

export interface PuppetPose {
  root: {
    x: number
    y: number
    rotate: number
    scaleX: number
    scaleY: number
  }
  torso: {
    rotate: number
    y: number
  }
  head: {
    rotate: number
    y: number
    expression: PuppetExpression
  }
  leftArm: {
    shoulder: number
    elbow: number
  }
  rightArm: {
    shoulder: number
    elbow: number
  }
  leftLeg: {
    hip: number
    knee: number
  }
  rightLeg: {
    hip: number
    knee: number
  }
  vfx: {
    tears?: boolean
    dizzyStars?: boolean
    sweatDrop?: boolean
  }
}

// Framer motion spring transitions: snappy, fluid, zero jitter
export const PUPPET_SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 170,
  damping: 16,
  mass: 0.85,
}

export const PUPPET_BOUNCE_TRANSITION = {
  type: 'spring' as const,
  stiffness: 240,
  damping: 12,
}

/**
 * Calculates joint angles and transforms based on action, facing direction, and rhythmic phase.
 */
export function getPuppetPose(
  action: string = 'approach',
  facingLeft: boolean = false,
  isPoseB: boolean = false,
  heldProp: string = 'none'
): PuppetPose {
  const baseScaleX = facingLeft ? -1 : 1
  const dir = facingLeft ? -1 : 1
  const normAction = (action || 'approach').toLowerCase()

  // Default neutral standing pose
  const pose: PuppetPose = {
    root: { x: 0, y: 0, rotate: 0, scaleX: baseScaleX, scaleY: 1 },
    torso: { rotate: 0, y: 0 },
    head: { rotate: 0, y: 0, expression: 'neutral' },
    leftArm: { shoulder: 15, elbow: 10 },
    rightArm: { shoulder: -15, elbow: 10 },
    leftLeg: { hip: 0, knee: 0 },
    rightLeg: { hip: 0, knee: 0 },
    vfx: {},
  }

  switch (normAction) {
    // -------------------------------------------------------------
    // 1. Locomotion: Walk In / Approach / Walk Away
    // -------------------------------------------------------------
    case 'walk_in': {
      // Walks smoothly from off-stage wings toward center
      const stride = isPoseB ? 28 : -28
      pose.root.x = dir * (isPoseB ? -15 : -55)
      pose.root.y = isPoseB ? -6 : 0
      pose.torso.rotate = 6
      pose.head.rotate = -4
      pose.head.expression = 'happy'
      // Alternating stride: left arm swings opposite to left leg
      pose.leftLeg.hip = stride
      pose.leftLeg.knee = isPoseB ? 24 : 8
      pose.rightLeg.hip = -stride
      pose.rightLeg.knee = isPoseB ? 8 : 24
      pose.leftArm.shoulder = -stride * 1.2
      pose.leftArm.elbow = 20
      pose.rightArm.shoulder = stride * 1.2
      pose.rightArm.elbow = 20
      break
    }

    case 'approach': {
      // Moves closer to center stage with friendly strut
      const stride = isPoseB ? 24 : -24
      pose.root.x = dir * (isPoseB ? 35 : 12)
      pose.root.y = isPoseB ? -5 : 0
      pose.torso.rotate = isPoseB ? 4 : -2
      pose.head.rotate = isPoseB ? -3 : 2
      pose.head.expression = 'happy'
      pose.leftLeg.hip = stride
      pose.leftLeg.knee = isPoseB ? 20 : 5
      pose.rightLeg.hip = -stride
      pose.rightLeg.knee = isPoseB ? 5 : 20
      pose.leftArm.shoulder = -stride
      pose.leftArm.elbow = 15
      pose.rightArm.shoulder = stride
      pose.rightArm.elbow = 15
      break
    }

    case 'walk_away': {
      // Turns away and walks toward the wings (stage exit)
      const stride = isPoseB ? 26 : -26
      pose.root.scaleX = -baseScaleX // flip facing direction to leave
      pose.root.x = -dir * (isPoseB ? 55 : 25)
      pose.root.y = isPoseB ? -6 : 0
      pose.torso.rotate = 8
      pose.head.rotate = 4
      pose.head.expression = 'neutral'
      pose.leftLeg.hip = stride
      pose.leftLeg.knee = isPoseB ? 22 : 6
      pose.rightLeg.hip = -stride
      pose.rightLeg.knee = isPoseB ? 6 : 22
      pose.leftArm.shoulder = -stride
      pose.rightArm.shoulder = stride
      break
    }

    // -------------------------------------------------------------
    // 2. Character Flip / Reversal
    // -------------------------------------------------------------
    case 'turn_around': {
      pose.root.scaleX = -baseScaleX
      pose.torso.rotate = isPoseB ? -8 : 6
      pose.head.rotate = isPoseB ? 6 : -4
      pose.head.expression = 'happy'
      pose.leftArm.shoulder = 25
      pose.rightArm.shoulder = -25
      break
    }

    // -------------------------------------------------------------
    // 3. Narrative Drama & Comedy Gestures
    // -------------------------------------------------------------
    case 'kneel': {
      // Authentic one-knee proposal/pleading posture
      pose.root.x = dir * 16
      pose.root.y = 48
      pose.torso.rotate = -8
      pose.head.rotate = -12
      pose.head.expression = 'love'
      // Left leg bent in front, right leg kneeling flat on ground
      pose.leftLeg.hip = -65
      pose.leftLeg.knee = 85
      pose.rightLeg.hip = 25
      pose.rightLeg.knee = 95
      // Arms outstretched with hands offering / pleading
      pose.leftArm.shoulder = -55
      pose.leftArm.elbow = -25
      pose.rightArm.shoulder = -65
      pose.rightArm.elbow = -30
      break
    }

    case 'slip_fall': {
      // Comedic banana slip: 90-degree backwards rotation onto floor with bouncing legs and dizzy stars
      pose.root.x = dir * -15
      pose.root.y = 80
      pose.root.rotate = dir * -84
      pose.torso.rotate = -15
      pose.head.rotate = 25
      pose.head.expression = 'shocked'
      // Flailing legs in the air
      pose.leftLeg.hip = -75
      pose.leftLeg.knee = 40
      pose.rightLeg.hip = -95
      pose.rightLeg.knee = 60
      // Arms thrown back in surprise
      pose.leftArm.shoulder = -140
      pose.leftArm.elbow = 45
      pose.rightArm.shoulder = -160
      pose.rightArm.elbow = 50
      pose.vfx.dizzyStars = true
      break
    }

    case 'wave_happy': {
      // Friendly, energetic greeting
      pose.root.y = isPoseB ? -4 : 0
      pose.torso.rotate = isPoseB ? 4 : 0
      pose.head.rotate = isPoseB ? -8 : -4
      pose.head.expression = 'happy'
      // Right arm raised high waving side to side
      pose.rightArm.shoulder = -135
      pose.rightArm.elbow = isPoseB ? 48 : 16
      // Left arm resting relaxed
      pose.leftArm.shoulder = 12
      pose.leftArm.elbow = 10
      break
    }

    case 'shocked': {
      // Dramatic recoil jump-back with hands to cheeks
      pose.root.x = -dir * 28
      pose.root.y = -18
      pose.torso.rotate = -10
      pose.head.rotate = -14
      pose.head.expression = 'shocked'
      // Hands grasping cheeks / near head
      pose.leftArm.shoulder = -95
      pose.leftArm.elbow = 115
      pose.rightArm.shoulder = -100
      pose.rightArm.elbow = 120
      pose.leftLeg.hip = -14
      pose.leftLeg.knee = 22
      pose.rightLeg.hip = 18
      pose.rightLeg.knee = 26
      pose.vfx.sweatDrop = true
      break
    }

    case 'angry_argue': {
      // Forward aggressive lean with pointing/jabbing gesture
      pose.root.x = dir * (isPoseB ? 18 : 12)
      pose.torso.rotate = 18
      pose.head.rotate = 8
      pose.head.expression = 'angry'
      // Right arm aggressively pointing / shaking
      pose.rightArm.shoulder = -75
      pose.rightArm.elbow = isPoseB ? -10 : -25
      // Left arm cocked on hip
      pose.leftArm.shoulder = 40
      pose.leftArm.elbow = 80
      pose.leftLeg.hip = 14
      pose.rightLeg.hip = -18
      break
    }

    case 'cry_sad': {
      // Slumped shoulders, drooping head, hands rubbing eyes, falling tears
      pose.root.y = 12
      pose.torso.rotate = 10
      pose.head.rotate = 22
      pose.head.expression = 'cry'
      pose.leftArm.shoulder = -85
      pose.leftArm.elbow = 120
      pose.rightArm.shoulder = -88
      pose.rightArm.elbow = 125
      pose.leftLeg.knee = 14
      pose.rightLeg.knee = 14
      pose.vfx.tears = true
      break
    }

    case 'laugh': {
      // Head thrown back, hearty rhythmic belly chuckle
      pose.root.y = isPoseB ? -8 : 0
      pose.torso.rotate = isPoseB ? -12 : -6
      pose.head.rotate = isPoseB ? -20 : -14
      pose.head.expression = 'laugh'
      // Hands near belly / clapping
      pose.leftArm.shoulder = -40
      pose.leftArm.elbow = 65
      pose.rightArm.shoulder = -45
      pose.rightArm.elbow = 70
      break
    }

    case 'celebrate': {
      // High jump with both arms raised in V-victory
      pose.root.y = isPoseB ? -38 : -20
      pose.root.scaleY = isPoseB ? 1.05 : 0.98
      pose.torso.rotate = isPoseB ? 4 : -4
      pose.head.rotate = 0
      pose.head.expression = 'happy'
      // Both arms thrust up high
      pose.leftArm.shoulder = -150
      pose.leftArm.elbow = 20
      pose.rightArm.shoulder = -150
      pose.rightArm.elbow = -20
      pose.leftLeg.hip = isPoseB ? -20 : 15
      pose.leftLeg.knee = 35
      pose.rightLeg.hip = isPoseB ? 20 : -15
      pose.rightLeg.knee = 35
      break
    }

    // -------------------------------------------------------------
    // 4. Legacy Rhythmic Dance Moves
    // -------------------------------------------------------------
    case 'sway': {
      pose.root.y = isPoseB ? -6 : 0
      pose.torso.rotate = isPoseB ? 9 : -9
      pose.head.rotate = isPoseB ? -7 : 7
      pose.head.expression = 'happy'
      pose.leftArm.shoulder = isPoseB ? 25 : -25
      pose.rightArm.shoulder = isPoseB ? -25 : 25
      break
    }

    case 'stomp': {
      pose.root.y = isPoseB ? -18 : 4
      pose.torso.rotate = isPoseB ? -4 : 6
      pose.head.rotate = isPoseB ? 6 : -4
      pose.head.expression = 'happy'
      pose.leftLeg.hip = isPoseB ? -35 : 0
      pose.leftLeg.knee = isPoseB ? 50 : 0
      pose.rightLeg.hip = isPoseB ? 0 : -35
      pose.rightLeg.knee = isPoseB ? 0 : 50
      pose.leftArm.shoulder = isPoseB ? -60 : 30
      pose.rightArm.shoulder = isPoseB ? 30 : -60
      break
    }

    case 'jump': {
      pose.root.y = isPoseB ? -32 : 2
      pose.root.scaleY = isPoseB ? 1.06 : 0.94
      pose.torso.rotate = 0
      pose.head.expression = 'happy'
      pose.leftArm.shoulder = -120
      pose.rightArm.shoulder = -120
      pose.leftLeg.hip = -15
      pose.leftLeg.knee = 25
      pose.rightLeg.hip = 15
      pose.rightLeg.knee = 25
      break
    }

    case 'flex': {
      pose.root.y = isPoseB ? -4 : 0
      pose.torso.rotate = isPoseB ? 6 : -6
      pose.head.expression = 'happy'
      pose.leftArm.shoulder = -90
      pose.leftArm.elbow = 90
      pose.rightArm.shoulder = -90
      pose.rightArm.elbow = -90
      break
    }

    default: {
      break
    }
  }

  // If holding a prop (like a phone or gift), adapt the right arm to hold it naturally
  if (heldProp === 'phone') {
    pose.rightArm.shoulder = -75
    pose.rightArm.elbow = 85
  } else if (heldProp === 'gift_box') {
    pose.leftArm.shoulder = -55
    pose.leftArm.elbow = 70
    pose.rightArm.shoulder = -55
    pose.rightArm.elbow = 70
  }

  return pose
}
