import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { adminAccessLogin, applyForArtist, loginWithPhone } from '../lib/api'
import { CAMEROON_REGIONS } from '../types'

const CAMEROON_LOCAL_PHONE_RE = /^[26]\d{8}$/
const ARTIST_GENRES = [
  'Afropop',
  'Makossa',
  'Bikutsi',
  'Hip Hop',
  'Afrobeats',
  'Gospel',
  'Other',
] as const

const PRESET_ARTIST_AVATARS = [
  { label: 'Mic Gold', url: '/assets/characters/mboa_boy_pose_a.svg' },
  { label: 'Queen Stage', url: '/assets/characters/tantie_pose_a.svg' },
  { label: 'Legend', url: '/assets/characters/pa_buea_pose_a.svg' },
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

function extractCameroonLocalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00237')) {
    digits = digits.slice(5)
  } else if (digits.startsWith('237') && digits.length > 9) {
    digits = digits.slice(3)
  }
  return digits.slice(0, 9)
}

function compressImageToSquareDataUrl(file: File, size = 192): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas not supported'))
          return
        }
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = () => reject(new Error('Invalid image file'))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

interface LoginModalContentProps {
  initialMode: 'signup' | 'signin'
  initialAccountType: 'fan_creator' | 'artist'
  loginReason: string | null
  onClose: () => void
}

const LoginModalContent: React.FC<LoginModalContentProps> = ({
  initialMode,
  initialAccountType,
  loginReason,
  onClose,
}) => {
  const { login, setAuthSession } = useAuth()
  const { t } = useLanguage()

  const [mode, setMode] = useState<'signup' | 'signin' | 'admin'>(initialMode)
  const [accountType, setAccountType] = useState<'fan_creator' | 'artist'>(initialAccountType)
  const [artistStep, setArtistStep] = useState<1 | 2>(1)

  // Shared / Fan fields
  const [localPhone, setLocalPhone] = useState(initialMode === 'signin' ? '674445566' : '')
  const [otp, setOtp] = useState('123456')
  const [displayName, setDisplayName] = useState('')
  const [region, setRegion] = useState<string>('Southwest')

  // Artist Step 1 fields
  const [artistName, setArtistName] = useState('')
  const [fullLegalName, setFullLegalName] = useState('')
  const [email, setEmail] = useState('')
  const [countryOfResidence, setCountryOfResidence] = useState('Cameroon')

  // Artist Step 2 fields
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [primaryGenre, setPrimaryGenre] = useState<string>('Afropop')
  const [bio, setBio] = useState('')
  const [socialPlatform, setSocialPlatform] = useState<'instagram' | 'tiktok' | 'youtube'>('instagram')
  const [socialLink, setSocialLink] = useState('')
  const [releaseLink, setReleaseLink] = useState('')

  // Team / Admin Login fields
  const [adminCode, setAdminCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [artistPendingCreated, setArtistPendingCreated] = useState<{
    artistName: string
    phone: string
  } | null>(null)

  const fullPhone = `+237${localPhone}`
  const isPhoneValid = CAMEROON_LOCAL_PHONE_RE.test(localPhone)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPhone(extractCameroonLocalDigits(e.target.value))
    if (error) setError(null)
  }

  const handleModeChange = (nextMode: 'signup' | 'signin' | 'admin') => {
    setMode(nextMode)
    setArtistStep(1)
    setError(null)
    if (nextMode === 'signin' && !localPhone) {
      setLocalPhone('674445566')
    }
  }

  const handlePresetSelect = (preset: (typeof DEMO_PRESETS)[0]) => {
    setMode('signin')
    setLocalPhone(extractCameroonLocalDigits(preset.phone))
    setDisplayName(preset.name)
    setRegion(preset.region)
    setOtp('123456')
    setError(null)
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressImageToSquareDataUrl(file, 192)
      setAvatarUrl(compressed)
      setError(null)
    } catch {
      setError('Could not process that image. Try a JPG or PNG file.')
    }
  }

  const handleArtistStep1Next = () => {
    setError(null)
    if (!isPhoneValid) {
      setError('Enter a valid 9-digit Cameroonian phone number starting with 6 or 2.')
      return
    }
    if (!artistName.trim()) {
      setError('Please enter your Stage / Artist Name.')
      return
    }
    if (!fullLegalName.trim()) {
      setError('Please enter your Full Legal Name for verification.')
      return
    }
    if (!email.trim() || !email.includes('@') || !email.split('@')[1]?.includes('.')) {
      setError('Please enter a valid email address.')
      return
    }
    if (!otp.trim()) {
      setError('Please enter the OTP verification code (123456).')
      return
    }
    setArtistStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'admin') {
      if (!isPhoneValid) {
        setError('Enter your valid 9-digit Cameroonian phone number.')
        return
      }
      if (!adminCode.trim()) {
        setError('Please enter the Team Admin Passcode.')
        return
      }
      setLoading(true)
      try {
        const res = await adminAccessLogin(fullPhone, adminCode)
        setAuthSession(res.user, res.access_token, res.artist_profile ?? null)
        onClose()
      } catch (err: any) {
        setError(err?.message || 'Admin verification failed.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!isPhoneValid) {
      setError(
        'Enter a valid 9-digit Cameroonian phone number starting with 6 or 2 (e.g. 670000001).'
      )
      return
    }
    if (!otp.trim()) {
      setError('Please enter the OTP verification code (123456).')
      return
    }

    if (mode === 'signin') {
      setLoading(true)
      try {
        await login(fullPhone, otp)
      } catch (err: any) {
        setError(err?.message || 'Failed to authenticate. Ensure OTP is 123456.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (accountType === 'fan_creator') {
      if (!displayName.trim()) {
        setError('Please enter a display name for your creator profile.')
        return
      }
      setLoading(true)
      try {
        await login(fullPhone, otp, displayName.trim(), region)
      } catch (err: any) {
        setError(err?.message || 'Failed to create account.')
      } finally {
        setLoading(false)
      }
      return
    }

    // Artist / Musician Step 1 -> Step 2 guard
    if (artistStep === 1) {
      handleArtistStep1Next()
      return
    }

    // Artist / Musician Step 2 final submission
    setLoading(true)
    try {
      const derivedRegion = countryOfResidence.trim().toLowerCase() === 'cameroon' ? 'Southwest' : 'Abroad'
      const authRes = await loginWithPhone(fullPhone, otp, artistName.trim(), derivedRegion)

      const social_links: Record<string, string> = {}
      if (socialLink.trim()) {
        social_links[socialPlatform] = socialLink.trim()
      }
      const release_links = releaseLink.trim() ? [releaseLink.trim()] : []

      try {
        const applyRes = await applyForArtist(
          {
            artist_name: artistName.trim(),
            full_legal_name: fullLegalName.trim(),
            email: email.trim(),
            country_of_residence: countryOfResidence.trim() || 'Cameroon',
            primary_genre: primaryGenre,
            bio: bio.trim() || undefined,
            avatar_url: avatarUrl || undefined,
            social_links,
            release_links,
          },
          authRes.access_token
        )
        const pendingProfile = applyRes.artist_profile || applyRes.profile
        setAuthSession(authRes.user, authRes.access_token, pendingProfile)
        setArtistPendingCreated({
          artistName: pendingProfile?.artist_name || artistName.trim(),
          phone: authRes.user.phone,
        })
      } catch (applyErr: any) {
        setAuthSession(authRes.user, authRes.access_token, authRes.artist_profile ?? null)
        setError(
          applyErr?.message ||
            'Account created, but artist verification failed. Please retry from your Account page.'
        )
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create artist account.')
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
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition cursor-pointer"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#536D56]/30 border border-[#536D56] flex items-center justify-center text-2xl shadow-inner">
            {mode === 'admin' ? '🛡️' : '🇨🇲'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {mode === 'admin' ? 'Team Admin Access' : t('loginModalTitle')}
            </h3>
            <p className="text-xs text-neutral-400">
              {mode === 'admin'
                ? 'Authorized BeatToons team members only'
                : 'Cameroon Phone Verification'}
            </p>
          </div>
        </div>

        {/* Artist Created Confirmation Screen */}
        {artistPendingCreated ? (
          <div className="py-5 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
            <div className="text-3xl">🎤</div>
            <h4 className="text-base font-black text-white">Application Submitted!</h4>
            <p className="text-xs text-neutral-200 leading-relaxed">
              Our team will verify your profile shortly. Your artist application for{' '}
              <strong className="text-emerald-300">{artistPendingCreated.artistName}</strong> (
              <span className="font-mono text-white">{artistPendingCreated.phone}</span>) is now in
              the review queue.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-5 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs transition cursor-pointer"
            >
              Done — Explore BeatToons
            </button>
          </div>
        ) : (
          <>
            {/* Context Reason Banner */}
            {loginReason && mode !== 'admin' && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-medium flex items-center gap-2">
                <span className="text-base shrink-0">✨</span>
                <span>{loginReason}</span>
              </div>
            )}

            {/* Create Account / Sign In / Team Admin Tab Toggle */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[#536D56] text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[#536D56] text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('admin')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  mode === 'admin'
                    ? 'bg-[#FACC15] text-neutral-950 shadow'
                    : 'text-neutral-400 hover:text-[#FACC15]'
                }`}
              >
                🛡️ Admin
              </button>
            </div>

            {/* 2-Option Account Type Selector (Create Account mode, Step 1) */}
            {mode === 'signup' && artistStep === 1 && (
              <div className="mb-4 space-y-1.5">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Choose Account Type
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('fan_creator')
                      setArtistStep(1)
                      setError(null)
                    }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      accountType === 'fan_creator'
                        ? 'bg-[#536D56]/25 border-[#536D56] ring-1 ring-[#536D56] text-white'
                        : 'bg-neutral-900/70 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-lg mb-1">💃</div>
                    <div className="text-xs font-bold text-white">Fan / Creator</div>
                    <div className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                      Watch, vote &amp; animate stories
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('artist')
                      setArtistStep(1)
                      setError(null)
                    }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      accountType === 'artist'
                        ? 'bg-[#F43F5E]/15 border-[#F43F5E]/70 ring-1 ring-[#F43F5E]/60 text-white'
                        : 'bg-neutral-900/70 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-lg mb-1">🎤</div>
                    <div className="text-xs font-bold text-white">Artist / Musician</div>
                    <div className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                      Upload songs &amp; launch challenges
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Artist 2-Step Progress Bar */}
            {mode === 'signup' && accountType === 'artist' && (
              <div className="mb-4 flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-900/80 border border-neutral-800 text-[11px]">
                <span className={artistStep === 1 ? 'font-bold text-white' : 'text-emerald-400 font-semibold'}>
                  {artistStep === 1 ? '1. Account Basics' : '✓ 1. Account Basics'}
                </span>
                <span className="text-neutral-600">→</span>
                <span className={artistStep === 2 ? 'font-bold text-[#F43F5E]' : 'text-neutral-400'}>
                  2. Artist Identity
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Phone Input (shown in Sign In, Fan Sign Up, Artist Step 1, Admin Login) */}
              {(mode !== 'signup' || accountType === 'fan_creator' || artistStep === 1) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      {t('phoneLabel')} *
                    </label>
                    {localPhone.length > 0 && (
                      <span
                        className={`text-[10px] font-semibold ${
                          isPhoneValid ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {isPhoneValid
                          ? '✓ Valid 237 number'
                          : `${localPhone.length}/9 digits (starts with 6 or 2)`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-stretch rounded-xl bg-neutral-900 border border-neutral-700 focus-within:border-[#536D56] transition overflow-hidden">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 bg-neutral-800/90 border-r border-neutral-700 text-xs font-mono font-bold text-neutral-200 select-none shrink-0"
                      title="Cameroon country code (+237)"
                    >
                      <span>🇨🇲</span>
                      <span>+237</span>
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={9}
                      value={localPhone}
                      onChange={handlePhoneChange}
                      placeholder="670000000"
                      required
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-mono tracking-wider text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Fan / Creator Fields */}
              {mode === 'signup' && accountType === 'fan_creator' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      {t('displayNameLabel')} *
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. MboaDancer"
                      required
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#536D56] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      {t('regionLabel')} *
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
              )}

              {/* Artist Step 1: Account Basics */}
              {mode === 'signup' && accountType === 'artist' && artistStep === 1 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Stage / Artist Name *
                      </label>
                      <input
                        type="text"
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        placeholder="e.g. Buea SoundBoy"
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F43F5E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Full Legal Name *
                      </label>
                      <input
                        type="text"
                        value={fullLegalName}
                        onChange={(e) => setFullLegalName(e.target.value)}
                        placeholder="For identity check"
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F43F5E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="artist@example.com"
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F43F5E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Country of Residence *
                      </label>
                      <input
                        type="text"
                        value={countryOfResidence}
                        onChange={(e) => setCountryOfResidence(e.target.value)}
                        placeholder="Cameroon"
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F43F5E]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Artist Step 2: Artist Identity */}
              {mode === 'signup' && accountType === 'artist' && artistStep === 2 && (
                <div className="space-y-3.5">
                  {/* Profile Picture Uploader + Presets */}
                  <div className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Profile Picture (optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Artist preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🎤</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="inline-block px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-white cursor-pointer transition">
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                          />
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_ARTIST_AVATARS.map((preset) => (
                            <button
                              key={preset.url}
                              type="button"
                              onClick={() => setAvatarUrl(preset.url)}
                              className={`px-2 py-0.5 rounded-full text-[10px] border transition cursor-pointer ${
                                avatarUrl === preset.url
                                  ? 'bg-[#F43F5E]/20 border-[#F43F5E] text-white'
                                  : 'bg-neutral-950 border-neutral-700 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Primary Music Genre *
                    </label>
                    <select
                      value={primaryGenre}
                      onChange={(e) => setPrimaryGenre(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#F43F5E]"
                    >
                      {ARTIST_GENRES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-neutral-300">
                        Short Biography (optional)
                      </label>
                      <span className="text-[10px] text-neutral-500 font-mono">{bio.length}/240</span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={240}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell fans about your sound & city..."
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F43F5E] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Social Link (optional)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={socialPlatform}
                        onChange={(e) =>
                          setSocialPlatform(e.target.value as 'instagram' | 'tiktok' | 'youtube')
                        }
                        className="bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#F43F5E]"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                      </select>
                      <input
                        type="url"
                        value={socialLink}
                        onChange={(e) => setSocialLink(e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F43F5E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Previous Release Link (optional)
                    </label>
                    <input
                      type="url"
                      value={releaseLink}
                      onChange={(e) => setReleaseLink(e.target.value)}
                      placeholder="https://audiomack.com/... or Spotify/YouTube"
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F43F5E]"
                    />
                  </div>
                </div>
              )}

              {/* OTP Input (Sign In, Fan Sign Up, Artist Step 1) */}
              {mode !== 'admin' && (mode !== 'signup' || accountType === 'fan_creator' || artistStep === 1) && (
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
              )}

              {/* Team Admin Passcode Input */}
              {mode === 'admin' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Team Admin Passcode *
                  </label>
                  <input
                    type="password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Enter team passcode"
                    required
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
              )}

              {/* Submit / Step Navigation Buttons */}
              {mode === 'signup' && accountType === 'artist' && artistStep === 1 ? (
                <button
                  type="button"
                  onClick={handleArtistStep1Next}
                  className="w-full mt-2 py-3 px-4 rounded-full font-bold text-sm bg-white hover:bg-neutral-100 text-neutral-900 transition-all shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  Next: Artist Identity →
                </button>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  {mode === 'signup' && accountType === 'artist' && artistStep === 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setArtistStep(1)
                        setError(null)
                      }}
                      className="py-3 px-4 rounded-full font-semibold text-xs border border-neutral-700 hover:bg-neutral-800 text-neutral-200 transition cursor-pointer"
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-full font-bold text-sm bg-white hover:bg-neutral-100 text-neutral-900 transition-all duration-150 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                        <span>
                          {mode === 'signup' && accountType === 'artist'
                            ? 'Submitting Application...'
                            : 'Authenticating...'}
                        </span>
                      </>
                    ) : (
                      <span>
                        {mode === 'admin'
                          ? 'Unlock Admin Dashboard'
                          : mode === 'signup'
                          ? accountType === 'artist'
                            ? 'Submit Artist Application'
                            : 'Create Fan / Creator Account'
                          : t('confirmLogin')}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </form>

            {/* Quick Demo Accounts (Sign In tab only) */}
            {mode === 'signin' && (
              <div className="mt-5 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3">
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
                        fullPhone === preset.phone
                          ? 'bg-[#536D56]/30 border-[#536D56] text-white'
                          : 'bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700/50 text-neutral-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white">{preset.name}</div>
                        <div className="text-[10px] text-neutral-400">
                          {preset.phone} · {preset.region}
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${preset.badgeColor}`}>
                        {preset.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Discreet Team / Admin Login Footer Link */}
        <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
          <span>BeatToons Cameroon</span>
          {mode === 'admin' ? (
            <button
              type="button"
              onClick={() => handleModeChange('signin')}
              className="text-neutral-400 hover:text-white underline underline-offset-2 cursor-pointer"
            >
              ← Back to User Login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleModeChange('admin')}
              className="text-neutral-500 hover:text-[#FACC15] transition cursor-pointer"
            >
              Team / Admin Login
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const LoginModal: React.FC = () => {
  const {
    isLoginModalOpen,
    initialLoginMode,
    initialAccountType,
    loginReason,
    closeLoginModal,
  } = useAuth()

  if (!isLoginModalOpen) return null

  return (
    <LoginModalContent
      key={`${initialLoginMode}-${initialAccountType}-${loginReason || 'default'}`}
      initialMode={initialLoginMode}
      initialAccountType={initialAccountType}
      loginReason={loginReason}
      onClose={closeLoginModal}
    />
  )
}
