import React from 'react'
import { useLanguage } from '../context/LanguageContext'

interface MobileBottomNavProps {
  currentTab: string
  onTabChange: (tab: string) => void
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, onTabChange }) => {
  const { t } = useLanguage()

  const tabs = [
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
      id: 'challenges',
      label: t('navChallenges'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      id: 'studio',
      label: '+ Studio',
      isCenter: true,
      icon: (
        <span className="text-xl">✨</span>
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
      id: 'account',
      label: t('navAccount'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#121212]/95 backdrop-blur-lg border-t border-[#536D56]/40 px-2 py-1.5 flex items-center justify-around">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id
        if (tab.isCenter) {
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative -top-2 flex flex-col items-center justify-center cursor-pointer group"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 shadow-lg ${
                  isActive
                    ? 'bg-[#F43F5E] text-white ring-4 ring-[#F43F5E]/30 scale-105'
                    : 'bg-gradient-to-tr from-[#536D56] to-[#F43F5E] text-white hover:scale-105'
                }`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-neutral-300 mt-0.5">Studio</span>
            </button>
          )
        }

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
              isActive ? 'text-[#FACC15]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <div className="relative">
              {tab.icon}
              {isActive && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
              )}
            </div>
            <span className={`text-[10px] font-semibold mt-1 ${isActive ? 'text-white' : ''}`}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

