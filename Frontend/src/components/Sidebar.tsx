import React from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'

interface SidebarProps {
  currentTab: string
  onTabChange: (tab: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { lang, toggleLang, t } = useLanguage()
  const { user, openLoginModal } = useAuth()

  const navItems = [
    {
      id: 'trending',
      label: t('navTrending'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: 'music',
      label: 'Music',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      badge: 'Offline',
    },
    {
      id: 'challenges',
      label: t('navChallenges'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      id: 'feed',
      label: t('navFeed'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'studio',
      label: t('navStudio'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      badge: 'Step 2',
      highlight: true,
    },
    {
      id: 'account',
      label: t('navAccount'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    ...(user?.role === 'artist'
      ? [
          {
            id: 'artist-studio',
            label: 'Artist Studio',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            ),
            badge: 'Artist',
          },
        ]
      : []),
    ...(user?.role === 'admin'
      ? [
          {
            id: 'admin',
            label: 'Admin',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ),
            badge: 'Team',
          },
        ]
      : []),
  ]

  return (
    <aside className="hidden md:flex flex-col justify-between w-60 lg:w-64 h-full bg-[#121212] border border-[#536D56]/40 rounded-3xl p-4 lg:p-5 shadow-2xl shrink-0 overflow-y-auto">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Logo with starburst */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => onTabChange('trending')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#536D56] to-neutral-900 border border-[#536D56] flex items-center justify-center shadow-lg group-hover:scale-105 transition">
              {/* Starburst accent */}
              <span className="absolute -top-1 -right-1 text-xs text-[#F43F5E] animate-pulse">
                ✦
              </span>
              <span className="text-xl">🎵</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black tracking-tight text-white">CamVibe</span>
                <span className="text-xs">🇨🇲</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">CIMFEST 2026</p>
            </div>
          </div>

          {/* Bilingual EN / FR Toggle */}
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-[#536D56]/40 text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-sm"
            title="Toggle Language (EN / FR)"
          >
            <span className={lang === 'en' ? 'text-[#FACC15]' : 'text-neutral-400'}>EN</span>
            <span className="mx-1 text-neutral-600">/</span>
            <span className={lang === 'fr' ? 'text-[#FACC15]' : 'text-neutral-400'}>FR</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebarActivePill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-2xl bg-[#536D56] shadow-md shadow-[#536D56]/30"
                  />
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <span className={isActive ? 'text-[#FACC15]' : 'text-neutral-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="relative z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom User Area */}
      <div className="pt-4 border-t border-neutral-800">
        {user ? (
          <div
            onClick={() => onTabChange('account')}
            className="flex items-center justify-between p-2 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#536D56]/40 border border-[#536D56] flex items-center justify-center text-xs font-bold text-white shrink-0">
                {user.display_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{user.display_name}</div>
                <div className="text-[10px] text-neutral-400 truncate">{user.region} 🇨🇲</div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FACC15]/20 text-[#FACC15] font-semibold shrink-0">
              {user.role === 'artist' ? 'Artist' : user.role === 'admin' ? 'Admin' : 'Creator'}
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px] text-neutral-400">
              <span>{t('navGuest')}</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <button
              onClick={() => openLoginModal()}
              className="w-full py-2.5 px-3 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs transition shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{t('navLogin')}</span>
              <span className="text-[#F43F5E]">✦</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
