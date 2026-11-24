import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { applyForArtist } from '../lib/api'

export const AccountScreen: React.FC = () => {
  const { user, token, isGuest, openLoginModal, logout } = useAuth()
  const { t } = useLanguage()

  // Artist Application Form state (FR-5)
  const [artistName, setArtistName] = useState('')
  const [instagramLink, setInstagramLink] = useState('')
  const [youtubeLink, setYoutubeLink] = useState('')
  const [spotifyLink, setSpotifyLink] = useState('')
  const [audiomackLink, setAudiomackLink] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  // MTN / Orange Money Tipping Mockup state (FR-36, SRS Section 1.3)
  const [selectedTipAmount, setSelectedTipAmount] = useState<number>(1000)
  const [tipSuccessMessage, setTipSuccessMessage] = useState<string | null>(null)

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !user) {
      openLoginModal()
      return
    }

    if (!artistName.trim()) {
      setApplyError('Please enter your stage / artist name')
      return
    }

    setApplyLoading(true)
    setApplyError(null)

    try {
      const social_links: Record<string, string> = {}
      if (instagramLink.trim()) social_links['instagram'] = instagramLink.trim()
      if (youtubeLink.trim()) social_links['youtube'] = youtubeLink.trim()

      const release_links: string[] = []
      if (spotifyLink.trim()) release_links.push(spotifyLink.trim())
      if (audiomackLink.trim()) release_links.push(audiomackLink.trim())

      await applyForArtist(
        {
          artist_name: artistName.trim(),
          social_links,
          release_links,
        },
        token
      )

      setApplySuccess(true)
    } catch (err: any) {
      setApplyError(err?.message || 'Failed to submit application.')
    } finally {
      setApplyLoading(false)
    }
  }

  const handleMockTip = (provider: 'MTN' | 'Orange') => {
    const formatted = selectedTipAmount.toLocaleString()
    setTipSuccessMessage(
      `🎉 Simulated ${provider} Money Tip of ${formatted} FCFA sent to Petit Pays Jr! (Tipping & Creator Fund in Roadmap v2)`
    )
    setTimeout(() => {
      setTipSuccessMessage(null)
    }, 4000)
  }

  return (
    <div className="space-y-6 pb-24 md:pb-16 animate-fade-in max-w-5xl mx-auto">
      {/* 1. Profile Header Card */}
      <div className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#536D56]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#536D56] to-neutral-800 border-2 border-[#536D56] flex items-center justify-center text-2xl font-black text-white shadow-lg shrink-0">
              {user ? user.display_name.slice(0, 2).toUpperCase() : '👤'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user ? user.display_name : 'Guest User'}
                </h2>
                {user?.role === 'artist' && (
                  <span className="text-[#FACC15] text-sm" title="Verified Cameroonian Artist">
                    ✓
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                <span>{user ? user.phone : 'Not signed in'}</span>
                <span>·</span>
                <span className="text-[#8FA993] font-medium">
                  {user ? `${user.region} Region 🇨🇲` : 'Browsing Cameroon Charts'}
                </span>
              </div>

              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#536D56]/50 bg-[#536D56]/20 text-neutral-200 uppercase tracking-wider">
                {user ? `Role: ${user.role}` : 'Guest Explorer'}
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isGuest ? (
              <button
                onClick={openLoginModal}
                className="py-2.5 px-6 rounded-full font-bold text-xs bg-white hover:bg-neutral-100 text-neutral-900 transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{t('loginButton')}</span>
                <span className="text-[#F43F5E]">✦</span>
              </button>
            ) : (
              <button
                onClick={logout}
                className="py-2.5 px-5 rounded-full font-semibold text-xs border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition active:scale-95 cursor-pointer"
              >
                {t('logoutButton')}
              </button>
            )}
          </div>
        </div>

        {/* Guest prompt notice */}
        {isGuest && (
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
            <span className="text-base shrink-0">💡</span>
            <span>{t('guestWarning')}</span>
          </div>
        )}
      </div>

      {/* 2. User Creations & Badges (FR-34) */}
      <div className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{t('myCreations')}</h3>
            <p className="text-xs text-neutral-400">Animated dances entered in challenges (FR-34)</p>
          </div>
          <span className="text-xs font-mono text-[#FACC15] bg-[#FACC15]/10 px-2.5 py-1 rounded-full border border-[#FACC15]/20">
            1 Active Entry
          </span>
        </div>

        {/* Display created animation preview */}
        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#536D56] to-neutral-800 flex items-center justify-center text-2xl shadow">
              🕺
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Feel the Douala energy!</h4>
              <p className="text-xs text-neutral-400">
                Track: <span className="text-neutral-200">Douala Makossa Pulse</span> · Character: <span className="text-neutral-200">KmerBoy</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-white font-bold">245</span> <span className="text-neutral-500">views</span>
            </div>
            <div className="text-right">
              <span className="text-[#FACC15] font-bold">2</span> <span className="text-neutral-500">votes</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              RANK #1
            </span>
          </div>
        </div>
      </div>

      {/* 3. Verified Artist Application Form (POST /artists/apply, FR-5, FR-9) */}
      <div className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 sm:p-7 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#536D56]/30 border border-[#536D56] flex items-center justify-center text-lg">
              🎤
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {t('artistApplyTitle')}
              </h3>
              <p className="text-xs text-neutral-400">{t('artistApplySubtitle')}</p>
            </div>
          </div>
          <span className="text-xs font-mono text-neutral-400">FR-5 · FR-9</span>
        </div>

        {applySuccess ? (
          <div className="py-6 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <h4 className="text-sm font-bold text-white">Application Received</h4>
            <p className="text-xs max-w-md mx-auto">{t('applicationSubmitted')}</p>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">
              Status: Pending Admin Review
            </span>
          </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
            {applyError && (
              <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
                {applyError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t('artistNameLabel')} *
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="e.g. Petit Pays Jr, Buea SoundBoy"
                required
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Instagram / Social Media Link
                </label>
                <input
                  type="url"
                  value={instagramLink}
                  onChange={(e) => setInstagramLink(e.target.value)}
                  placeholder="https://instagram.com/myartistname"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  YouTube Channel / Video Link
                </label>
                <input
                  type="url"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder="https://youtube.com/@myartistname"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Spotify / Streaming Release Link
                </label>
                <input
                  type="url"
                  value={spotifyLink}
                  onChange={(e) => setSpotifyLink(e.target.value)}
                  placeholder="https://open.spotify.com/artist/..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Audiomack / Boomplay Link
                </label>
                <input
                  type="url"
                  value={audiomackLink}
                  onChange={(e) => setAudiomackLink(e.target.value)}
                  placeholder="https://audiomack.com/..."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={applyLoading}
              className="py-2.5 px-6 rounded-full font-bold text-xs bg-white hover:bg-neutral-100 text-neutral-900 transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {applyLoading ? 'Submitting...' : t('submitApplication')}
            </button>
          </form>
        )}
      </div>

      {/* 4. Static Mock-up Card for Artist Dashboard & MTN MoMo / Orange Money Tipping Preview (FR-36, SRS Section 1.3) */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1a2e20] to-[#121212] border border-[#536D56]/50 p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#536D56]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30 flex items-center justify-center text-lg">
              📊
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {t('artistDashboardPreview')}
              </h3>
              <p className="text-xs text-[#8FA993]">{t('artistDashboardNotice')}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-black/40 border border-[#536D56]/50 text-neutral-300 self-start sm:self-center">
            FR-36 · Roadmap v2
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              {t('totalStreams')}
            </span>
            <div className="text-xl font-black font-mono text-white">14,820</div>
            <span className="text-[10px] text-emerald-400 font-semibold">+24% this week</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              {t('creationsMade')}
            </span>
            <div className="text-xl font-black font-mono text-[#FACC15]">48</div>
            <span className="text-[10px] text-neutral-400 font-semibold">Across 3 regions</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              {t('totalVotesReceived')}
            </span>
            <div className="text-xl font-black font-mono text-[#F43F5E]">1,294</div>
            <span className="text-[10px] text-[#F43F5E] font-semibold">Top trending #1</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
              Est. Royalties
            </span>
            <div className="text-xl font-black font-mono text-emerald-400">74,100 FCFA</div>
            <span className="text-[10px] text-emerald-300 font-semibold">Direct MoMo Payout</span>
          </div>
        </div>

        {/* Interactive MTN MoMo & Orange Money Tipping Preview */}
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💛🧡</span>
              <h4 className="text-sm font-bold text-white">{t('tipArtist')}</h4>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Instant Mobile Transfer</span>
          </div>

          {/* Amount selector */}
          <div className="flex items-center gap-2">
            {[500, 1000, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setSelectedTipAmount(amt)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition font-mono cursor-pointer ${
                  selectedTipAmount === amt
                    ? 'bg-[#536D56] text-white ring-2 ring-[#8FA993]'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {amt.toLocaleString()} FCFA
              </button>
            ))}
          </div>

          {/* Mobile Money Provider Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* MTN Mobile Money */}
            <button
              type="button"
              onClick={() => handleMockTip('MTN')}
              className="py-3 px-4 rounded-2xl bg-[#FFCC00] hover:bg-[#e6b800] text-neutral-950 font-black text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-black text-[#FFCC00] flex items-center justify-center font-bold text-[10px]">
                M
              </span>
              <span>Tip via {t('tipMtn')}</span>
            </button>

            {/* Orange Money */}
            <button
              type="button"
              onClick={() => handleMockTip('Orange')}
              className="py-3 px-4 rounded-2xl bg-[#FF7900] hover:bg-[#e66d00] text-white font-black text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="w-5 h-5 rounded-full bg-white text-[#FF7900] flex items-center justify-center font-bold text-[10px]">
                O
              </span>
              <span>Tip via {t('tipOrange')}</span>
            </button>
          </div>

          {/* Simulated Toast */}
          {tipSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-fade-in flex items-center gap-2">
              <span>{tipSuccessMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

