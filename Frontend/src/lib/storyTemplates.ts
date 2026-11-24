/**
 * Predefined 1-Click Story Templates for Animation Studio (FR-20 - FR-24)
 *
 * Provides 3 culturally authentic Cameroonian comedy, romance, and drama stories:
 * 1. "The Unexpected Message" (Drama / Betrayal)
 * 2. "Tantie's Slip" (Comedy)
 * 3. "Buea Proposal" (Romance)
 */

import type { MoveBlock, StoryAction, StoryBackground, StoryProp, StorySFX, BgMotion, Song, Challenge } from '../types'

export const KOCEE_DEMO_SONG: Song = {
  id: '11111111-koce-0000-0000-000000000001',
  artist_id: '00000000-0000-0000-0000-000000000009',
  artist_name: 'Kocee',
  title: 'We Di Go Na Go',
  genre: 'Afropop / Makossa',
  language: 'Pidgin',
  clip_url: '/assets/audio/kocee_we_di_go_na_go.mp3',
  duration_sec: 156,
  bpm: 118,
  status: 'trending',
  trending_score: 99.8,
  artist: {
    id: '00000000-0000-0000-0000-000000000009',
    phone: '+237670000099',
    display_name: 'Kocee',
    region: 'Southwest',
    role: 'artist',
    artist_profile: {
      user_id: '00000000-0000-0000-0000-000000000009',
      artist_name: 'Kocee',
      verification_status: 'approved',
    },
  },
}

export const KOCEE_DEMO_CHALLENGE: Challenge = {
  id: '22222222-koce-0000-0000-000000000001',
  song_id: KOCEE_DEMO_SONG.id,
  song: KOCEE_DEMO_SONG,
  status: 'active',
  ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  creations_count: 14,
}

export interface StoryTemplate {
  id: string
  title: string
  subtitle: string
  genre: 'Drama' | 'Comedy' | 'Romance'
  tag: string
  icon: string
  description: string
  characterAId: 'tantie' | 'mboa_boy' | 'pa_buea'
  characterBId: 'tantie' | 'mboa_boy' | 'pa_buea' | null
  scenes: MoveBlock[]
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'unexpected_message',
    title: 'The Unexpected Message',
    subtitle: 'Midnight WhatsApp drama in Buea',
    genre: 'Drama',
    tag: 'Betrayal / Drama',
    icon: '📱',
    description: 'Tantie discovers a suspicious late-night WhatsApp text on Mboa Boy\'s phone with shocking emojis.',
    characterAId: 'tantie',
    characterBId: 'mboa_boy',
    scenes: [
      {
        start: 0,
        end: 6,
        action: 'walk_in',
        charA_action: 'walk_in',
        charB_action: 'turn_around',
        bg: 'street_buea',
        bgMotion: 'scroll_right',
        prop: 'phone',
        sfx: 'phone_ding',
        dialogueA: 'Wait... who is sending a message at midnight?!',
        dialogueB: 'Whistling fine fine... 🎵',
      },
      {
        start: 6,
        end: 12,
        action: 'approach',
        charA_action: 'approach',
        charB_action: 'wave_happy',
        bg: 'living_room',
        bgMotion: 'static',
        prop: 'phone',
        sfx: 'gasp',
        dialogueA: 'Mboa Boy! Who is "Pascaline ❤️" on your WhatsApp?!',
        dialogueB: 'Tantie wait! She is just our study group prefect!',
      },
      {
        start: 12,
        end: 18,
        action: 'angry_argue',
        charA_action: 'angry_argue',
        charB_action: 'shocked',
        bg: 'living_room',
        bgMotion: 'zoom_in',
        prop: 'none',
        sfx: 'gasp',
        dialogueA: 'Study group with kiss emojis?! Ashia for you today!',
        dialogueB: 'Chai! No vex Tantie, she was thanking me for the notes!',
      },
      {
        start: 18,
        end: 24,
        action: 'walk_away',
        charA_action: 'walk_away',
        charB_action: 'cry_sad',
        bg: 'street_buea',
        bgMotion: 'scroll_left',
        prop: 'none',
        sfx: 'comedy_slip',
        dialogueA: 'I am packing my bags for Douala! Level don change!',
        dialogueB: 'Ma life don spoil! Tantie please forgive me! 😭',
      },
    ],
  },
  {
    id: 'tanties_slip',
    title: "Tantie's Slip",
    subtitle: 'The great market day banana peel incident',
    genre: 'Comedy',
    tag: 'Classic Comedy',
    icon: '🍌',
    description: 'Tantie returns from the Buea market counting her profits before an unexpected encounter with a plantain peel.',
    characterAId: 'tantie',
    characterBId: 'mboa_boy',
    scenes: [
      {
        start: 0,
        end: 6,
        action: 'walk_in',
        charA_action: 'walk_in',
        charB_action: 'turn_around',
        bg: 'street_buea',
        bgMotion: 'scroll_right',
        prop: 'gift_box',
        sfx: 'none',
        dialogueA: 'Market sweet today! Plenty money dey for bag! 💰',
        dialogueB: 'Mboa boy chilling by the corner... 😎',
      },
      {
        start: 6,
        end: 12,
        action: 'approach',
        charA_action: 'approach',
        charB_action: 'shocked',
        bg: 'street_buea',
        bgMotion: 'static',
        prop: 'none',
        sfx: 'gasp',
        dialogueA: 'Mboa Boy, see fresh fish I buy for dinner tonight!',
        dialogueB: 'Tantie watch out! That plantain peel on the road!',
      },
      {
        start: 12,
        end: 18,
        action: 'slip_fall',
        charA_action: 'slip_fall',
        charB_action: 'shocked',
        bg: 'street_buea',
        bgMotion: 'zoom_in',
        prop: 'none',
        sfx: 'comedy_slip',
        dialogueA: 'Yéééé! Ma waist o! Ground don hold me tight! 💥',
        dialogueB: 'Chai! Tantie take heart! Are you okay?!',
      },
      {
        start: 18,
        end: 24,
        action: 'celebrate',
        charA_action: 'angry_argue',
        charB_action: 'laugh',
        bg: 'chop_house',
        bgMotion: 'static',
        prop: 'table',
        sfx: 'applause',
        dialogueA: 'If you laugh me again, no Ndole for you tonight!',
        dialogueB: 'No stress Tantie! You still dance the best Makossa! 🔥',
      },
    ],
  },
  {
    id: 'buea_proposal',
    title: 'Buea Proposal',
    subtitle: 'Royal Makossa romance under Mount Cameroon',
    genre: 'Romance',
    tag: 'Royal Romance',
    icon: '💍',
    description: 'Pa Buea takes Tantie to the scenic mountain park at sunset with a surprise that will change everything.',
    characterAId: 'tantie',
    characterBId: 'pa_buea',
    scenes: [
      {
        start: 0,
        end: 6,
        action: 'walk_in',
        charA_action: 'walk_in',
        charB_action: 'approach',
        bg: 'park_sunset',
        bgMotion: 'scroll_right',
        prop: 'none',
        sfx: 'none',
        dialogueA: 'Buea mountain air is so romantic this evening...',
        dialogueB: 'Tantie my love, walk with me under the royal palms.',
      },
      {
        start: 6,
        end: 12,
        action: 'wave_happy',
        charA_action: 'wave_happy',
        charB_action: 'approach',
        bg: 'park_sunset',
        bgMotion: 'static',
        prop: 'gift_box',
        sfx: 'phone_ding',
        dialogueA: 'Pa Buea, what is that sparkling box inside your tunic?',
        dialogueB: 'A treasure fit only for the queen of my heart.',
      },
      {
        start: 12,
        end: 18,
        action: 'kneel',
        charA_action: 'shocked',
        charB_action: 'kneel',
        bg: 'park_sunset',
        bgMotion: 'zoom_in',
        prop: 'gift_box',
        sfx: 'gasp',
        dialogueA: 'Ekié! Pa Buea! You are down on your knee?! 😱',
        dialogueB: 'Will you marry me and dance Makossa forever with me?',
      },
      {
        start: 18,
        end: 24,
        action: 'celebrate',
        charA_action: 'celebrate',
        charB_action: 'celebrate',
        bg: 'park_sunset',
        bgMotion: 'static',
        prop: 'none',
        sfx: 'applause',
        dialogueA: 'YES! A thousand times YES! Dis beat sweet! ❤️',
        dialogueB: 'Level don change! Let the wedding drums roll! 🇨🇲',
      },
    ],
  },
]

export const STORY_ACTIONS: { id: StoryAction; label: string; icon: string; desc: string }[] = [
  { id: 'walk_in', label: 'Walk In', icon: '🚶‍♂️', desc: 'Glides in from off-stage' },
  { id: 'approach', label: 'Approach', icon: '👉', desc: 'Steps closer to partner' },
  { id: 'walk_away', label: 'Walk Away', icon: '🚪', desc: 'Turns and leaves scene' },
  { id: 'turn_around', label: 'Turn Around', icon: '🔄', desc: 'Flips horizontal direction' },
  { id: 'slip_fall', label: 'Slip & Fall', icon: '🍌', desc: '90° comedic fall + bounce' },
  { id: 'kneel', label: 'Kneel', icon: '🧎‍♂️', desc: 'Proposal or begging pose' },
  { id: 'wave_happy', label: 'Wave', icon: '👋', desc: 'Cheerful greeting wave' },
  { id: 'shocked', label: 'Shocked', icon: '😱', desc: 'Jumps back in disbelief' },
  { id: 'angry_argue', label: 'Argue', icon: '😤', desc: 'Aggressive lean + shake' },
  { id: 'cry_sad', label: 'Cry Sad', icon: '😭', desc: 'Slumped in sorrow' },
  { id: 'laugh', label: 'Laugh', icon: '😂', desc: 'Rhythmic shoulder belly bounce' },
  { id: 'celebrate', label: 'Celebrate', icon: '🎉', desc: 'Triumphant victory jump' },
  // Dance moves
  { id: 'sway', label: 'Sway', icon: '🕺', desc: 'Classic hip groove' },
  { id: 'stomp', label: 'Stomp', icon: '👞', desc: 'Ground beat impact' },
  { id: 'jump', label: 'Jump', icon: '🦘', desc: 'High energy hop' },
  { id: 'flex', label: 'Flex', icon: '💪', desc: 'Swagger muscle pump' },
]

export const STORY_BACKGROUNDS: { id: StoryBackground; label: string; icon: string; desc: string }[] = [
  { id: 'street_buea', label: 'Buea Street', icon: '🌋', desc: 'Town street & Mount Cameroon' },
  { id: 'living_room', label: 'Living Room', icon: '🛋️', desc: 'Cozy Cameroonian home parlor' },
  { id: 'chop_house', label: 'Chop House', icon: '🍲', desc: 'Local bar & restaurant' },
  { id: 'park_sunset', label: 'Park Sunset', icon: '🌅', desc: 'Botanical mountain park' },
  // Legacy swatches
  { id: 'sage_starburst', label: 'Sage Starburst', icon: '✨', desc: 'Muted olive + coral burst' },
  { id: 'amber_sunset', label: 'Amber Sunset', icon: '🌄', desc: 'Savanna acacia glow' },
  { id: 'slate_night', label: 'Slate Night', icon: '🌃', desc: 'Cyber club spotlights' },
  { id: 'lavender_haze', label: 'Lavender Haze', icon: '💜', desc: 'Soft neon stage' },
]

export const BG_MOTIONS: { id: BgMotion; label: string; icon: string }[] = [
  { id: 'static', label: 'Static Camera', icon: '⏹️' },
  { id: 'scroll_left', label: 'Walk Left (Parallax)', icon: '◀️' },
  { id: 'scroll_right', label: 'Walk Right (Parallax)', icon: '▶️' },
  { id: 'zoom_in', label: 'Dramatic Zoom', icon: '🔍' },
]

export const STORY_PROPS: { id: StoryProp; label: string; icon: string }[] = [
  { id: 'none', label: 'No Prop', icon: '✖️' },
  { id: 'phone', label: 'Smartphone', icon: '📱' },
  { id: 'gift_box', label: 'Gift Box', icon: '🎁' },
  { id: 'table', label: 'Café Table', icon: '☕' },
  { id: 'car', label: 'Yellow Taxi', icon: '🚕' },
]

export const STORY_SFX_LIST: { id: StorySFX; label: string; icon: string }[] = [
  { id: 'none', label: 'No SFX', icon: '🔇' },
  { id: 'phone_ding', label: 'Phone Ding', icon: '🔔' },
  { id: 'gasp', label: 'Gasp!', icon: '😲' },
  { id: 'comedy_slip', label: 'Cartoon Slip', icon: '🍌' },
  { id: 'applause', label: 'Crowd Applause', icon: '👏' },
]

