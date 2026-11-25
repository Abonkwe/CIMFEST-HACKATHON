import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
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
import { AdminPage } from './pages/AdminPage'
import { ArtistStudioPage } from './pages/ArtistStudioPage'
import { StudioPage } from './pages/StudioPage'

const VALID_TABS = ['trending', 'challenges', 'feed', 'studio', 'account', 'admin', 'artist-studio']

export interface NavigateParams {
  challenge_id?: string | null
  song_id?: string | null
}

function getChallengeIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null
  const searchParams = new URLSearchParams(window.location.search)
  const fromSearch = searchParams.get('challenge_id')
  if (fromSearch) return fromSearch
  const hashParts = window.location.hash.split('?')
  if (hashParts.length > 1) {
    return new URLSearchParams(hashParts[1]).get('challenge_id')
  }
  return null
}

function resolveInitialTab(): string {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '').split('?')[0].toLowerCase()
    if (VALID_TABS.includes(hash)) {
      return hash
    }
    const path = window.location.pathname.replace('/', '').toLowerCase()
    if (VALID_TABS.includes(path)) {
      return path
    }
  }
  return 'trending'
}

const MainShell: React.FC = () => {
  const { user } = useAuth()
  const [currentTab, setCurrentTab] = useState<string>(resolveInitialTab)
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    getChallengeIdFromLocation
  )

  const handleTabChange = (tab: string, params?: NavigateParams) => {
    setCurrentTab(tab)
    const nextChallengeId = params?.challenge_id ?? null
    setSelectedChallengeId(nextChallengeId)

    if (typeof window !== 'undefined') {
      const search = new URLSearchParams()
      if (nextChallengeId) search.set('challenge_id', nextChallengeId)
      if (params?.song_id) search.set('song_id', params.song_id)
      const qs = search.toString()
      const nextUrl = `/${tab}${qs ? `?${qs}` : ''}`
      window.history.pushState({}, '', nextUrl)
    }
  }

  // Handle browser back/forward or hash changes
  useEffect(() => {
    const handlePopOrHash = () => {
      setCurrentTab(resolveInitialTab())
      setSelectedChallengeId(getChallengeIdFromLocation())
    }
    window.addEventListener('hashchange', handlePopOrHash)
    window.addEventListener('popstate', handlePopOrHash)
    return () => {
      window.removeEventListener('hashchange', handlePopOrHash)
      window.removeEventListener('popstate', handlePopOrHash)
    }
  }, [])

  const isAdminUser = user?.role === 'admin'
  const isArtistUser = user?.role === 'artist'
  let effectiveTab = currentTab
  if (currentTab === 'admin' && !isAdminUser) {
    effectiveTab = 'trending'
  } else if (currentTab === 'artist-studio' && !isArtistUser) {
    effectiveTab = user ? 'account' : 'trending'
  }

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
          {effectiveTab === 'trending' && <TrendingScreen onNavigateTab={handleTabChange} />}
          {effectiveTab === 'challenges' && <ChallengesScreen onNavigateTab={handleTabChange} />}
          {effectiveTab === 'feed' && (
            <FeedScreen
              challengeId={selectedChallengeId}
              onNavigateTab={handleTabChange}
            />
          )}
          {effectiveTab === 'studio' && (
            <StudioPage
              challengeId={selectedChallengeId}
              onNavigateTab={handleTabChange}
            />
          )}
          {effectiveTab === 'account' && <AccountPage onNavigateTab={handleTabChange} />}
          {effectiveTab === 'artist-studio' && isArtistUser && (
            <ArtistStudioPage onNavigateTab={handleTabChange} />
          )}
          {effectiveTab === 'admin' && isAdminUser && <AdminPage />}
        </main>

        {/* Desktop Right Sticky Sidebar on wide screens (Trending & Challenges & Feed only) */}
        {effectiveTab !== 'studio' &&
          effectiveTab !== 'account' &&
          effectiveTab !== 'admin' &&
          effectiveTab !== 'artist-studio' && (
          <div className="hidden xl:block shrink-0 sticky top-0 h-screen p-3 lg:p-4 z-20">
            <RightSidebar
              currentTab={currentTab}
              challengeId={selectedChallengeId}
              onNavigateTab={handleTabChange}
            />
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
