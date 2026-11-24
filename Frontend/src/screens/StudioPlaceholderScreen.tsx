import React from 'react'
import { StudioPage } from '../pages/StudioPage'

interface StudioPlaceholderScreenProps {
  onNavigateTab: (tab: string) => void
}

export const StudioPlaceholderScreen: React.FC<StudioPlaceholderScreenProps> = ({ onNavigateTab }) => {
  return <StudioPage onNavigateTab={onNavigateTab} />
}
