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
import { AccountPage } from './pages/AccountPage'
import { StudioPage } from './pages/StudioPage'

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
    <div className="min-h-screen w-full bg-[#121212] text-neutral-100 flex flex-col antialiased selection:bg-[#F43F5E] selection:text-white">
      {/* 
        Full-screen responsive container:
        - Mobile (< 768px): Full width single-column with mobile header & bottom nav
        - Tablet (768px - 1023px): Full width with sticky left sidebar + wide main workspace
        - Desktop (>= 1024px): Full-screen width edge-to-edge layout with expansive main workspace
          (Studio spans full available width; Trending & Challenges feature rich right sidebar on xl:)
      */}
      <div className="w-full min-h-screen flex flex-col md:flex-row relative bg-[#121212]">
        {/* Mobile Header (< 768px) */}
        <MobileHeader currentTab={currentTab} onTabChange={handleTabChange} />

        {/* Desktop Left Sidebar (md:+) */}
        <div className="hidden md:block shrink-0 sticky top-0 h-screen p-3 lg:p-4 z-30">
          <Sidebar currentTab={currentTab} onTabChange={handleTabChange} />
        </div>

        {/* Center Main Workspace */}
        <main className="flex-1 w-full min-w-0 px-4 sm:px-6 md:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 overflow-y-auto max-h-screen">
          {currentTab === 'trending' && <TrendingScreen onNavigateTab={handleTabChange} />}
          {currentTab === 'challenges' && <ChallengesScreen onNavigateTab={handleTabChange} />}
          {currentTab === 'feed' && <FeedScreen />}
          {currentTab === 'studio' && <StudioPage onNavigateTab={handleTabChange} />}
          {currentTab === 'account' && <AccountPage onNavigateTab={handleTabChange} />}
        </main>

        {/* Desktop Right Sticky Sidebar on wide screens (Trending & Challenges & Feed only) */}
        {currentTab !== 'studio' && currentTab !== 'account' && (
          <div className="hidden xl:block shrink-0 sticky top-0 h-screen p-3 lg:p-4 z-20">
            <RightSidebar currentTab={currentTab} onNavigateTab={handleTabChange} />
          </div>
        )}

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
