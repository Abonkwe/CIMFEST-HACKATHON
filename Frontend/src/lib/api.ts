import type {
  ArtistApplicationPayload,
  Challenge,
  Creation,
  ReportPayload,
  Song,
  User,
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

export async function fetchTrendingSongs(): Promise<Song[]> {
  try {
    const res = await fetch(`${API_BASE}/songs/trending`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) return data
    return getFallbackSongs().filter((s) => s.status === 'trending')
  } catch (err) {
    console.warn('Using fallback trending songs:', err)
    return getFallbackSongs().filter((s) => s.status === 'trending')
  }
}

export async function fetchFreshSongs(): Promise<Song[]> {
  try {
    const res = await fetch(`${API_BASE}/songs/fresh`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) return data
    return getFallbackSongs().filter((s) => s.status === 'fresh')
  } catch (err) {
    console.warn('Using fallback fresh songs:', err)
    return getFallbackSongs().filter((s) => s.status === 'fresh')
  }
}

export async function fetchActiveChallenges(): Promise<Challenge[]> {
  try {
    const res = await fetch(`${API_BASE}/challenges/active`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) return data
    return getFallbackChallenges()
  } catch (err) {
    console.warn('Using fallback active challenges:', err)
    return getFallbackChallenges()
  }
}

export async function fetchChallengeById(challengeId: string, tab: 'top' | 'rising' = 'top'): Promise<Challenge> {
  try {
    const res = await fetch(`${API_BASE}/challenges/${challengeId}?tab=${tab}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('Using fallback challenge detail:', err)
    const challenges = getFallbackChallenges()
    const found = challenges.find((c) => c.id === challengeId) || challenges[0]
    return {
      ...found,
      tab,
      creations: getFallbackCreations(),
    }
  }
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

export async function fetchFeed(): Promise<Creation[]> {
  let list: Creation[] = []
  try {
    const res = await fetch(`${API_BASE}/feed`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        list = data
      }
    }
  } catch (err) {
    console.warn('Using fallback feed creations:', err)
  }

  if (list.length === 0) {
    list = getFallbackCreations()
  }

  // Prepend locally created animations so creators see their work instantly
  const locals = getLocalCreations()
  if (locals.length > 0) {
    list = [...locals, ...list.filter((c) => !locals.some((l) => l.id === c.id))]
  }

  return list
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

export async function castVote(
  creationId: string,
  token: string
): Promise<{ status: string; creation_id: string; vote_count: number; message: string }> {
  const res = await fetch(`${API_BASE}/votes`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ creation_id: creationId }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || `Failed to vote (HTTP ${res.status})`)
  }
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
    saveLocalCreation({
      ...created,
      song: created.song || KOCEE_DEMO_SONG,
      challenge: created.challenge || KOCEE_DEMO_CHALLENGE,
    })
    return created
  }

  // Fallback if challenge is demo or server rejects: Save locally so creator flow is seamless
  const localCreation: Creation = {
    id: `local-${Date.now()}`,
    challenge_id: data.challenge_id,
    creator_id: '00000000-0000-0000-0000-000000000005',
    character_id: data.character_id,
    character: data.character_id,
    moves_timeline: data.moves_timeline as any,
    caption: data.caption || 'Kocee "We Di Go Na Go" dance challenge! 🇨🇲',
    views: 1,
    vote_count: 0,
    engagement_rate: 0.0,
    created_at: new Date().toISOString(),
    creator_display_name: 'You (Creator)',
    creator_region: 'Southwest',
    song: KOCEE_DEMO_SONG,
    challenge: KOCEE_DEMO_CHALLENGE,
  }
  saveLocalCreation(localCreation)
  return localCreation
}

export async function loginWithPhone(
  phone: string,
  otp: string,
  displayName?: string,
  region?: string
): Promise<{ access_token: string; token_type: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: phone.trim(),
      otp: otp.trim(),
      display_name: displayName?.trim() || undefined,
      region: region || 'Southwest',
    }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.detail || 'Authentication failed')
  }
  return res.json()
}

export async function applyForArtist(
  payload: ArtistApplicationPayload,
  token: string
): Promise<{ status: string; message: string; profile: any }> {
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
      id: '33333333-koce-0000-0000-000000000001',
      challenge_id: KOCEE_DEMO_CHALLENGE.id,
      creator_id: '00000000-0000-0000-0000-000000000005',
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
        id: '00000000-0000-0000-0000-000000000005',
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
