import React from 'react'
import { MixamoStoryStage, type MixamoStoryStageProps } from './MixamoStoryStage'
import type { StoryBackground } from '../types'

export type BackgroundTheme = StoryBackground
export type StagePlayerProps = MixamoStoryStageProps

/**
 * StagePlayer: Delegates directly to the 3D Interactive Storytelling Engine (<MixamoStoryStage />)
 * (FR-20 - FR-24, NFR-8)
 */
export const StagePlayer: React.FC<StagePlayerProps> = (props) => {
  return <MixamoStoryStage {...props} />
}

export { MixamoStoryStage }
