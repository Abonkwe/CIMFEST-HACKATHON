export type UserRole = 'admin' | 'artist' | 'fan_creator'

export interface User {
  id: string
  phone: string
  display_name: string
  region: string
  role: UserRole
  avatar_url?: string
  is_suspended?: boolean
  created_at?: string
}

export interface ArtistProfile {
  user_id: string
  artist_name: string
  social_links?: Record<string, any>
  release_links?: string[]
  verification_status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: string
}

export interface Song {
  id: string
  artist_id: string
  artist_name?: string
  artist?: User & { artist_profile?: ArtistProfile }
  title: string
  genre: string
  language: string
  clip_url: string
  duration_sec: number
  bpm: number
  status: 'trending' | 'fresh'
  trending_score: number
  created_at?: string
}

export interface MoveBlock {
  start: number
  end: number
  action: string
}

export interface Creation {
  id: string
  challenge_id: string
  creator_id: string
  character_id?: string
  character?: string
  moves_timeline: MoveBlock[]
  caption?: string
  views: number
  vote_count?: number
  engagement_rate?: number
  creator_total_creations?: number
  created_at?: string
  creator_display_name?: string
  creator_region?: string
  creator?: {
    id?: string
    display_name: string
    region: string
  }
  challenge?: {
    id: string
    status?: string
    ends_at?: string
  }
  song?: {
    id?: string
    title: string
    clip_url: string
    bpm: number
    genre: string
  }
}

export interface Challenge {
  id: string
  song_id: string
  song?: Song
  status: 'active' | 'ended'
  starts_at?: string
  ends_at: string
  creations_count?: number
  creations?: Creation[]
  tab?: 'top' | 'rising'
  created_at?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isGuest: boolean
}

export interface ArtistApplicationPayload {
  artist_name: string
  social_links: Record<string, string>
  release_links: string[]
}

export interface ReportPayload {
  target_type: 'creation' | 'song'
  target_id: string
  reason: string
}
