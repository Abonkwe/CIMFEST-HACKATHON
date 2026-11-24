import React from 'react'

interface StudioPlaceholderScreenProps {
  onNavigateTab: (tab: string) => void
}

export const StudioPlaceholderScreen: React.FC<StudioPlaceholderScreenProps> = ({ onNavigateTab }) => {

  return (
    <div className="space-y-6 pb-24 md:pb-16 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#536D56] to-[#2e4231] p-6 sm:p-8 text-white shadow-2xl border border-[#536D56]">
        <div className="absolute top-2 right-4 text-4xl text-[#F43F5E] animate-pulse">
          ✦
        </div>

        <div className="max-w-xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-xs font-bold text-[#FACC15]">
            <span>✨ Animation Studio Lite</span>
            <span>·</span>
            <span>Step 2 Preview</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Where Cameroonian Beats Meet Character Animation
          </h2>

          <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed">
            In Frontend Step 2, you will be able to pick from 2–3 Cameroonian characters (KmerBoy, MboaGirl, ToonDancer), sequence synchronized dance moves (sway, footwork, spin, jump_beat) on an audio beat grid, and export lightweight JSON animations!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onNavigateTab('trending')}
              className="py-2.5 px-6 rounded-full font-bold text-xs bg-white hover:bg-neutral-100 text-neutral-900 transition shadow-md active:scale-95 cursor-pointer"
            >
              Browse Trending Songs
            </button>
            <button
              onClick={() => onNavigateTab('feed')}
              className="py-2.5 px-5 rounded-full font-semibold text-xs bg-black/30 hover:bg-black/50 text-white border border-white/20 transition active:scale-95 cursor-pointer"
            >
              Watch Community Feed →
            </button>
          </div>
        </div>
      </div>

      {/* Feature Teaser Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/30 space-y-2">
          <div className="text-3xl">🕺</div>
          <h4 className="text-sm font-bold text-white">Local Character Avatars</h4>
          <p className="text-xs text-neutral-400">
            KmerBoy, MboaGirl, and ToonDancer outfitted in authentic Cameroonian urban and traditional style.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/30 space-y-2">
          <div className="text-3xl">⏱️</div>
          <h4 className="text-sm font-bold text-white">Beat-Synced Timeline</h4>
          <p className="text-xs text-neutral-400">
            Visual BPM timeline automatically snapping dance moves to Makossa and Bikutsi rhythm grids.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-[#121212] border border-[#536D56]/30 space-y-2">
          <div className="text-3xl">⚡</div>
          <h4 className="text-sm font-bold text-white">Low-Bandwidth (NFR-2)</h4>
          <p className="text-xs text-neutral-400">
            Moves stored as lightweight JSON data instead of heavy video files, saving precious mobile data.
          </p>
        </div>
      </div>
    </div>
  )
}
