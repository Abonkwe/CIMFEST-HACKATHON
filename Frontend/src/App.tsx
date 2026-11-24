import React, { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { AudioProvider } from './context/AudioContext'
import { Sidebar } from './components/Sidebar'
import { MobileHeader } from './components/MobileHeader'
import { MobileBottomNav } from './components/MobileBottomNav'
import { RightSidebar } from './components/RightSidebar'
import { AudioPlayerBar } from './components/AudioPlayerBar'
import { LoginModal } from './components/LoginModal'

import { TrendingScreen } from './screens/TrendingScreen'
import { ChallengesScreen } from './screens/ChallengesScreen'
import { FeedScreen } from './screens/FeedScreen'
import { AccountScreen } from './screens/AccountScreen'
import { StudioPlaceholderScreen } from './screens/StudioPlaceholderScreen'

function resolveInitialTab(): string {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '').toLowerCase()
    if (['trending', 'challenges', 'feed', 'studio', 'account'].includes(hash)) {
      return hash
    }
    const path = window.location.pathname.replace('/', '').toLowerCase()
    if (['trending', 'challenges', 'feed', 'studio', 'account'].includes(path)) {
      return path
    }
  }
  return 'trending'
}

const MainShell: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>(resolveInitialTab)

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab)
    if (typeof window !== 'undefined') {
      window.location.hash = `#${tab}`
    }
  }

  // Handle browser back/forward or hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase()
      if (['trending', 'challenges', 'feed', 'studio', 'account'].includes(hash)) {
        setCurrentTab(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <div className="min-h-screen bg-[#8FA993] text-neutral-100 flex flex-col items-center justify-start p-0 md:p-4">
      {/* 
        Matte charcoal-black app container (#121212) framed inside soft sage-green (#8FA993) on desktop 
        Mobile (< 768px): Single-column max-w-[430px]
      */}
      <div className="w-full max-w-[430px] md:max-w-7xl min-h-screen md:min-h-[calc(100vh-2rem)] bg-[#121212] md:rounded-3xl shadow-2xl flex flex-col md:flex-row relative border-0 md:border md:border-[#536D56]/50 overflow-hidden">
        {/* Mobile Header (< 768px) */}
        <MobileHeader currentTab={currentTab} onTabChange={handleTabChange} />

        {/* Desktop Left Sidebar (md:+) */}
        <div className="hidden md:block p-4 shrink-0">
          <Sidebar currentTab={currentTab} onTabChange={handleTabChange} />
        </div>

        {/* Center Main Workspace */}
        <main className="flex-1 w-full min-w-0 px-4 md:px-6 py-4 md:py-6 overflow-y-auto max-h-screen md:max-h-[calc(100vh-2rem)]">
          {currentTab === 'trending' && <TrendingScreen onNavigateTab={handleTabChange} />}
          {currentTab === 'challenges' && <ChallengesScreen onNavigateTab={handleTabChange} />}
          {currentTab === 'feed' && <FeedScreen />}
          {currentTab === 'studio' && <StudioPlaceholderScreen onNavigateTab={handleTabChange} />}
          {currentTab === 'account' && <AccountScreen />}
        </main>

        {/* Desktop Right Sticky Sidebar (md:+) */}
        <div className="hidden lg:block p-4 shrink-0">
          <RightSidebar currentTab={currentTab} onNavigateTab={handleTabChange} />
        </div>

        {/* Floating HTML5 Audio Player Bar across all screens */}
        <AudioPlayerBar />

        {/* Mobile Bottom Navigation Bar (< 768px) */}
        <MobileBottomNav currentTab={currentTab} onTabChange={handleTabChange} />

        {/* Login Modal */}
        <LoginModal />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <MainShell />
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
