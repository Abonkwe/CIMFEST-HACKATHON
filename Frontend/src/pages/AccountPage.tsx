import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'
import { useLanguage } from '../context/LanguageContext'
import { applyForArtist, fetchMyProfile } from '../lib/api'
import {
  CAMEROON_REGIONS,
  type Creation,
  type ProfileBadge,
  type Song,
  type UserProfileStats,
} from '../types'

interface AccountPageProps {
  onNavigateTab?: (tab: string) => void
}

const ARTIST_GENRES = ['Afropop', 'Makossa', 'Bikutsi', 'Hip Hop', 'Afrobeats', 'Gospel'] as const

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
  const { currentSong, playSong, togglePlay } = useAudio()
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

  // Subtle footer toggle for Fan/Creator -> Artist upgrade
  const [showArtistApplyForm, setShowArtistApplyForm] = useState(false)
  const [applyArtistName, setApplyArtistName] = useState('')
  const [applyLegalName, setApplyLegalName] = useState('')
  const [applyEmail, setApplyEmail] = useState('')
  const [applyCountry, setApplyCountry] = useState('Cameroon')
  const [applyGenre, setApplyGenre] = useState('Afropop')
  const [applyBio, setApplyBio] = useState('')
  const [applySocialPlatform, setApplySocialPlatform] = useState<'instagram' | 'tiktok' | 'youtube'>('instagram')
  const [applySocialLink, setApplySocialLink] = useState('')
  const [applyReleaseLink, setApplyReleaseLink] = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const isVerifiedArtist =
    user?.role === 'artist' && artistProfile?.verification_status === 'approved'
  const isPendingArtist = artistProfile?.verification_status === 'pending' && user?.role !== 'artist'
  const isRejectedArtist = artistProfile?.verification_status === 'rejected' && user?.role !== 'artist'
  const isAdmin = user?.role === 'admin'
  const isPlainFanCreator =
    !isGuest && !isAdmin && !isVerifiedArtist && !isPendingArtist

  const roleLabel =
    user?.role === 'artist'
      ? 'Artist'
      : user?.role === 'admin'
      ? 'Admin'
      : user
      ? 'Fan / Creator'
      : 'Guest'

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
    if (!token || !user || isAdmin) {
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
  }, [token, user, isAdmin])

  useEffect(() => {
    void loadCreatorProfile()
  }, [loadCreatorProfile])

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
      openLoginModal({
        mode: 'signup',
        accountType: 'artist',
        reason: 'Create your Artist / Musician account to apply',
      })
      return
    }

    if (!applyArtistName.trim() || !applyLegalName.trim() || !applyEmail.trim()) {
      setApplyError('Stage Name, Full Legal Name, and Email are required.')
      return
    }

    setApplyLoading(true)
    setApplyError(null)

    try {
      const social_links: Record<string, string> = {}
      if (applySocialLink.trim()) {
        social_links[applySocialPlatform] = applySocialLink.trim()
      }
      const release_links: string[] = applyReleaseLink.trim() ? [applyReleaseLink.trim()] : []

      const res = await applyForArtist(
        {
          artist_name: applyArtistName.trim(),
          full_legal_name: applyLegalName.trim(),
          email: applyEmail.trim(),
          country_of_residence: applyCountry.trim() || 'Cameroon',
          primary_genre: applyGenre,
          bio: applyBio.trim() || undefined,
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
      setShowArtistApplyForm(false)
    } catch (err: any) {
      setApplyError(err?.message || 'Failed to submit artist application.')
    } finally {
      setApplyLoading(false)
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

  return (
    <div className="space-y-6 pb-24 md:pb-16 animate-fade-in max-w-5xl mx-auto">
      {/* 1. Personal Profile Header Card */}
      <div className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#536D56]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#536D56] to-neutral-800 border-2 border-[#536D56] flex items-center justify-center text-2xl font-black text-white shadow-lg overflow-hidden shrink-0">
              {artistProfile?.avatar_url ? (
                <img
                  src={artistProfile.avatar_url}
                  alt={artistProfile.artist_name}
                  className="w-full h-full object-cover"
                />
              ) : user ? (
                user.display_name.slice(0, 2).toUpperCase()
              ) : (
                '👤'
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user ? user.display_name : 'Guest Explorer'}
                </h2>
                {isVerifiedArtist && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-sm">
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
                {isVerifiedArtist && artistProfile?.primary_genre && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#F43F5E]/40 bg-[#F43F5E]/15 text-[#F43F5E]">
                    {artistProfile.primary_genre}
                  </span>
                )}
              </div>

              {isVerifiedArtist && artistProfile?.bio && (
                <p className="text-xs text-neutral-300 mt-2 max-w-xl">{artistProfile.bio}</p>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isGuest ? (
              <>
                <button
                  onClick={() => openLoginModal({ mode: 'signup', accountType: 'fan_creator' })}
                  className="py-2.5 px-5 rounded-full font-bold text-xs bg-white hover:bg-neutral-100 text-neutral-900 transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Create Account / Sign In</span>
                  <span className="text-[#F43F5E]">✦</span>
                </button>
                <button
                  onClick={() =>
                    openLoginModal({
                      mode: 'signup',
                      accountType: 'artist',
                      reason: 'Create your Artist / Musician account to upload songs & launch challenges',
                    })
                  }
                  className="py-2.5 px-4 rounded-full font-bold text-xs border border-[#F43F5E]/50 bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 text-white transition active:scale-95 cursor-pointer"
                >
                  🎤 Artist Sign Up
                </button>
              </>
            ) : (
              <>
                {user?.role === 'artist' && onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('artist-studio')}
                    className="py-2.5 px-5 rounded-full font-bold text-xs bg-[#FACC15] hover:bg-[#eab308] text-neutral-950 transition shadow-md active:scale-95 cursor-pointer"
                  >
                    🎵 Open Artist Studio →
                  </button>
                )}
                {isAdmin && onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('admin')}
                    className="py-2.5 px-5 rounded-full font-bold text-xs bg-[#FACC15] hover:bg-[#eab308] text-neutral-950 transition shadow-md active:scale-95 cursor-pointer"
                  >
                    🛡️ Open Admin Dashboard →
                  </button>
                )}
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

        {/* Inline Edit Profile Form (PATCH /auth/me) */}
        {!isGuest && isEditingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-5 pt-5 border-t border-neutral-800 space-y-3 relative z-10"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#FACC15]">
                Update Display Name &amp; Region
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

            <button
              type="submit"
              disabled={editSaving}
              className="py-2 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
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
              onClick={() => openLoginModal({ mode: 'signup', accountType: 'fan_creator' })}
              className="shrink-0 px-3 py-1.5 rounded-full bg-amber-400 text-neutral-950 font-bold text-[11px] hover:bg-amber-300 transition cursor-pointer"
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      {/* 2. Pending Artist Verification Card (Pending Artists Only) */}
      {isPendingArtist && (
        <section className="rounded-3xl bg-[#121212] border border-amber-500/40 p-6 sm:p-7 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                ⏳
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Verification Under Review
                </h3>
                <p className="text-xs text-neutral-400">
                  Our team is reviewing your artist details. Artist Studio will unlock once approved.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              Verification in Progress
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                Stage Name
              </span>
              <div className="text-sm font-black text-white mt-0.5">
                {artistProfile?.artist_name}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                Primary Genre
              </span>
              <div className="text-sm font-bold text-[#F43F5E] mt-0.5">
                {artistProfile?.primary_genre || 'Afropop'}
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                Country
              </span>
              <div className="text-sm font-bold text-[#8FA993] mt-0.5">
                {artistProfile?.country_of_residence || 'Cameroon'}
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => void refreshMe()}
              className="py-2 px-4 rounded-full font-semibold text-xs border border-neutral-700 hover:bg-neutral-800 text-neutral-200 transition cursor-pointer"
            >
              ↻ Check Verification Status
            </button>
          </div>
        </section>
      )}

      {/* 3. Personal Creator Stats, Badges & My Animations */}
      {!isGuest && !isAdmin && (
        <section className="space-y-6">
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
                  Publish an animation in Studio or vote in Challenges to unlock badges.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-[#121212] border border-[#536D56]/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">My Animations</h3>
                <p className="text-xs text-neutral-400">
                  Animated stories &amp; dances you submitted to Cameroon challenges
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
                  <h4 className="text-sm font-bold text-white">No animations yet</h4>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto">
                    Pick a trending Cameroonian track, choose your characters, and publish your
                    first animated story!
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
                            Character:{' '}
                            <span className="text-neutral-200 capitalize">
                              {charLabel.replace('_', ' ')}
                            </span>
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

      {/* 4. Subtle Footer Link for Fan/Creator -> Artist Upgrade */}
      {isPlainFanCreator && (
        <section className="pt-1">
          {!showArtistApplyForm && !isRejectedArtist ? (
            <div className="text-center py-2">
              <button
                type="button"
                onClick={() => setShowArtistApplyForm(true)}
                className="text-xs text-neutral-400 hover:text-white underline underline-offset-4 transition cursor-pointer"
              >
                Are you a Cameroonian musician? Apply for an Artist account
              </button>
            </div>
          ) : (
            <div className="rounded-3xl bg-[#121212] border border-[#536D56]/30 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Apply for an Artist Account</h3>
                  <p className="text-xs text-neutral-400">
                    Submit your artist identity details for verification.
                  </p>
                </div>
                {!isRejectedArtist && (
                  <button
                    type="button"
                    onClick={() => setShowArtistApplyForm(false)}
                    className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>

              {isRejectedArtist && (
                <div className="p-3.5 rounded-2xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
                  Your previous artist application for{' '}
                  <strong>{artistProfile?.artist_name}</strong> was not approved. Update your details
                  below to re-apply.
                </div>
              )}

              <form onSubmit={handleApply} className="space-y-4">
                {applyError && (
                  <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] text-xs font-medium">
                    {applyError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Stage / Artist Name *
                    </label>
                    <input
                      type="text"
                      value={applyArtistName}
                      onChange={(e) => setApplyArtistName(e.target.value)}
                      placeholder="e.g. Buea SoundBoy"
                      required
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#536D56]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      value={applyLegalName}
                      onChange={(e) => setApplyLegalName(e.target.value)}
                      placeholder="Full legal name"
                      required
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#536D56]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={applyEmail}
                      onChange={(e) => setApplyEmail(e.target.value)}
                      placeholder="artist@example.com"
                      required
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={applyCountry}
                      onChange={(e) => setApplyCountry(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Primary Genre
                    </label>
                    <select
                      value={applyGenre}
                      onChange={(e) => setApplyGenre(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                    >
                      {ARTIST_GENRES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Short Bio (optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={240}
                    value={applyBio}
                    onChange={(e) => setApplyBio(e.target.value)}
                    placeholder="Tell us about your music..."
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#536D56] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Social Link (optional)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={applySocialPlatform}
                        onChange={(e) =>
                          setApplySocialPlatform(e.target.value as 'instagram' | 'tiktok' | 'youtube')
                        }
                        className="bg-neutral-900 border border-neutral-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                      </select>
                      <input
                        type="url"
                        value={applySocialLink}
                        onChange={(e) => setApplySocialLink(e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#536D56]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Previous Release Link (optional)
                    </label>
                    <input
                      type="url"
                      value={applyReleaseLink}
                      onChange={(e) => setApplyReleaseLink(e.target.value)}
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
            </div>
          )}
        </section>
      )}
    </div>
  )
}
