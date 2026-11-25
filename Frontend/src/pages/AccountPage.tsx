import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { useLanguage } from '../context/LanguageContext'
import {
  applyForArtist,
  demoQuickApproveArtist,
  fetchAdminQueues,
  fetchMyProfile,
  fetchMySongs,
  reviewArtistApplication,
  uploadSong,
} from '../lib/api'
import {
  CAMEROON_REGIONS,
  type AdminPendingArtist,
  type AdminReport,
  type Creation,
  type ProfileBadge,
  type Song,
  type UserProfileStats,
} from '../types'

interface AccountPageProps {
  onNavigateTab?: (tab: string) => void
}

const SONG_GENRES = ['Makossa', 'Bikutsi', 'Afropop', 'Hip Hop'] as const
const SONG_LANGUAGES = ['Pidgin', 'English', 'French', 'Duala', 'Ewondo', 'Bassa', 'Fulfulde'] as const

const AUDIO_CLIP_PRESETS = [
  {
    label: 'Douala Makossa Groove (Preset 1)',
    url: '/assets/audio/song1.mp3',
    duration: 22,
    bpm: 115,
  },
  {
    label: 'Yaoundé Bikutsi Energy (Preset 2)',
    url: '/assets/audio/song2.mp3',
    duration: 20,
    bpm: 128,
  },
  {
    label: 'Kocee — We Di Go Na Go (Preset 3)',
    url: '/assets/audio/kocee_we_di_go_na_go.mp3',
    duration: 24,
    bpm: 118,
  },
]

function getLocalUserCreations(userId: string): Creation[] {
  try {
    const raw = localStorage.getItem('beattoons_local_creations')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c) => c?.creator_id === userId)
  } catch {
    return []
  }
}

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigateTab }) => {
  const {
    user,
    artistProfile,
    token,
    isGuest,
    openLoginModal,
    logout,
    refreshMe,
    updateProfile,
    setArtistProfile,
  } = useAuth()
  const { currentSong, isPlaying, playSong, togglePlay } = useAudio()
  const { t } = useLanguage()

  const [refreshingProfile, setRefreshingProfile] = useState(false)

  // Inline Edit Profile state (PATCH /auth/me)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editRegion, setEditRegion] = useState<string>('Southwest')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)

  // Creator Profile Summary state (GET /users/me/profile)
  const [myCreations, setMyCreations] = useState<Creation[]>([])
  const [profileStats, setProfileStats] = useState<UserProfileStats>({
    creations_count: 0,
    votes_received: 0,
    votes_cast: 0,
  })
  const [profileBadges, setProfileBadges] = useState<ProfileBadge[]>([])
  const [profileLoading, setProfileLoading] = useState(false)

  // Collapsible Artist Upgrade section for fan_creator users
  const [showArtistApplyForm, setShowArtistApplyForm] = useState(false)

  // Artist Application Form state
  const [artistName, setArtistName] = useState('')
  const [socialPlatform, setSocialPlatform] = useState<'instagram' | 'tiktok' | 'youtube'>('instagram')
  const [socialLink, setSocialLink] = useState('')
  const [releaseLink, setReleaseLink] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [applyNotice, setApplyNotice] = useState<string | null>(null)

  // Demo Quick-Approve state (for pending artists)
  const [quickApproveLoading, setQuickApproveLoading] = useState(false)
  const [quickApproveError, setQuickApproveError] = useState<string | null>(null)

  // Verified Artist: Upload Song Clip form state
  const [songTitle, setSongTitle] = useState('')
  const [songGenre, setSongGenre] = useState<string>('Makossa')
  const [songLanguage, setSongLanguage] = useState<string>('Pidgin')
  const [songDuration, setSongDuration] = useState<number>(22)
  const [songBpm, setSongBpm] = useState<number>(115)
  const [clipMode, setClipMode] = useState<'preset' | 'custom'>('preset')
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string>(AUDIO_CLIP_PRESETS[0].url)
  const [customClipUrl, setCustomClipUrl] = useState<string>('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  // Artist's uploaded songs list
  const [mySongs, setMySongs] = useState<Song[]>([])
  const [songsLoading, setSongsLoading] = useState(false)

  // Admin Verification Queue state
  const [pendingArtists, setPendingArtists] = useState<AdminPendingArtist[]>([])
  const [openReports, setOpenReports] = useState<AdminReport[]>([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null)
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null)

  // MTN / Orange Money Tipping Mockup state
  const [selectedTipAmount, setSelectedTipAmount] = useState<number>(1000)
  const [tipSuccessMessage, setTipSuccessMessage] = useState<string | null>(null)

  const isVerifiedArtist =
    user?.role === 'artist' && artistProfile?.verification_status === 'approved'
  const isPendingArtist = artistProfile?.verification_status === 'pending' && user?.role !== 'artist'
  const isRejectedArtist = artistProfile?.verification_status === 'rejected' && user?.role !== 'artist'
  const isAdmin = user?.role === 'admin'

  const roleLabel =
    user?.role === 'artist'
      ? 'Verified Artist'
      : user?.role === 'admin'
      ? 'Admin'
      : user
      ? 'Fan / Creator'
      : 'Guest Explorer'

  // Refresh live user & artist_profile via GET /auth/me on mount
  useEffect(() => {
    if (!token) return
    let mounted = true
    setRefreshingProfile(true)
    refreshMe().finally(() => {
      if (mounted) setRefreshingProfile(false)
    })
    return () => {
      mounted = false
    }
  }, [token, refreshMe])

  // Load Creator Profile Summary via GET /users/me/profile
  const loadCreatorProfile = useCallback(async () => {
    if (!token || !user) {
      setMyCreations([])
      setProfileStats({ creations_count: 0, votes_received: 0, votes_cast: 0 })
      setProfileBadges([])
      return
    }
    setProfileLoading(true)
    try {
      const data = await fetchMyProfile(token)
      const localMatches = getLocalUserCreations(user.id)
      const serverIds = new Set((data.creations || []).map((c) => c.id))
      const mergedCreations = [
        ...(data.creations || []),
        ...localMatches.filter((lc) => !serverIds.has(lc.id)),
      ]
      setMyCreations(mergedCreations)
      setProfileStats({
        creations_count: Math.max(data.stats?.creations_count || 0, mergedCreations.length),
        votes_received: data.stats?.votes_received || 0,
        votes_cast: data.stats?.votes_cast || 0,
      })

      const badges = [...(data.badges || [])]
      if (mergedCreations.length >= 1 && !badges.some((b) => b.id === 'first_creation')) {
        badges.unshift({
          id: 'first_creation',
          name: 'First Creation',
          icon: '🎬',
          description: 'Published your first animated story to a challenge',
        })
      }
      setProfileBadges(badges)
    } catch {
      const localMatches = getLocalUserCreations(user.id)
      setMyCreations(localMatches)
      setProfileStats({
        creations_count: localMatches.length,
        votes_received: 0,
        votes_cast: 0,
      })
      setProfileBadges([])
    } finally {
      setProfileLoading(false)
    }
  }, [token, user])

  useEffect(() => {
    void loadCreatorProfile()
  }, [loadCreatorProfile])

  // Load uploaded songs when user is an approved artist
  const loadMySongs = useCallback(async () => {
    if (!token || !isVerifiedArtist) {
      setMySongs([])
      return
    }
    setSongsLoading(true)
    try {
      const songs = await fetchMySongs(token)
      setMySongs(songs)
    } catch {
      setMySongs([])
    } finally {
      setSongsLoading(false)
    }
  }, [token, isVerifiedArtist])

  useEffect(() => {
    void loadMySongs()
  }, [loadMySongs])

  // Load Admin verification & report queues when user is admin
  const loadAdminQueue = useCallback(async () => {
    if (!token || !isAdmin) {
      setPendingArtists([])
      setOpenReports([])
      return
    }
    setQueueLoading(true)
    setQueueError(null)
    try {
      const data = await fetchAdminQueues(token)
      setPendingArtists(data.pending_artists || [])
      setOpenReports(data.open_reports || [])
    } catch (err: any) {
      setQueueError(err?.message || 'Failed to load admin verification queue')
    } finally {
      setQueueLoading(false)
    }
  }, [token, isAdmin])

  useEffect(() => {
    void loadAdminQueue()
  }, [loadAdminQueue])

  const handleOpenEditProfile = () => {
    if (!user) return
    setEditDisplayName(user.display_name)
    setEditRegion(user.region || 'Southwest')
    setEditError(null)
    setEditSuccess(null)
    setIsEditingProfile(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDisplayName.trim()) {
      setEditError('Display name cannot be empty.')
      return
    }
    setEditSaving(true)
    setEditError(null)
    setEditSuccess(null)
    try {
      await updateProfile({
        display_name: editDisplayName.trim(),
        region: editRegion,
      })
      setIsEditingProfile(false)
      setEditSuccess('Profile updated!')
      void loadCreatorProfile()
      setTimeout(() => setEditSuccess(null), 3000)
    } catch (err: any) {
      setEditError(err?.message || 'Failed to save profile changes.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !user) {
      openLoginModal('Sign in or create a free account to apply as an artist')
      return
    }

    if (!artistName.trim()) {
      setApplyError('Please enter your stage / artist name.')
      return
    }

    setApplyLoading(true)
    setApplyError(null)
    setApplyNotice(null)

    try {
      const social_links: Record<string, string> = {}
      if (socialLink.trim()) {
        social_links[socialPlatform] = socialLink.trim()
      }

      const release_links: string[] = releaseLink.trim() ? [releaseLink.trim()] : []

      const res = await applyForArtist(
        {
          artist_name: artistName.trim(),
          social_links,
          release_links,
        },
        token
      )

      const updatedProfile = res.artist_profile || res.profile
      if (updatedProfile) {
        setArtistProfile(updatedProfile)
      }
      await refreshMe()
      setApplyNotice('Application submitted! Your profile is now under review.')
    } catch (err: any) {
      setApplyError(err?.message || 'Failed to submit artist application.')
    } finally {
      setApplyLoading(false)
    }
  }

  const handleDemoQuickApprove = async () => {
    if (!user || !token) return
    setQuickApproveLoading(true)
    setQuickApproveError(null)
    try {
      await demoQuickApproveArtist(user.id)
      await refreshMe()
      void loadCreatorProfile()
    } catch (err: any) {
      setQuickApproveError(
        err?.message || 'Quick-approve failed. Log in as Admin (+237670000001) to approve manually.'
      )
    } finally {
      setQuickApproveLoading(false)
    }
  }

  const handlePresetSelect = (url: string) => {
    setSelectedPresetUrl(url)
    const preset = AUDIO_CLIP_PRESETS.find((p) => p.url === url)
    if (preset) {
      setSongDuration(preset.duration)
      setSongBpm(preset.bpm)
    }
  }

  const handleSongUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !user) {
      openLoginModal('Sign in to upload a song clip')
      return
    }

    const activeClipUrl = clipMode === 'preset' ? selectedPresetUrl : customClipUrl.trim()
    if (!songTitle.trim()) {
      setUploadError('Please enter a song title.')
      return
    }
    if (!activeClipUrl) {
      setUploadError('Please select a preset audio clip or provide a clip URL.')
      return
    }
    if (songDuration < 15 || songDuration > 30) {
      setUploadError('Clip duration must be between 15 and 30 seconds.')
      return
    }

    setUploadLoading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const createdSong = await uploadSong(
        {
          title: songTitle.trim(),
          genre: songGenre,
          language: songLanguage,
          clip_url: activeClipUrl,
          duration_sec: Number(songDuration),
          bpm: Number(songBpm) || 115,
        },
        token
      )

      setMySongs((prev) => [createdSong, ...prev])
      setSongTitle('')
      setUploadSuccess(
        `"${createdSong.title}" uploaded to the Fresh Pool! Fans can discover it before it moves to Trending.`
      )
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload song clip.')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleAdminReview = async (targetUserId: string, decision: 'approved' | 'rejected', name: string) => {
    if (!token) return
    setReviewingUserId(targetUserId)
    setAdminFeedback(null)
    setQueueError(null)
    try {
      await reviewArtistApplication(targetUserId, decision, token)
      setPendingArtists((prev) => prev.filter((item) => item.user_id !== targetUserId))
      setAdminFeedback(
        decision === 'approved'
          ? `Approved "${name}" — user upgraded to Verified Artist.`
          : `Rejected application for "${name}".`
      )
    } catch (err: any) {
      setQueueError(err?.message || `Failed to ${decision} application.`)
    } finally {
      setReviewingUserId(null)
    }
  }

  const handleToggleSongPreview = (song: Song) => {
    if (currentSong?.id === song.id) {
      togglePlay()
    } else {
      playSong(song)
    }
  }

  const handlePlayCreationAudio = (creation: Creation) => {
    const songTitleText = creation.song?.title || 'Cameroon Track'
    const clipUrl = creation.song?.clip_url || '/assets/audio/kocee_we_di_go_na_go.mp3'
    const start = creation.moves_timeline?.[0]?.start ?? 0
    const syntheticSong: Song = {
      id: creation.song?.id || creation.id,
      artist_id: creation.creator_id,
      title: songTitleText,
      genre: creation.song?.genre || 'Afropop',
      language: 'Cameroon',
      clip_url: clipUrl,
      duration_sec: 24,
      bpm: creation.song?.bpm || 115,
      status: 'trending',
      trending_score: 0,
    }
    if (currentSong?.id === syntheticSong.id) {
      togglePlay()
    } else {
      playSong(syntheticSong, start)
    }
  }

  const handleMockTip = (provider: 'MTN' | 'Orange') => {
    const formatted = selectedTipAmount.toLocaleString()
    setTipSuccessMessage(
      `Simulated ${provider} Money Tip of ${formatted} FCFA sent to ${
        artistProfile?.artist_name || user?.display_name || 'Petit Pays Jr'
      }!`
    )
    setTimeout(() => {
      setTipSuccessMessage(null)
    }, 4000)
  }

  const activeClipUrlForPreview = clipMode === 'preset' ? selectedPresetUrl : customClipUrl.trim()

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
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user ? user.display_name : 'Guest User'}
                </h2>
                {isVerifiedArtist && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-sm"
                    title="Verified Cameroonian Artist"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Verified Cameroonian Artist ✓</span>
                  </span>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/40 text-xs font-bold">
                    👑 Admin
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                <span>{user ? user.phone : 'Not signed in'}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#536D56]/20 border border-[#536D56]/40 text-[#8FA993] font-semibold">
                  {user ? `${user.region} Region 🇨🇲` : 'Browsing Cameroon Charts'}
                </span>
                {refreshingProfile && (
                  <span className="text-[11px] text-neutral-500 italic">· syncing...</span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#536D56]/50 bg-[#536D56]/20 text-neutral-200 uppercase tracking-wider">
                  {roleLabel}
                </span>
                {artistProfile && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      artistProfile.verification_status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : artistProfile.verification_status === 'pending'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-[#F43F5E]/15 text-[#F43F5E] border-[#F43F5E]/40'
                    }`}
                  >
                    Artist Status: {artistProfile.verification_status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isGuest ? (
              <button
                onClick={() => openLoginModal('Create a free Fan / Creator account or sign in')}
                className="py-2.5 px-6 rounded-full font-bold text-xs bg-white hover:bg-neutral-100 text-neutral-900 transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Create Account / Sign In</span>
                <span className="text-[#F43F5E]">✦</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="py-2.5 px-4 rounded-full font-semibold text-xs border border-[#536D56]/50 hover:bg-[#536D56]/20 text-[#8FA993] transition active:scale-95 cursor-pointer"
                >
                  ✎ Edit Profile
                </button>
                <button
                  onClick={logout}
                  className="py-2.5 px-5 rounded-full font-semibold text-xs border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition active:scale-95 cursor-pointer"
                >
                  {t('logoutButton')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Edit Profile Drawer */}
        {!isGuest && isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-5 pt-5 border-t border-neutral-800 space-y-3 relative z-10"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#FACC15]">
                Update Display Name & Region
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  required
                  maxLength={60}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#536D56]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Region *
                </label>
                <select
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#536D56]"
                >
                  {CAMEROON_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={editSaving}
                className="py-2 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {editSuccess && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            ✓ {editSuccess}
          </div>
        )}

        {/* Guest prompt notice */}
        {isGuest && (
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <span>{t('guestWarning')}</span>
            </div>
            <button
              type="button"
              onClick={() => openLoginModal('Create a free Fan / Creator account or sign in')}
              className="shrink-0 px-3 py-1.5 rounded-full bg-amber-400 text-neutral-950 font-bold text-[11px] hover:bg-amber-300 transition cursor-pointer"
            >
              Sign Up / In
            </button>
          </div>
        )}
      </div>

      {/* 2. Listener / Creator Stats, Badges & My Animations (Authenticated Users) */}
      {!isGuest && (
        <section className="space-y-6">
          {/* 3-Stat Summary Bar + Badges */}
          <div className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 shadow-2xl space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-center space-y-1">
                <div className="text-2xl font-black font-mono text-white">
                  {profileStats.creations_count}
                </div>
                <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Animations
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-center space-y-1">
                <div className="text-2xl font-black font-mono text-[#FACC15]">
                  {profileStats.votes_received}
                </div>
                <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Votes Earned
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-center space-y-1">
                <div className="text-2xl font-black font-mono text-[#F43F5E]">
                  {profileStats.votes_cast}
                </div>
                <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Votes Cast
                </div>
              </div>
            </div>

            {/* Earned Badges */}
            <div className="pt-2 border-t border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Earned Badges
                </h3>
                <span className="text-[11px] text-neutral-500">
                  {profileBadges.length} unlocked
                </span>
              </div>

              {profileBadges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profileBadges.map((badge) => (
                    <div
                      key={badge.id}
                      title={badge.description}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#536D56]/20 border border-[#536D56]/50 text-xs text-white font-semibold"
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">
                  Publish an animation in Studio or vote in Challenges to unlock{' '}
                  <span className="text-neutral-200">🎬 First Creation</span>,{' '}
                  <span className="text-neutral-200">💛 Super Fan</span>, and{' '}
                  <span className="text-neutral-200">🔥 Crowd Favorite</span> badges!
                </p>
              )}
            </div>
          </div>

          {/* My Animations List */}
          <div className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">My Animations</h3>
                <p className="text-xs text-neutral-400">
                  Animated stories & dances you submitted to Cameroon challenges
                </p>
              </div>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('studio')}
                  className="py-1.5 px-4 rounded-full bg-[#536D56] hover:bg-[#536D56]/80 text-white text-xs font-bold transition cursor-pointer"
                >
                  + Open Studio
                </button>
              )}
            </div>

            {profileLoading ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                Loading your animations...
              </div>
            ) : myCreations.length === 0 ? (
              <div className="py-8 px-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-center space-y-3">
                <div className="text-3xl">🎬</div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No Animations Yet</h4>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto">
                    Pick a trending Cameroonian track, choose your characters, and publish your
                    first animated story in under a minute!
                  </p>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('studio')}
                    className="py-2.5 px-6 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs transition shadow-md active:scale-95 cursor-pointer"
                  >
                    Create Your First Animation →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {myCreations.map((creation) => {
                  const songTitleText = creation.song?.title || 'Cameroon Challenge Track'
                  const charLabel = creation.character_id || creation.character || 'tantie'
                  return (
                    <div
                      key={creation.id}
                      className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handlePlayCreationAudio(creation)}
                          className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#536D56] to-neutral-800 border border-[#536D56]/60 flex items-center justify-center text-lg text-white shrink-0 cursor-pointer hover:scale-105 transition"
                          title="Play song clip"
                        >
                          🕺
                        </button>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {creation.caption || 'BeatToons Story Creation'}
                          </h4>
                          <p className="text-xs text-neutral-400 truncate">
                            Track: <span className="text-neutral-200">{songTitleText}</span> ·
                            Character: <span className="text-neutral-200 capitalize">{charLabel.replace('_', ' ')}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                        <div>
                          <span className="text-white font-bold">{creation.views ?? 0}</span>{' '}
                          <span className="text-neutral-500">views</span>
                        </div>
                        <div>
                          <span className="text-[#FACC15] font-bold">
                            {creation.vote_count ?? 0}
                          </span>{' '}
                          <span className="text-neutral-500">votes</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Admin Verification Queue — Shown when logged in as Admin */}
      {isAdmin && (
        <section className="rounded-3xl bg-gradient-to-br from-[#1b1a12] to-[#121212] border border-[#FACC15]/40 p-6 sm:p-7 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FACC15]/20 border border-[#FACC15]/40 flex items-center justify-center text-lg">
                🛡️
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Admin Verification Queue
                </h3>
                <p className="text-xs text-neutral-400">
                  Review Cameroonian artist applications & monitor open reports
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30">
                {pendingArtists.length} Pending Artists
              </span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-700">
                {openReports.length} Open Reports
              </span>
              <button
                type="button"
                onClick={() => void loadAdminQueue()}
                disabled={queueLoading}
                className="px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
              >
                {queueLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {adminFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              {adminFeedback}
            </div>
          )}

          {queueError && (
            <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
              {queueError}
            </div>
          )}

          {queueLoading && pendingArtists.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Loading pending artist applications...
            </div>
          ) : pendingArtists.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-1">
              <div className="text-2xl">✅</div>
              <p className="text-sm font-bold text-white">No Pending Artist Applications</p>
              <p className="text-xs text-neutral-400">
                All artist verification requests have been reviewed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingArtists.map((applicant) => {
                const socialEntries = Object.entries(applicant.social_links || {})
                const releaseList = applicant.release_links || []
                const isBusy = reviewingUserId === applicant.user_id

                return (
                  <div
                    key={applicant.user_id}
                    className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-white">{applicant.artist_name}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase">
                          Pending
                        </span>
                      </div>

                      <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
                        <span>Account: {applicant.user?.display_name || 'User'}</span>
                        <span>·</span>
                        <span>{applicant.user?.phone || applicant.user_id}</span>
                        {applicant.user?.region && (
                          <>
                            <span>·</span>
                            <span className="text-[#8FA993]">{applicant.user.region} 🇨🇲</span>
                          </>
                        )}
                      </div>

                      {(socialEntries.length > 0 || releaseList.length > 0) && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {socialEntries.map(([platform, url]) => (
                            <a
                              key={platform}
                              href={String(url)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 border border-neutral-700 transition"
                            >
                              <span className="capitalize text-[#8FA993] font-semibold">{platform}:</span>
                              <span className="truncate max-w-[200px]">{String(url)}</span>
                            </a>
                          ))}
                          {releaseList.map((url, idx) => (
                            <a
                              key={`${url}-${idx}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-200 border border-neutral-700 transition"
                            >
                              <span className="text-[#FACC15] font-semibold">Release:</span>
                              <span className="truncate max-w-[200px]">{url}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleAdminReview(applicant.user_id, 'approved', applicant.artist_name)
                        }
                        className="py-2 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isBusy ? 'Saving...' : '✓ Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleAdminReview(applicant.user_id, 'rejected', applicant.artist_name)
                        }
                        className="py-2 px-4 rounded-full bg-[#F43F5E]/20 hover:bg-[#F43F5E]/30 text-[#F43F5E] border border-[#F43F5E]/40 font-bold text-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* 4. Artist Lifecycle Card (Secondary / Collapsible for Fan/Creators) */}
      {!isAdmin && (
        <>
          {/* Verified Artist -> Upload Song Clip + Uploaded Songs List */}
          {isVerifiedArtist && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-[#121212] border border-emerald-500/40 p-6 sm:p-7 shadow-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl">
                      🎤
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-white tracking-tight">
                          Upload New Song Clip
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
                          ✓ Verified Cameroonian Artist
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Verified as <span className="text-white font-semibold">{artistProfile?.artist_name}</span> · New uploads enter the Fresh Pool (15–30s clip)
                      </p>
                    </div>
                  </div>
                </div>

                {uploadSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
                    <span>🎵</span>
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {uploadError && (
                  <div className="p-3.5 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
                    {uploadError}
                  </div>
                )}

                <form onSubmit={handleSongUpload} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Song Title *
                      </label>
                      <input
                        type="text"
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        placeholder="e.g. Buea Mountain Bounce"
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Genre *
                      </label>
                      <select
                        value={songGenre}
                        onChange={(e) => setSongGenre(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        {SONG_GENRES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Language *
                      </label>
                      <select
                        value={songLanguage}
                        onChange={(e) => setSongLanguage(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        {SONG_LANGUAGES.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-neutral-300">
                          Clip Duration (15–30s) *
                        </label>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          {songDuration}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={30}
                        value={songDuration}
                        onChange={(e) => setSongDuration(Number(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1">
                        <span>15s min</span>
                        <span>30s max</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Tempo (BPM) *
                      </label>
                      <input
                        type="number"
                        min={40}
                        max={240}
                        value={songBpm}
                        onChange={(e) => setSongBpm(Number(e.target.value))}
                        required
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-neutral-200">
                        Audio Clip Source *
                      </label>
                      <div className="inline-flex rounded-full bg-neutral-800 p-0.5 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setClipMode('preset')}
                          className={`px-3 py-1 rounded-full transition cursor-pointer ${
                            clipMode === 'preset' ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-300'
                          }`}
                        >
                          Demo Presets
                        </button>
                        <button
                          type="button"
                          onClick={() => setClipMode('custom')}
                          className={`px-3 py-1 rounded-full transition cursor-pointer ${
                            clipMode === 'custom' ? 'bg-emerald-500 text-neutral-950' : 'text-neutral-300'
                          }`}
                        >
                          Custom URL
                        </button>
                      </div>
                    </div>

                    {clipMode === 'preset' ? (
                      <select
                        value={selectedPresetUrl}
                        onChange={(e) => handlePresetSelect(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {AUDIO_CLIP_PRESETS.map((preset) => (
                          <option key={preset.url} value={preset.url}>
                            {preset.label} ({preset.duration}s · {preset.bpm} BPM)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="url"
                        value={customClipUrl}
                        onChange={(e) => setCustomClipUrl(e.target.value)}
                        placeholder="https://.../my-15s-clip.mp3"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    )}

                    {activeClipUrlForPreview && (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
                        <span className="truncate font-mono">{activeClipUrlForPreview}</span>
                        <audio controls src={activeClipUrlForPreview} className="h-8 max-w-[220px]" />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={uploadLoading}
                    className="py-2.5 px-6 rounded-full font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {uploadLoading ? 'Uploading to Fresh Pool...' : 'Upload Song Clip to Fresh Pool'}
                  </button>
                </form>
              </div>

              {/* Artist's Uploaded Songs List (Fresh vs Trending) */}
              <div className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 sm:p-7 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">My Uploaded Songs</h3>
                    <p className="text-xs text-neutral-400">
                      Track whether your clips are in the Fresh Pool or Trending Charts
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#8FA993] bg-[#536D56]/20 px-2.5 py-1 rounded-full border border-[#536D56]/40">
                    {mySongs.length} {mySongs.length === 1 ? 'Song' : 'Songs'}
                  </span>
                </div>

                {songsLoading ? (
                  <div className="py-6 text-center text-xs text-neutral-400">Loading your songs...</div>
                ) : mySongs.length === 0 ? (
                  <div className="py-6 px-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-1">
                    <p className="text-sm font-bold text-white">No Songs Uploaded Yet</p>
                    <p className="text-xs text-neutral-400">
                      Use the form above to upload your first 15–30 second song clip into the Fresh Pool!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mySongs.map((song) => {
                      const isThisPlaying = currentSong?.id === song.id && isPlaying
                      return (
                        <div
                          key={song.id}
                          className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSongPreview(song)}
                              className="w-10 h-10 rounded-xl bg-[#536D56]/30 hover:bg-[#536D56]/50 border border-[#536D56] flex items-center justify-center text-white transition cursor-pointer shrink-0"
                              title={isThisPlaying ? 'Pause clip' : 'Play clip'}
                            >
                              {isThisPlaying ? '❚❚' : '▶'}
                            </button>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-white truncate">{song.title}</h4>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    song.status === 'trending'
                                      ? 'bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/40'
                                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                  }`}
                                >
                                  {song.status === 'trending' ? '🔥 Trending' : '🌱 Fresh Pool'}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {song.genre} · {song.language} · {song.duration_sec}s · {song.bpm} BPM
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                            <span className="text-neutral-400">
                              Score: <strong className="text-white">{song.trending_score ?? 0}</strong>
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Pending Review */}
          {isPendingArtist && (
            <section className="rounded-3xl bg-[#121212] border border-amber-500/40 p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                    ⏳
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Application Under Review
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Your Cameroonian Artist verification request is awaiting admin approval
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                  Status: Pending
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">
                    Submitted Stage / Artist Name
                  </span>
                  <div className="text-lg font-black text-white mt-0.5">
                    {artistProfile?.artist_name}
                  </div>
                </div>

                {quickApproveError && (
                  <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
                    {quickApproveError}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={quickApproveLoading}
                    onClick={() => void handleDemoQuickApprove()}
                    className="py-2.5 px-5 rounded-full font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {quickApproveLoading ? 'Approving via Admin...' : '⚡ Demo Quick-Approve (Admin)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshMe()}
                    className="py-2.5 px-4 rounded-full font-semibold text-xs border border-neutral-700 hover:bg-neutral-800 text-neutral-200 transition cursor-pointer"
                  >
                    Check Approval Status
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Tip: Click <strong>Demo Quick-Approve (Admin)</strong> to run the real admin review
                  endpoint for live demos, or sign in with the Admin profile (<code>+237670000001</code>)
                  to approve from the Admin Verification Queue.
                </p>
              </div>
            </section>
          )}

          {/* Secondary / Collapsible Artist Application Section for Fan/Creators */}
          {!isVerifiedArtist && !isPendingArtist && (
            <section className="rounded-3xl bg-[#121212] border border-[#536D56]/30 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#536D56]/25 border border-[#536D56]/60 flex items-center justify-center text-lg shrink-0">
                    🎤
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Are you a Cameroonian Artist?
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Apply for the Verified Badge to upload 15–30s clips & host challenges.
                    </p>
                  </div>
                </div>

                {!isRejectedArtist && (
                  <button
                    type="button"
                    onClick={() => setShowArtistApplyForm((prev) => !prev)}
                    className="self-start sm:self-center py-2 px-4 rounded-full text-xs font-bold border border-[#536D56]/60 bg-[#536D56]/15 hover:bg-[#536D56]/30 text-[#8FA993] hover:text-white transition cursor-pointer shrink-0"
                  >
                    {showArtistApplyForm ? 'Hide Application' : 'Apply for Verified Badge'}
                  </button>
                )}
              </div>

              {(showArtistApplyForm || isRejectedArtist) && (
                <div className="pt-4 border-t border-neutral-800 space-y-4">
                  {isRejectedArtist && (
                    <div className="p-3.5 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
                      Your previous artist application for{' '}
                      <strong>{artistProfile?.artist_name}</strong> was not approved. Update your
                      links below and re-submit for review.
                    </div>
                  )}

                  {applyNotice && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                      {applyNotice}
                    </div>
                  )}

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
                          Social Link (Instagram / TikTok / YouTube)
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={socialPlatform}
                            onChange={(e) =>
                              setSocialPlatform(e.target.value as 'instagram' | 'tiktok' | 'youtube')
                            }
                            className="bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                          >
                            <option value="instagram">Instagram</option>
                            <option value="tiktok">TikTok</option>
                            <option value="youtube">YouTube</option>
                          </select>
                          <input
                            type="url"
                            value={socialLink}
                            onChange={(e) => setSocialLink(e.target.value)}
                            placeholder="https://instagram.com/myartistname"
                            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                          Previous Release Link (Spotify / Audiomack / YouTube)
                        </label>
                        <input
                          type="url"
                          value={releaseLink}
                          onChange={(e) => setReleaseLink(e.target.value)}
                          placeholder="https://audiomack.com/myartistname/song"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={applyLoading}
                      className="py-2.5 px-6 rounded-full font-bold text-xs bg-white hover:bg-neutral-100 text-neutral-900 transition shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {applyLoading
                        ? 'Submitting...'
                        : isGuest
                        ? 'Sign In & Apply as Artist'
                        : t('submitApplication')}
                    </button>
                  </form>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* 5. Artist Analytics Mock-up Card & Mobile Money Tipping Preview */}
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
            Preview
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

          <div className="grid grid-cols-2 gap-3">
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
