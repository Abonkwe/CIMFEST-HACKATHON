-- =============================================================================
-- BeatToons Demo Seed Data
-- CIMFEST Hackathon 2026 - Track 2: Music & Entertainment Tech
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. USERS
-- 1 admin user, 3 verified artists, and 3 fan_creator users across Cameroon regions
-- -----------------------------------------------------------------------------
INSERT INTO users (id, phone, display_name, region, role)
VALUES
  -- Admin
  ('00000000-0000-0000-0000-000000000001', '+237670000001', 'Admin BeatToons', 'Centre', 'admin'),
  -- Artists
  ('00000000-0000-0000-0000-000000000002', '+237671112233', 'Petit Pays Jr', 'Littoral', 'artist'),
  ('00000000-0000-0000-0000-000000000003', '+237672223344', 'Lady Ponce Fanatic', 'Centre', 'artist'),
  ('00000000-0000-0000-0000-000000000004', '+237673334455', 'Buea SoundBoy', 'Southwest', 'artist'),
  -- Fan / Creators
  ('00000000-0000-0000-0000-000000000005', '+237674445566', 'Kumba Dancer', 'Southwest', 'fan_creator'),
  ('00000000-0000-0000-0000-000000000006', '+237675556677', 'Bonaberi Vibe', 'Littoral', 'fan_creator'),
  ('00000000-0000-0000-0000-000000000007', '+237676667788', 'Mvolyé Groover', 'Centre', 'fan_creator')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. ARTIST PROFILES
-- 3 verified artist users with verification_status = 'approved'
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  has_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artist_profiles' AND column_name = 'id'
  ) INTO has_id;

  IF has_id THEN
    EXECUTE 'INSERT INTO artist_profiles (id, user_id, artist_name, links, verification_status, reviewed_by, reviewed_at)
             VALUES 
               (''00000000-0000-0000-0000-000000000002'', ''00000000-0000-0000-0000-000000000002'', ''Petit Pays Jr'', ''https://instagram.com/petitpaysjr'', ''approved'', ''00000000-0000-0000-0000-000000000001'', now()),
               (''00000000-0000-0000-0000-000000000003'', ''00000000-0000-0000-0000-000000000003'', ''Lady Ponce Fanatic'', ''https://facebook.com/ladyponcefanatic'', ''approved'', ''00000000-0000-0000-0000-000000000001'', now()),
               (''00000000-0000-0000-0000-000000000004'', ''00000000-0000-0000-0000-000000000004'', ''Buea SoundBoy'', ''https://youtube.com/@bueasoundboy'', ''approved'', ''00000000-0000-0000-0000-000000000001'', now())
             ON CONFLICT DO NOTHING';
  ELSE
    EXECUTE 'INSERT INTO artist_profiles (user_id, artist_name, links, verification_status, reviewed_by, reviewed_at)
             VALUES 
               (''00000000-0000-0000-0000-000000000002'', ''Petit Pays Jr'', ''https://instagram.com/petitpaysjr'', ''approved'', ''00000000-0000-0000-0000-000000000001'', now()),
               (''00000000-0000-0000-0000-000000000003'', ''Lady Ponce Fanatic'', ''https://facebook.com/ladyponcefanatic'', ''approved'', ''00000000-0000-0000-0000-000000000001'', now()),
               (''00000000-0000-0000-0000-000000000004'', ''Buea SoundBoy'', ''https://youtube.com/@bueasoundboy'', ''approved'', ''00000000-0000-0000-0000-000000000001'', now())
             ON CONFLICT DO NOTHING';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. SONGS
-- 3 songs with status = 'trending' (Makossa, Bikutsi, Afropop) and 1 with status = 'fresh'
-- -----------------------------------------------------------------------------
INSERT INTO songs (id, artist_id, title, genre, language, clip_url, duration_sec, bpm, status, trending_score)
VALUES
  (
    '11111111-1111-1111-1111-111111110001',
    '00000000-0000-0000-0000-000000000002',
    'Douala Makossa Pulse',
    'Makossa',
    'Duala',
    'https://assets.beattoons.app/audio/douala_makossa.mp3',
    24,
    115,
    'trending',
    96.5
  ),
  (
    '11111111-1111-1111-1111-111111110002',
    '00000000-0000-0000-0000-000000000003',
    'Yaoundé Bikutsi Storm',
    'Bikutsi',
    'Ewondo',
    'https://assets.beattoons.app/audio/yaounde_bikutsi.mp3',
    20,
    130,
    'trending',
    89.0
  ),
  (
    '11111111-1111-1111-1111-111111110003',
    '00000000-0000-0000-0000-000000000004',
    'Mboa Level Up',
    'Afropop',
    'English',
    'https://assets.beattoons.app/audio/mboa_level_up.mp3',
    27,
    104,
    'trending',
    92.8
  ),
  (
    '11111111-1111-1111-1111-111111110004',
    '00000000-0000-0000-0000-000000000004',
    'Kumba Sun Fresh',
    'Afropop',
    'Pidgin',
    'https://assets.beattoons.app/audio/kumba_sun.mp3',
    18,
    108,
    'fresh',
    14.2
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. CHALLENGES
-- 1 active challenge (status = 'active', ends_at = now() + interval '48 hours')
-- linked to trending song 1 (Douala Makossa Pulse)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  has_starts_at boolean;
  has_start_time boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'starts_at'
  ) INTO has_starts_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'start_time'
  ) INTO has_start_time;

  IF has_starts_at THEN
    EXECUTE 'INSERT INTO challenges (id, song_id, status, starts_at, ends_at)
             VALUES (''22222222-2222-2222-2222-222222220001'', ''11111111-1111-1111-1111-111111110001'', ''active'', now(), now() + interval ''48 hours'')
             ON CONFLICT (id) DO NOTHING';
  ELSIF has_start_time THEN
    EXECUTE 'INSERT INTO challenges (id, song_id, status, start_time, ends_at)
             VALUES (''22222222-2222-2222-2222-222222220001'', ''11111111-1111-1111-1111-111111110001'', ''active'', now(), now() + interval ''48 hours'')
             ON CONFLICT (id) DO NOTHING';
  ELSE
    EXECUTE 'INSERT INTO challenges (id, song_id, status, ends_at)
             VALUES (''22222222-2222-2222-2222-222222220001'', ''11111111-1111-1111-1111-111111110001'', ''active'', now() + interval ''48 hours'')
             ON CONFLICT (id) DO NOTHING';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. CREATIONS
-- 3 sample creations linked to active challenge with sample JSON moves_timeline arrays
-- and English, French, Pidgin captions
-- -----------------------------------------------------------------------------
INSERT INTO creations (id, challenge_id, creator_id, character, moves_timeline, caption, views)
VALUES
  (
    '33333333-3333-3333-3333-333333330001',
    '22222222-2222-2222-2222-222222220001',
    '00000000-0000-0000-0000-000000000005',
    'KmerBoy',
    '[{"start": 0.0, "end": 2.5, "action": "sway"}, {"start": 2.5, "end": 5.0, "action": "footwork"}, {"start": 5.0, "end": 7.5, "action": "spin"}]'::jsonb,
    'Feel the Douala energy! Vote for my rhythm moves!',
    245
  ),
  (
    '33333333-3333-3333-3333-333333330002',
    '22222222-2222-2222-2222-222222220001',
    '00000000-0000-0000-0000-000000000006',
    'MboaGirl',
    '[{"start": 0.0, "end": 2.0, "action": "intro_pose"}, {"start": 2.0, "end": 4.5, "action": "sway"}, {"start": 4.5, "end": 7.0, "action": "jump_beat"}]'::jsonb,
    'La cadence du 237 ne ment jamais! On est ensemble!',
    189
  ),
  (
    '33333333-3333-3333-3333-333333330003',
    '22222222-2222-2222-2222-222222220001',
    '00000000-0000-0000-0000-000000000007',
    'ToonDancer',
    '[{"start": 0.0, "end": 3.0, "action": "footwork"}, {"start": 3.0, "end": 5.5, "action": "spin"}, {"start": 5.5, "end": 8.0, "action": "sway"}]'::jsonb,
    'Dis Makossa beat sweet die! Make una push this creation to number one!',
    310
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. VOTES
-- Initial rows in votes table
-- -----------------------------------------------------------------------------
INSERT INTO votes (id, creation_id, user_id)
VALUES
  ('44444444-4444-4444-4444-444444440001', '33333333-3333-3333-3333-333333330001', '00000000-0000-0000-0000-000000000006'),
  ('44444444-4444-4444-4444-444444440002', '33333333-3333-3333-3333-333333330001', '00000000-0000-0000-0000-000000000007'),
  ('44444444-4444-4444-4444-444444440003', '33333333-3333-3333-3333-333333330002', '00000000-0000-0000-0000-000000000005'),
  ('44444444-4444-4444-4444-444444440004', '33333333-3333-3333-3333-333333330003', '00000000-0000-0000-0000-000000000005')
ON CONFLICT (id) DO NOTHING;

