import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

const CAMEROON_REGIONS = [
  'Southwest',
  'Littoral',
  'Centre',
  'Northwest',
  'West',
  'Far North',
  'North',
  'Adamawa',
  'East',
  'South',
  'Abroad',
]

const DEMO_PRESETS = [
  {
    name: 'Kumba Dancer',
    phone: '+237674445566',
    role: 'Fan / Creator',
    region: 'Southwest',
    badge: '💃 Creator',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    name: 'Petit Pays Jr',
    phone: '+237671112233',
    role: 'Verified Artist',
    region: 'Littoral',
    badge: '🎤 Artist',
    badgeColor: 'bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/30',
  },
  {
    name: 'Admin BeatToons',
    phone: '+237670000001',
    role: 'Administrator',
    region: 'Centre',
    badge: '👑 Admin',
    badgeColor: 'bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/30',
  },
]

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, login } = useAuth()
  const { t } = useLanguage()

  const [phone, setPhone] = useState('+237674445566')
  const [otp, setOtp] = useState('123456')
  const [displayName, setDisplayName] = useState('Kumba Dancer')
  const [region, setRegion] = useState('Southwest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isLoginModalOpen) return null

  const handlePresetSelect = (preset: (typeof DEMO_PRESETS)[0]) => {
    setPhone(preset.phone)
    setDisplayName(preset.name)
    setRegion(preset.region)
    setOtp('123456')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!phone.trim()) {
      setError('Please provide a valid phone number')
      return
    }
    if (!otp.trim()) {
      setError('Please enter the OTP verification code (123456)')
      return
    }

    setLoading(true)
    try {
      await login(phone, otp, displayName, region)
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate. Ensure OTP is 123456.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#121212] border border-[#536D56]/50 rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeLoginModal}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-[#536D56]/30 border border-[#536D56] flex items-center justify-center text-2xl shadow-inner">
            🇨🇲
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{t('loginModalTitle')}</h3>
            <p className="text-xs text-neutral-400">Mock Phone OTP Login (FR-1 – FR-4)</p>
          </div>
        </div>

        {/* Quick Demo Accounts */}
        <div className="mb-5 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3">
          <span className="text-[11px] font-semibold text-[#FACC15] uppercase tracking-wider block mb-2">
            ⚡ {t('quickDemoProfiles')}
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.phone}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                  phone === preset.phone
                    ? 'bg-[#536D56]/30 border-[#536D56] text-white'
                    : 'bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700/50 text-neutral-300'
                }`}
              >
                <div>
                  <div className="font-semibold text-white">{preset.name}</div>
                  <div className="text-[10px] text-neutral-400">{preset.phone} · {preset.region}</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}>
                  {preset.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              {t('phoneLabel')}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-semibold">
                🇨🇲
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237670000000"
                required
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t('displayNameLabel')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. MboaDancer"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                {t('regionLabel')}
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56] transition"
              >
                {CAMEROON_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-neutral-300">
                {t('otpLabel')}
              </label>
              <span className="text-[10px] text-[#FACC15] font-semibold">{t('otpHint')}</span>
            </div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-center tracking-[0.4em] font-mono text-base font-bold text-white focus:outline-none focus:border-[#536D56] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-full font-bold text-sm bg-white hover:bg-neutral-100 text-neutral-900 transition-all duration-150 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{t('confirmLogin')}</span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-neutral-500 text-center mt-4">
          BeatToons Cameroon · CIMFEST Hackathon 2026
        </p>
      </div>
    </div>
  )
}

