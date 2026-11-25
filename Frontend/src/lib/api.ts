import type {
  AdminAnalyticsResponse,
  AdminQueuesResponse,
  AlbumCreatePayload,
  ArtistApplicationPayload,
  ArtistChallengePayload,
  ArtistProfile,
  ArtistSongInsight,
  ArtistVaultResponse,
  ArtistWithdrawPayload,
  ArtistWithdrawResponse,
  Challenge,
  Creation,
  FapshiDonatePayload,
  FapshiDonateResponse,
  FapshiStatusResponse,
  ReportPayload,
  Song,
  SongCreatePayload,
  User,
  UserProfileResponse,
} from '../types'
import { KOCEE_DEMO_SONG, KOCEE_DEMO_CHALLENGE } from './storyTemplates'

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  try {
    const url = new URL(envUrl)
    if (
      typeof window !== 'undefined' &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    ) {
      url.hostname = window.location.hostname
      return url.origin
    }
    return envUrl
  } catch {
    return envUrl
  }
}

export const API_BASE = getApiBaseUrl()

// In-memory Stale-While-Revalidate cache for GET responses (NFR-1)
const SWR_TTL_MS = 20_000
const apiGetCache = new Map<string, { data: unknown; ts: number }>()

export function clearApiCache(prefix?: string): void {
  if (!prefix) {
    apiGetCache.clear()
    return
  }
  for (const key of Array.from(apiGetCache.keys())) {
    if (key.includes(prefix)) {
      apiGetCache.delete(key)
    }
  }
}

async function fetchWithSWR<T>(url: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = apiGetCache.get(url)
  const now = Date.now()

  if (cached) {
    // Revalidate in background if stale, return cached immediately
    if (now - cached.ts > SWR_TTL_MS) {
      fetcher()
        .then((fresh) => {
          apiGetCache.set(url, { data: fresh, ts: Date.now() })
        })
        .catch(() => {})
    }
    return cached.data as T
  }

  const fresh = await fetcher()
  apiGetCache.set(url, { data: fresh, ts: Date.now() })
  return fresh
}

// Helper for authenticated headers
function getHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function checkApiHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error(`Health check failed with status: ${res.status}`)
  return res.json()
}

export async function fetchAllSongs(): Promise<Song[]> {
  const url = `${API_BASE}/songs`
  return fetchWithSWR(url, async () => {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const hasKocee = data.some(
            (s: Song) => s.id === KOCEE_DEMO_SONG.id || s.title === KOCEE_DEMO_SONG.title
          )
          return hasKocee ? data : [KOCEE_DEMO_SONG, ...data]
        }
      }
    } catch {
      // Fallback to trending + fresh
    }
    const [trending, fresh] = await Promise.all([fetchTrendingSongs(), fetchFreshSongs()])
    const seen = new Set<string>()
    const merged: Song[] = []
    for (const s of [...trending, ...fresh]) {
      if (!seen.has(s.id)) {
        seen.add(s.id)
        merged.push(s)
      }
    }
    return merged
  })
}

export async function fetchTrendingSongs(): Promise<Song[]> {
  const url = `${API_BASE}/songs/trending`
  return fetchWithSWR(url, async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const hasKocee = data.some(
          (s: Song) => s.id === KOCEE_DEMO_SONG.id || s.title === KOCEE_DEMO_SONG.title
        )
        return hasKocee ? data : [KOCEE_DEMO_SONG, ...data]
      }
      return getFallbackSongs().filter((s) => s.status === 'trending')
    } catch (err) {
      console.warn('Using fallback trending songs:', err)
      return getFallbackSongs().filter((s) => s.status === 'trending')
    }
  })
}

export async function fetchFreshSongs(): Promise<Song[]> {
  const url = `${API_BASE}/songs/fresh`
  return fetchWithSWR(url, async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) return data
      return getFallbackSongs().filter((s) => s.status === 'fresh')
    } catch (err) {
      console.warn('Using fallback fresh songs:', err)
      return getFallbackSongs().filter((s) => s.status === 'fresh')
    }
  })
}

export async function fetchActiveChallenges(): Promise<Challenge[]> {
  const url = `${API_BASE}/challenges/active`
  return fetchWithSWR(url, async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const hasKocee = data.some(
          (c: Challenge) =>
            c.id === KOCEE_DEMO_CHALLENGE.id || c.song?.title === KOCEE_DEMO_SONG.title
        )
        return hasKocee ? data : [KOCEE_DEMO_CHALLENGE, ...data]
      }
      return getFallbackChallenges()
    } catch (err) {
      console.warn('Using fallback active challenges:', err)
      return getFallbackChallenges()
    }
  })
}

export async function fetchChallengeById(challengeId: string, tab: 'top' | 'rising' = 'top'): Promise<Challenge> {
  const url = `${API_BASE}/challenges/${challengeId}?tab=${tab}`
  return fetchWithSWR(url, async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      console.warn('Using fallback challenge detail:', err)
      const challenges = getFallbackChallenges()
      const found = challenges.find((c) => c.id === challengeId) || challenges[0]
      return {
        ...found,
        tab,
        creations: getFallbackCreations().filter((c) => c.challenge_id === found.id),
      }
    }
  })
}

function getLocalCreations(): Creation[] {
  try {
    const raw = localStorage.getItem('beattoons_local_creations')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return []
}

function saveLocalCreation(creation: Creation) {
  try {
    const existing = getLocalCreations()
    const updated = [creation, ...existing.filter((c) => c.id !== creation.id)]
    localStorage.setItem('beattoons_local_creations', JSON.stringify(updated.slice(0, 20)))
  } catch {
    // ignore
  }
}

export async function fetchFeed(challengeId?: string | null): Promise<Creation[]> {
  const url = challengeId
    ? `${API_BASE}/feed?challenge_id=${encodeURIComponent(challengeId)}`
    : `${API_BASE}/feed`

  return fetchWithSWR(url, async () => {
    let list: Creation[] = []
    let fetchedFromApi = false
    try {
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          fetchedFromApi = true
          list = data
        }
      }
    } catch (err) {
      console.warn('Using fallback feed creations:', err)
    }

    if (!fetchedFromApi && list.length === 0 && !challengeId) {
      list = getFallbackCreations()
    }

    // Only use local creations as an offline fallback when API failed
    if (!fetchedFromApi) {
      const locals = getLocalCreations().filter((l) =>
        challengeId ? l.challenge_id === challengeId : true
      )
      if (locals.length > 0) {
        list = [...locals, ...list.filter((c) => !locals.some((l) => l.id === c.id))]
      }
    }

    return list
  })
}

export async function recordCreationView(creationId: string): Promise<{ views: number }> {
  try {
    const res = await fetch(`${API_BASE}/creations/${creationId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('Failed recording view:', err)
    return { views: 1 }
  }
}

export interface MomoVotePayment {
  momo_phone: string
  amount_xaf: number
  payment_reference?: string
}

export async function castVote(
  creationId: string,
  token: string,
  payment: MomoVotePayment
): Promise<{
  status: string
  creation_id: string
  vote_count: number
  payment_provider: string
  amount_xaf: number
  momo_phone: string
  payment_reference: string
  message: string
}> {
  const res = await fetch(`${API_BASE}/votes`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      creation_id: creationId,
      momo_phone: payment.momo_phone,
      amount_xaf: payment.amount_xaf,
      payment_provider: 'MTN_MOMO',
      payment_reference: payment.payment_reference,
    }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `Failed to vote (HTTP ${res.status})`)
  }
  clearApiCache()
  return res.json()
}

export async function submitCreation(
  data: {
    challenge_id: string
    character_id: string
    moves_timeline: { start: number; end: number; action: string }[]
    caption?: string
  },
  token: string
): Promise<Creation> {
  let res: Response | null = null
  try {
    res = await fetch(`${API_BASE}/creations`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    })
  } catch (err) {
    console.warn('Network error when submitting creation:', err)
  }

  if (res && res.ok) {
    const created: Creation = await res.json()
    clearApiCache()
    try {
      localStorage.removeItem('beattoons_local_creations')
    } catch {
      // ignore
    }
    return created
  }

  if (res && !res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `Failed to publish creation (HTTP ${res.status})`)
  }

  throw new Error('Could not reach the backend server to publish your story.')
}

export async function loginWithPhone(
  phone: string,
  otp: string,
  displayName?: string,
  region?: string
): Promise<{
  access_token: string
  token_type: string
  user: User
  artist_profile?: ArtistProfile | null
}> {
  const payload: Record<string, string> = {
    phone: phone.trim(),
    otp: otp.trim(),
  }
  if (displayName?.trim()) {
    payload.display_name = displayName.trim()
  }
  if (region?.trim()) {
    payload.region = region.trim()
  }

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Authentication failed')
  }
  return res.json()
}

export async function fetchMe(
  token: string
): Promise<{ user: User; artist_profile: ArtistProfile | null }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getHeaders(token),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    const error = new Error(errData.detail || `Failed to load account (${res.status})`) as Error & {
      status?: number
    }
    error.status = res.status
    throw error
  }
  return res.json()
}

export async function updateMyProfile(
  payload: { display_name?: string; region?: string },
  token: string
): Promise<{ status: string; user: User; artist_profile?: ArtistProfile | null }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to update profile')
  }
  return res.json()
}

export async function fetchMyProfile(token: string): Promise<UserProfileResponse> {
  const res = await fetch(`${API_BASE}/users/me/profile`, {
    headers: getHeaders(token),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to load creator profile')
  }
  return res.json()
}

export async function applyForArtist(
  payload: ArtistApplicationPayload,
  token: string
): Promise<{
  status: string
  message: string
  profile: ArtistProfile
  artist_profile?: ArtistProfile
}> {
  const res = await fetch(`${API_BASE}/artists/apply`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to submit application')
  }
  return res.json()
}

export async function uploadSong(payload: SongCreatePayload, token: string): Promise<Song> {
  const res = await fetch(`${API_BASE}/songs`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to upload song clip')
  }
  return res.json()
}

export async function fetchMySongs(token: string): Promise<Song[]> {
  const res = await fetch(`${API_BASE}/songs/mine`, {
    headers: getHeaders(token),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to load your uploaded songs')
  }
  return res.json()
}

export async function adminAccessLogin(
  phone: string,
  adminCode: string
): Promise<{
  status: string
  access_token: string
  token_type: string
  user: User
  artist_profile?: ArtistProfile | null
}> {
  const res = await fetch(`${API_BASE}/auth/admin-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: phone.trim(),
      admin_code: adminCode.trim(),
    }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Invalid team admin passcode or phone number')
  }
  return res.json()
}

export async function uploadAlbum(
  payload: AlbumCreatePayload,
  token: string
): Promise<{ status: string; album_name: string; tracks_count: number; songs: Song[] }> {
  const res = await fetch(`${API_BASE}/songs/album`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to release album')
  }
  return res.json()
}

export async function fetchArtistSongsWithInsights(
  token: string
): Promise<{ status: string; songs_count: number; songs: ArtistSongInsight[] }> {
  const res = await fetch(`${API_BASE}/artists/me/songs`, {
    headers: getHeaders(token),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to load artist releases')
  }
  return res.json()
}

export async function launchArtistChallenge(
  payload: ArtistChallengePayload,
  token: string
): Promise<{ status: string; message: string; challenge: Challenge; song_promoted: boolean }> {
  const res = await fetch(`${API_BASE}/artists/challenges`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to launch challenge')
  }
  return res.json()
}

export async function fetchAdminAnalytics(token: string): Promise<AdminAnalyticsResponse> {
  const res = await fetch(`${API_BASE}/admin/analytics`, {
    headers: getHeaders(token),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to fetch admin analytics')
  }
  return res.json()
}

export async function fetchAdminQueues(token: string): Promise<AdminQueuesResponse> {
  const res = await fetch(`${API_BASE}/admin/queues`, {
    headers: getHeaders(token),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to fetch admin queues')
  }
  return res.json()
}

export async function reviewArtistApplication(
  userId: string,
  decision: 'approved' | 'rejected',
  token: string
): Promise<{
  status: string
  user_id: string
  verification_status: 'approved' | 'rejected'
  artist_profile?: ArtistProfile | null
  user?: User | null
  message: string
}> {
  const res = await fetch(`${API_BASE}/admin/artists/${userId}/review`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ decision }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `Failed to ${decision} artist application`)
  }
  return res.json()
}

export async function moderateContent(
  payload: {
    action: 'remove_creation' | 'remove_song' | 'suspend_user' | 'resolve_report'
    target_id: string
    report_id?: string
  },
  token: string
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/admin/moderate`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Moderation action failed')
  }
  return res.json()
}

export async function demoQuickApproveArtist(userId: string): Promise<void> {
  const adminSession = await loginWithPhone('+237670000001', '123456')
  if (adminSession.user.role !== 'admin') {
    throw new Error('Demo admin account (+237670000001) does not have admin role in database.')
  }
  await reviewArtistApplication(userId, 'approved', adminSession.access_token)
}

export async function submitReport(
  payload: ReportPayload,
  token: string
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Failed to submit report')
  }
  return res.json()
}

// Resilient Fallback Data
function getFallbackSongs(): Song[] {
  return [
    KOCEE_DEMO_SONG,
    {
      id: '11111111-1111-1111-1111-111111110001',
      artist_id: '00000000-0000-0000-0000-000000000002',
      artist_name: 'Petit Pays Jr',
      title: 'Douala Makossa Pulse',
      genre: 'Makossa',
      language: 'Duala',
      clip_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
      duration_sec: 24,
      bpm: 115,
      status: 'trending',
      trending_score: 96.5,
      artist: {
        id: '00000000-0000-0000-0000-000000000002',
        phone: '+237671112233',
        display_name: 'Petit Pays Jr',
        region: 'Littoral',
        role: 'artist',
        artist_profile: {
          user_id: '00000000-0000-0000-0000-000000000002',
          artist_name: 'Petit Pays Jr',
          verification_status: 'approved',
        },
      },
    },
    {
      id: '11111111-1111-1111-1111-111111110003',
      artist_id: '00000000-0000-0000-0000-000000000004',
      artist_name: 'Buea SoundBoy',
      title: 'Mboa Level Up',
      genre: 'Afropop',
      language: 'English',
      clip_url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_12b0c7443c.mp3',
      duration_sec: 27,
      bpm: 104,
      status: 'trending',
      trending_score: 92.8,
      artist: {
        id: '00000000-0000-0000-0000-000000000004',
        phone: '+237673334455',
        display_name: 'Buea SoundBoy',
        region: 'Southwest',
        role: 'artist',
        artist_profile: {
          user_id: '00000000-0000-0000-0000-000000000004',
          artist_name: 'Buea SoundBoy',
          verification_status: 'approved',
        },
      },
    },
    {
      id: '11111111-1111-1111-1111-111111110002',
      artist_id: '00000000-0000-0000-0000-000000000003',
      artist_name: 'Lady Ponce Fanatic',
      title: 'Yaoundé Bikutsi Storm',
      genre: 'Bikutsi',
      language: 'Ewondo',
      clip_url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3',
      duration_sec: 20,
      bpm: 130,
      status: 'trending',
      trending_score: 89.0,
      artist: {
        id: '00000000-0000-0000-0000-000000000003',
        phone: '+237672223344',
        display_name: 'Lady Ponce Fanatic',
        region: 'Centre',
        role: 'artist',
        artist_profile: {
          user_id: '00000000-0000-0000-0000-000000000003',
          artist_name: 'Lady Ponce Fanatic',
          verification_status: 'approved',
        },
      },
    },
    {
      id: '11111111-1111-1111-1111-111111110004',
      artist_id: '00000000-0000-0000-0000-000000000004',
      artist_name: 'Buea SoundBoy',
      title: 'Kumba Sun Fresh',
      genre: 'Afropop',
      language: 'Pidgin',
      clip_url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
      duration_sec: 18,
      bpm: 108,
      status: 'fresh',
      trending_score: 14.2,
      artist: {
        id: '00000000-0000-0000-0000-000000000004',
        phone: '+237673334455',
        display_name: 'Buea SoundBoy',
        region: 'Southwest',
        role: 'artist',
      },
    },
  ]
}

function getFallbackChallenges(): Challenge[] {
  const songs = getFallbackSongs()
  const twoDaysLater = new Date(Date.now() + 48 * 3600 * 1000).toISOString()
  return [
    KOCEE_DEMO_CHALLENGE,
    {
      id: '22222222-2222-2222-2222-222222220001',
      song_id: '11111111-1111-1111-1111-111111110001',
      song: songs[1] || songs[0],
      status: 'active',
      ends_at: twoDaysLater,
      creations_count: 3,
    },
  ]
}

function getFallbackCreations(): Creation[] {
  const twoDaysLater = new Date(Date.now() + 48 * 3600 * 1000).toISOString()
  return [
    {
      id: 'b08601a1-49bb-50ca-9fd2-a7f9a7fde91a',
      challenge_id: KOCEE_DEMO_CHALLENGE.id,
      creator_id: '92f607e7-d538-5d18-bf77-c5a66230590f',
      character_id: 'tantie',
      character: 'tantie',
      moves_timeline: [
        {
          start: 42.0,
          end: 46.0,
          action: 'approach',
          charA_action: 'approach',
          charB_action: 'turn_around',
          charA_id: 'tantie',
          charB_id: 'mboa_boy',
          bg: 'street_buea',
          bgMotion: 'scroll_left',
          prop: 'none',
          dialogueA: 'We di go na go!',
          dialogueB: 'On est ensemble!',
        },
        {
          start: 46.0,
          end: 50.0,
          action: 'celebrate',
          charA_action: 'celebrate',
          charB_action: 'laugh',
          charA_id: 'tantie',
          charB_id: 'mboa_boy',
          bg: 'street_buea',
          bgMotion: 'static',
          prop: 'none',
          sfx: 'applause',
          dialogueA: 'No stress in Buea town!',
        },
        {
          start: 50.0,
          end: 54.0,
          action: 'shocked',
          charA_action: 'shocked',
          charB_action: 'angry_argue',
          charA_id: 'tantie',
          charB_id: 'mboa_boy',
          bg: 'living_room',
          bgMotion: 'zoom_in',
          prop: 'phone',
          sfx: 'phone_ding',
          dialogueA: 'Who send this message?!',
          dialogueB: 'Ah Tantie calm down!',
        },
        {
          start: 54.0,
          end: 58.0,
          action: 'slip_fall',
          charA_action: 'slip_fall',
          charB_action: 'shocked',
          charA_id: 'tantie',
          charB_id: 'mboa_boy',
          bg: 'chop_house',
          bgMotion: 'static',
          prop: 'none',
          sfx: 'comedy_slip',
          dialogueA: 'Chai! Dis floor slippery!',
          dialogueB: 'Ashia Tantie!',
        },
      ],
      caption: 'Kocee "We Di Go Na Go" official animation! We cropped the chorus (0:42 — 0:58) 🇨🇲🔥',
      views: 520,
      vote_count: 8,
      engagement_rate: 0.045,
      creator: {
        id: '92f607e7-d538-5d18-bf77-c5a66230590f',
        display_name: 'Buea Animator',
        region: 'Southwest',
      },
      creator_display_name: 'Buea Animator',
      creator_region: 'Southwest',
      challenge: KOCEE_DEMO_CHALLENGE,
      song: KOCEE_DEMO_SONG,
    },
    {
      id: '33333333-3333-3333-3333-333333330001',
      challenge_id: '22222222-2222-2222-2222-222222220001',
      creator_id: '00000000-0000-0000-0000-000000000005',
      character_id: 'KmerBoy',
      moves_timeline: [
        { start: 0.0, end: 2.5, action: 'sway' },
        { start: 2.5, end: 5.0, action: 'footwork' },
        { start: 5.0, end: 7.5, action: 'spin' },
      ],
      caption: 'Feel the Douala energy! Vote for my rhythm moves!',
      views: 245,
      vote_count: 2,
      engagement_rate: 0.0082,
      creator: {
        id: '00000000-0000-0000-0000-000000000005',
        display_name: 'Kumba Dancer',
        region: 'Southwest',
      },
      creator_display_name: 'Kumba Dancer',
      creator_region: 'Southwest',
      challenge: {
        id: '22222222-2222-2222-2222-222222220001',
        status: 'active',
        ends_at: twoDaysLater,
      },
      song: {
        id: '11111111-1111-1111-1111-111111110001',
        title: 'Douala Makossa Pulse',
        clip_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
        bpm: 115,
        genre: 'Makossa',
      },
    },
    {
      id: '33333333-3333-3333-3333-333333330002',
      challenge_id: '22222222-2222-2222-2222-222222220001',
      creator_id: '00000000-0000-0000-0000-000000000006',
      character_id: 'MboaGirl',
      moves_timeline: [
        { start: 0.0, end: 2.0, action: 'intro_pose' },
        { start: 2.0, end: 4.5, action: 'sway' },
        { start: 4.5, end: 7.0, action: 'jump_beat' },
      ],
      caption: 'La cadence du 237 ne ment jamais! On est ensemble!',
      views: 189,
      vote_count: 1,
      engagement_rate: 0.0053,
      creator: {
        id: '00000000-0000-0000-0000-000000000006',
        display_name: 'Bonaberi Vibe',
        region: 'Littoral',
      },
      creator_display_name: 'Bonaberi Vibe',
      creator_region: 'Littoral',
      challenge: {
        id: '22222222-2222-2222-2222-222222220001',
        status: 'active',
        ends_at: twoDaysLater,
      },
      song: {
        id: '11111111-1111-1111-1111-111111110001',
        title: 'Douala Makossa Pulse',
        clip_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
        bpm: 115,
        genre: 'Makossa',
      },
    },
    {
      id: '33333333-3333-3333-3333-333333330003',
      challenge_id: '22222222-2222-2222-2222-222222220001',
      creator_id: '00000000-0000-0000-0000-000000000007',
      character_id: 'ToonDancer',
      moves_timeline: [
        { start: 0.0, end: 3.0, action: 'footwork' },
        { start: 3.0, end: 5.5, action: 'spin' },
        { start: 5.5, end: 8.0, action: 'sway' },
      ],
      caption: 'Dis Makossa beat sweet die! Make una push this creation to number one!',
      views: 310,
      vote_count: 1,
      engagement_rate: 0.0032,
      creator: {
        id: '00000000-0000-0000-0000-000000000007',
        display_name: 'Mvolyé Groover',
        region: 'Centre',
      },
      creator_display_name: 'Mvolyé Groover',
      creator_region: 'Centre',
      challenge: {
        id: '22222222-2222-2222-2222-222222220001',
        status: 'active',
        ends_at: twoDaysLater,
      },
      song: {
        id: '11111111-1111-1111-1111-111111110001',
        title: 'Douala Makossa Pulse',
        clip_url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
        bpm: 115,
        genre: 'Makossa',
      },
    },
  ]
}

// =========================================================================
// Fapshi Mobile Money Donations & Artist Vault Ledger
// =========================================================================

export async function donateViaFapshi(
  payload: FapshiDonatePayload,
  token: string
): Promise<FapshiDonateResponse> {
  const res = await fetch(`${API_BASE}/payments/fapshi/donate`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to initiate Mobile Money tip (HTTP ${res.status})`)
  }
  return data
}

export async function fetchFapshiPaymentStatus(
  transactionId: string
): Promise<FapshiStatusResponse> {
  const res = await fetch(`${API_BASE}/payments/fapshi/status/${encodeURIComponent(transactionId)}`, {
    headers: getHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to check payment status (HTTP ${res.status})`)
  }
  return data
}

export async function fetchArtistVault(token: string): Promise<ArtistVaultResponse> {
  const res = await fetch(`${API_BASE}/artists/me/vault`, {
    headers: getHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.detail || `Failed to load Artist Vault (HTTP ${res.status})`)
  }
  return data
}

export async function uploadCreationVideo(
  file: File | Blob,
  filename: string,
  token: string
): Promise<{ video_url: string }> {
  const formData = new FormData()
  formData.append('file', file, filename)

  const res = await fetch(`${API_BASE}/creations/upload-video`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.detail || `Video upload failed (HTTP ${res.status})`)
  }
  return data
}

export async function withdrawFromArtistVault(
  payload: ArtistWithdrawPayload,
  token: string
): Promise<ArtistWithdrawResponse> {
  const res = await fetch(`${API_BASE}/artists/me/withdraw`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.detail || `Withdrawal failed (HTTP ${res.status})`)
  }
  return data
}
