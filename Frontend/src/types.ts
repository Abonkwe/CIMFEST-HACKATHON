export const CAMEROON_REGIONS = [
  'Southwest',
  'Littoral',
  'Centre',
  'Northwest',
  'West',
  'South',
  'East',
  'Adamawa',
  'North',
  'Far North',
  'Abroad',
] as const

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
  full_legal_name?: string | null
  email?: string | null
  country_of_residence?: string | null
  primary_genre?: string | null
  bio?: string | null
  avatar_url?: string | null
  social_links?: Record<string, any>
  release_links?: string[]
  verification_status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string | null
  reviewed_at?: string | null
}

export interface AdminPendingArtist extends ArtistProfile {
  phone?: string | null
  display_name?: string | null
  region?: string | null
  user?: {
    id: string
    display_name: string
    phone: string
    region: string
    role: UserRole
  } | null
}

export interface AdminReport {
  id: string
  target_type: 'creation' | 'song'
  target_id: string
  reporter_id: string
  reason: string
  status: string
  created_at?: string
}

export interface AdminQueuesResponse {
  status: string
  pending_artists: AdminPendingArtist[]
  pending_artists_count: number
  open_reports: AdminReport[]
  open_reports_count: number
}

export interface AdminAnalyticsResponse {
  status: string
  totals: {
    total_users: number
    total_fans_creators: number
    verified_artists: number
    pending_artists: number
    total_songs: number
    active_challenges: number
    total_creations: number
    total_votes: number
    open_reports: number
  }
  users_by_region: Record<string, number>
  top_songs: {
    id: string
    title: string
    album_name?: string
    artist_name: string
    genre: string
    status: string
    trending_score: number
    creations_count: number
    votes_count: number
    engagement_total: number
  }[]
  pending_applications: AdminPendingArtist[]
}

export interface SongCreatePayload {
  title: string
  album_name?: string
  genre: string
  language: string
  clip_url: string
  duration_sec: number
  bpm: number
}

export interface AlbumTrackPayload {
  title: string
  clip_url: string
  duration_sec: number
  bpm: number
  genre?: string
  language?: string
}

export interface AlbumCreatePayload {
  album_name: string
  genre: string
  language: string
  tracks: AlbumTrackPayload[]
}

export interface ArtistSongInsight extends Song {
  album_name?: string
  plays_count: number
  creations_count: number
  votes_count: number
  active_challenges_count: number
}

export interface ArtistChallengePayload {
  song_id: string
  title: string
  duration_hours: number
}

export interface Song {
  id: string
  artist_id: string
  artist_name?: string
  album_name?: string
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

export type ComicExpression =
  | 'happy'
  | 'laughing'
  | 'sad'
  | 'angry'
  | 'shocked'
  | 'love'
  | 'confused'
  | 'jealous'
  | 'embarrassed'
  | 'excited'
  | 'suspicious'
  | 'nervous'
  | 'proud'
  | 'bored'

export interface SceneCharacter {
  id: string
  expression?: ComicExpression | string
  dialogue?: string
  flip?: boolean
}

export type StoryAction =
  | 'walk_in'
  | 'approach'
  | 'walk_away'
  | 'turn_around'
  | 'slip_fall'
  | 'kneel'
  | 'wave_happy'
  | 'shocked'
  | 'angry_argue'
  | 'cry_sad'
  | 'laugh'
  | 'celebrate'
  // Legacy dance moves
  | 'sway'
  | 'stomp'
  | 'jump'
  | 'flex'

export type StoryBackground =
  | 'street_buea'
  | 'living_room'
  | 'chop_house'
  | 'park_sunset'
  // Legacy swatches
  | 'sage_starburst'
  | 'amber_sunset'
  | 'slate_night'
  | 'lavender_haze'

export type BgMotion = 'static' | 'scroll_left' | 'scroll_right' | 'zoom_in'

export type StoryProp = 'none' | 'phone' | 'gift_box' | 'table' | 'car'

export type StorySFX = 'none' | 'phone_ding' | 'gasp' | 'comedy_slip' | 'applause'

export interface MoveBlock {
  start: number
  end: number
  action: string
  // Video entry metadata (Dance Challenge / Music Cover)
  type?: 'comic' | 'video' | string
  sub_type?: 'dance' | 'cover' | string
  video_url?: string
  // Interactive storytelling scene metadata (backward-compatible)
  charA_action?: StoryAction | string
  charB_action?: StoryAction | string
  charA_expression?: ComicExpression | string
  charB_expression?: ComicExpression | string
  charA_id?: string
  charB_id?: string | null
  characters?: SceneCharacter[]
  bg?: StoryBackground | string
  bgMotion?: BgMotion
  prop?: StoryProp
  sfx?: StorySFX
  dialogueA?: string
  dialogueB?: string
}

export interface Creation {
  id: string
  challenge_id: string
  challenge_title?: string
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
    artist_id?: string
    artist_name?: string
    title: string
    clip_url: string
    bpm: number
    genre: string
  }
}

export interface Challenge {
  id: string
  song_id: string
  title?: string | null
  created_by?: string | null
  song?: Song
  status: 'active' | 'ended'
  starts_at?: string
  ends_at: string
  creations_count?: number
  entries_count?: number
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
  full_legal_name: string
  email: string
  country_of_residence?: string
  primary_genre?: string
  bio?: string
  avatar_url?: string
  social_links: Record<string, string>
  release_links: string[]
}

export interface ReportPayload {
  target_type: 'creation' | 'song'
  target_id: string
  reason: string
}

export interface ProfileBadge {
  id: string
  name: string
  icon: string
  description: string
}

export interface UserProfileStats {
  creations_count: number
  votes_received: number
  votes_cast: number
}

export interface UserProfileResponse {
  user: User
  artist_profile?: ArtistProfile | null
  creations: Creation[]
  stats: UserProfileStats
  badges: ProfileBadge[]
}

export type FapshiMedium = 'mobile money' | 'orange money'

export interface FapshiDonatePayload {
  artist_id: string
  creation_id?: string
  amount_xaf: number
  phone: string
  medium: FapshiMedium
}

export interface FapshiDonateResponse {
  transaction_id: string
  fapshi_trans_id: string
  status: string
  net_amount_xaf?: number
  demo?: boolean
  message: string
}

export interface FapshiStatusResponse {
  transaction_id: string
  fapshi_trans_id?: string
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED' | string
  gross_amount_xaf?: number
  net_amount_xaf?: number
}

export interface LedgerEntry {
  id: string
  artist_id: string
  transaction_id?: string | null
  entry_type: 'credit_tip' | 'debit_withdrawal' | 'credit_refund' | string
  amount_xaf: number
  created_at?: string
}

export interface PaymentTransaction {
  id: string
  artist_id: string
  creation_id?: string | null
  direction: 'collection' | 'payout' | string
  status: string
  gross_amount_xaf: number
  net_amount_xaf: number
  phone?: string
  medium?: string
  fapshi_trans_id?: string
  created_at?: string
}

export interface ArtistVaultResponse {
  status: string
  total_earned_xaf: number
  total_withdrawn_xaf: number
  available_balance_xaf: number
  ledger: LedgerEntry[]
  transactions: PaymentTransaction[]
}

export interface ArtistWithdrawPayload {
  amount_xaf: number
  phone?: string
  medium: FapshiMedium
}

export interface ArtistWithdrawResponse {
  status: string
  transaction_id: string
  fapshi_trans_id?: string
  amount_xaf: number
  phone: string
  medium: string
  total_earned_xaf: number
  total_withdrawn_xaf: number
  available_balance_xaf: number
  message: string
}
