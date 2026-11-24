import React from 'react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'

interface MobileHeaderProps {
  currentTab: string
  onTabChange: (tab: string) => void
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onTabChange }) => {
  const { lang, toggleLang, t } = useLanguage()
  const { user, openLoginModal } = useAuth()

  return (
    <header className="md:hidden sticky top-0 z-30 w-full bg-[#121212]/95 backdrop-blur-md border-b border-[#536D56]/30 px-4 py-3 flex items-center justify-between">
      {/* Brand */}
      <div
        onClick={() => onTabChange('trending')}
        className="flex items-center gap-2 cursor-pointer"
      >
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[#536D56] to-neutral-900 border border-[#536D56] flex items-center justify-center shadow">
          <span className="text-base">🎵</span>
          <span className="absolute -top-1 -right-1 text-[10px] text-[#F43F5E] animate-pulse">
            ✦
          </span>
        </div>
        <div>
          <span className="text-base font-black text-white tracking-tight">BeatToons</span>
          <span className="ml-1 text-xs">🇨🇲</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Bilingual EN / FR toggle */}
        <button
          onClick={toggleLang}
          className="px-2 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
        >
          <span className={lang === 'en' ? 'text-[#FACC15]' : 'text-neutral-400'}>EN</span>
          <span className="mx-0.5 text-neutral-600">/</span>
          <span className={lang === 'fr' ? 'text-[#FACC15]' : 'text-neutral-400'}>FR</span>
        </button>

        {/* User Pill or Login */}
        {user ? (
          <button
            onClick={() => onTabChange('account')}
            className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-neutral-900 border border-[#536D56]/50 text-xs text-white"
          >
            <div className="w-5 h-5 rounded-full bg-[#536D56] flex items-center justify-center text-[10px] font-bold">
              {user.display_name.slice(0, 1).toUpperCase()}
            </div>
            <span className="max-w-[70px] truncate font-medium">{user.display_name}</span>
          </button>
        ) : (
          <button
            onClick={openLoginModal}
            className="px-3 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs transition shadow-sm active:scale-95 cursor-pointer"
          >
            {t('navLogin')}
          </button>
        )}
      </div>
    </header>
  )
}
