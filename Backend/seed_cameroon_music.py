"""Seed Supabase with 25 Cameroonian artists (15 trending, 10 fresh),
real playable 30s audio previews & albums from the iTunes Search API,
and active challenges for Kocee, Libianca, Blanche Bailly, and Cysoul.

Usage (from /backend):
    uv run python seed_cameroon_music.py
"""

from __future__ import annotations

import json
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from db import get_supabase_client

FALLBACK_CLIP_URL = "/assets/audio/we-di-go-na-go.mp3"
ITUNES_SEARCH_URL = "https://itunes.apple.com/search"
UUID_NAMESPACE = uuid.UUID("a3f1c8e2-7b4d-4e9a-9c21-237bea770000")

GENRE_BPM: Dict[str, int] = {
    "Bikutsi": 128,
    "Makossa": 118,
    "Afropop": 112,
    "Afrobeats": 108,
    "Hip Hop": 96,
}

# 15 Major / Trending Artists (status = "trending")
# 10 Upcoming / Rising Artists (status = "fresh")
ARTIST_ROSTER: List[Dict[str, Any]] = [
    # --- 15 Major / Trending Artists ---
    {
        "stage_name": "Kocee",
        "region": "Littoral",
        "genre": "Afropop",
        "language": "Pidgin/EN",
        "status": "trending",
        "targets": ["We Di Go Na Go", "JIGI"],
        "album_hint": "We Di Go Na Go",
        "bio": "Douala hitmaker blending Afropop, Mbolé rhythms, and infectious Pidgin hooks.",
    },
    {
        "stage_name": "Libianca",
        "region": "Northwest",
        "genre": "Afrobeats",
        "language": "English",
        "status": "trending",
        "targets": ["People", "DISTANCE"],
        "album_hint": "Walk Away",
        "bio": "Cameroonian-American Afrobeats sensation known globally for soulful vocals.",
    },
    {
        "stage_name": "Blanche Bailly",
        "region": "Southwest",
        "genre": "Afropop",
        "language": "French/Pidgin",
        "status": "trending",
        "targets": ["Lève Toi", "Mine"],
        "album_hint": "Authentik",
        "bio": "Buea-born Afropop queen delivering high-energy anthems across Cameroon.",
    },
    {
        "stage_name": "Locko",
        "region": "Centre",
        "genre": "Afropop",
        "language": "French",
        "status": "trending",
        "targets": ["Mêmes mêmes choses", "Sawa Romance"],
        "album_hint": "Locked Up",
        "bio": "Yaoundé R&B and Afropop star celebrated for smooth melodies and acoustic flair.",
    },
    {
        "stage_name": "Cysoul",
        "region": "Littoral",
        "genre": "Makossa",
        "language": "French",
        "status": "trending",
        "targets": ["Kidnappé", "Koulos"],
        "album_hint": "Redemption",
        "bio": "Modern Makossa & Afro-soul storyteller from Douala.",
    },
    {
        "stage_name": "Stanley Enow",
        "region": "Southwest",
        "genre": "Hip Hop",
        "language": "Pidgin/EN",
        "status": "trending",
        "targets": ["Hein Père", "My Way"],
        "album_hint": "Soldier Like My Papa",
        "bio": "King Kong of Cameroonian Hip Hop and pioneer of modern 237 rap.",
    },
    {
        "stage_name": "Charlotte Dipanda",
        "region": "Littoral",
        "genre": "Makossa",
        "language": "French/Duala",
        "status": "trending",
        "targets": ["Coucou", "Sista"],
        "album_hint": "CD",
        "bio": "Iconic Cameroonian acoustic and Makossa vocalist with timeless storytelling.",
    },
    {
        "stage_name": "Salatiel",
        "region": "Northwest",
        "genre": "Afropop",
        "language": "Pidgin/EN",
        "status": "trending",
        "targets": ["Anita", "Toi et Moi"],
        "album_hint": "Africa Represented",
        "bio": "Producer and Afropop hitmaker behind Alpha Better Records.",
    },
    {
        "stage_name": "Mr Leo",
        "region": "Southwest",
        "genre": "Afropop",
        "language": "Pidgin/EN",
        "status": "trending",
        "targets": ["On Va Gérer", "Jamais Jamais"],
        "album_hint": "Love Original",
        "bio": "Beloved Buea vocalist fusing Afropop, dancehall, and Cameroonian soul.",
    },
    {
        "stage_name": "Daphne",
        "region": "Southwest",
        "genre": "Afropop",
        "language": "Pidgin/FR",
        "status": "trending",
        "targets": ["Calée", "Jusqu'à la Gare"],
        "album_hint": "Here to Stay",
        "bio": "Chart-topping Cameroonian songstress known for 'Calée' and vibrant stagecraft.",
    },
    {
        "stage_name": "Tenor",
        "region": "Centre",
        "genre": "Hip Hop",
        "language": "French",
        "status": "trending",
        "targets": ["Do Le Dab", "Bahatisha"],
        "album_hint": "Terre Promise",
        "bio": "Yaoundé rap trailblazer bringing Francophone trap and street energy.",
    },
    {
        "stage_name": "Lady Ponce",
        "region": "Centre",
        "genre": "Bikutsi",
        "language": "French/Ewondo",
        "status": "trending",
        "targets": ["Le Ventre et le Bas-Ventre"],
        "album_hint": "Suprême",
        "bio": "Reigning queen of Bikutsi with electrifying Centre-region rhythms.",
    },
    {
        "stage_name": "Minks",
        "region": "Littoral",
        "genre": "Hip Hop",
        "language": "French",
        "status": "trending",
        "targets": ["Le Gars Là Est Laid"],
        "album_hint": "Le Gars Là",
        "bio": "Witty Douala rapper known for sharp humor and viral street anthems.",
    },
    {
        "stage_name": "Rinyu",
        "region": "Northwest",
        "genre": "Afropop",
        "language": "English/Pidgin",
        "status": "trending",
        "targets": ["Friendzone"],
        "album_hint": "Black Butterfly",
        "bio": "Rising Northwest Afropop voice blending soulful hooks and Pidgin storytelling.",
    },
    {
        "stage_name": "Magasco",
        "region": "Northwest",
        "genre": "Afropop",
        "language": "Pidgin/EN",
        "status": "trending",
        "targets": ["Wule Bang Bang"],
        "album_hint": "Heart Robber",
        "bio": "Bamenda Boy bringing dancehall-infused Afropop energy.",
    },
    # --- 10 Upcoming / Rising Artists (status = "fresh") ---
    {
        "stage_name": "Vanister Enama",
        "region": "Centre",
        "genre": "Bikutsi",
        "language": "French",
        "status": "fresh",
        "targets": ["Conduis Moi", "Je balaie"],
        "bio": "Fresh Centre-region Bikutsi talent lighting up Yaoundé dancefloors.",
    },
    {
        "stage_name": "King Luca",
        "region": "Littoral",
        "genre": "Afropop",
        "language": "French",
        "status": "fresh",
        "targets": ["Fragile"],
        "bio": "Emerging Douala Afropop vocalist with smooth melodic hooks.",
    },
    {
        "stage_name": "PhillBill",
        "region": "Littoral",
        "genre": "Afropop",
        "language": "French",
        "status": "fresh",
        "targets": ["Malova"],
        "bio": "Douala Afropop riser blending urban grooves and coastal vibes.",
    },
    {
        "stage_name": "Kameni",
        "region": "West",
        "genre": "Afropop",
        "language": "Pidgin/FR",
        "status": "fresh",
        "targets": ["My Baby"],
        "bio": "West-region powerhouse vocalist fusing Afropop and soulful R&B.",
    },
    {
        "stage_name": "Krys M",
        "region": "Centre",
        "genre": "Afropop",
        "language": "French",
        "status": "fresh",
        "targets": ["Chacun Sa Chance"],
        "bio": "Yaoundé breakout star captivating fans with inspirational Afropop.",
    },
    {
        "stage_name": "Mimie",
        "region": "Southwest",
        "genre": "Afropop",
        "language": "French/Pidgin",
        "status": "fresh",
        "targets": ["Dona"],
        "bio": "Southwest Afropop singer-songwriter with vibrant rhythms.",
    },
    {
        "stage_name": "Gomez",
        "region": "Littoral",
        "genre": "Hip Hop",
        "language": "French",
        "status": "fresh",
        "targets": ["Waka"],
        "bio": "Douala street-hop voice bringing raw energy to the Fresh pool.",
    },
    {
        "stage_name": "Aveiro Djess",
        "region": "Centre",
        "genre": "Afropop",
        "language": "French",
        "status": "fresh",
        "targets": ["Ma Go"],
        "bio": "Yaoundé Afropop crooner with infectious danceable beats.",
    },
    {
        "stage_name": "Nabila",
        "region": "Centre",
        "genre": "Afropop",
        "language": "French",
        "status": "fresh",
        "targets": ["Mon Choix"],
        "bio": "Rising Centre-region Afropop artist with a dedicated fan base.",
    },
    {
        "stage_name": "Petit Bozard",
        "region": "Littoral",
        "genre": "Afropop",
        "language": "French",
        "status": "fresh",
        "targets": ["Mbolé"],
        "bio": "Douala Mbolé & Afropop innovator driving viral street dances.",
    },
]

CHALLENGE_SPECS: List[Tuple[str, str]] = [
    ("Kocee", "We Di Go Na Go"),
    ("Libianca", "People"),
    ("Blanche Bailly", "Lève Toi"),
    ("Cysoul", "Kidnappé"),
]


def deterministic_uuid(kind: str, *parts: str) -> str:
    key = ":".join([kind] + [p.strip().lower() for p in parts])
    return str(uuid.uuid5(UUID_NAMESPACE, key))


def normalize_text(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text or "")
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    return " ".join(ascii_str.lower().strip().split())


def clean_album_name(collection_name: Optional[str]) -> str:
    if not collection_name:
        return "Single"
    cleaned = collection_name.strip()
    if not cleaned or cleaned.lower().endswith("- single") or cleaned.lower().endswith("– single"):
        return "Single"
    return cleaned


def upgrade_artwork_url(artwork_url: Optional[str]) -> Optional[str]:
    if not artwork_url:
        return None
    return artwork_url.replace("100x100bb.jpg", "300x300bb.jpg")


def itunes_search(term: str, limit: int = 3) -> List[Dict[str, Any]]:
    params = urllib.parse.urlencode({
        "term": term,
        "media": "music",
        "entity": "song",
        "limit": limit,
    })
    url = f"{ITUNES_SEARCH_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "BeatToonsSeeder/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            return payload.get("results", []) or []
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return []


def pick_best_track_match(
    results: List[Dict[str, Any]],
    artist_name: str,
    target_track: str,
) -> Optional[Dict[str, Any]]:
    if not results:
        return None

    norm_artist = normalize_text(artist_name)
    norm_track = normalize_text(target_track)

    # 1. Exact/substring match on both artist and track with previewUrl
    for r in results:
        r_artist = normalize_text(r.get("artistName", ""))
        r_track = normalize_text(r.get("trackName", ""))
        if norm_artist in r_artist and norm_track in r_track and r.get("previewUrl"):
            return r

    # 2. Match on artist with previewUrl
    for r in results:
        r_artist = normalize_text(r.get("artistName", ""))
        if norm_artist in r_artist and r.get("previewUrl"):
            return r

    # 3. Match on track with previewUrl
    for r in results:
        r_track = normalize_text(r.get("trackName", ""))
        if norm_track in r_track and r.get("previewUrl"):
            return r

    return None


def fetch_album_tracks_for_artist(
    artist_name: str,
    album_hint: str,
    existing_titles: set[str],
    max_tracks: int = 3,
) -> List[Dict[str, Any]]:
    """Fetch 2-3 tracks belonging to a real multi-track album/EP for a major artist."""
    results = itunes_search(f"{artist_name} {album_hint}", limit=10)
    if not results:
        results = itunes_search(artist_name, limit=10)

    norm_artist = normalize_text(artist_name)
    by_album: Dict[str, List[Dict[str, Any]]] = {}

    for r in results:
        r_artist = normalize_text(r.get("artistName", ""))
        if norm_artist not in r_artist:
            continue
        album = clean_album_name(r.get("collectionName"))
        if album == "Single":
            continue
        title = (r.get("trackName") or "").strip()
        if not title or normalize_text(title) in existing_titles:
            continue
        if not r.get("previewUrl"):
            continue
        by_album.setdefault(album, []).append(r)

    if not by_album:
        return []

    # Pick the album with the most available tracks (at least 2 if possible)
    best_album = max(by_album.keys(), key=lambda k: len(by_album[k]))
    selected: List[Dict[str, Any]] = []
    seen_norm_titles = set(existing_titles)

    for r in by_album[best_album]:
        t = (r.get("trackName") or "").strip()
        nt = normalize_text(t)
        if nt in seen_norm_titles:
            continue
        seen_norm_titles.add(nt)
        selected.append(r)
        if len(selected) >= max_tracks:
            break

    return selected


def main() -> None:
    client = get_supabase_client()
    now = datetime.now(timezone.utc)

    user_rows: List[Dict[str, Any]] = []
    artist_profile_rows: List[Dict[str, Any]] = []
    song_rows: List[Dict[str, Any]] = []
    song_lookup: Dict[Tuple[str, str], str] = {}

    trending_artists = [a for a in ARTIST_ROSTER if a["status"] == "trending"]
    fresh_artists = [a for a in ARTIST_ROSTER if a["status"] == "fresh"]

    total_itunes_previews = 0
    total_fallbacks = 0
    album_names_seen: set[str] = set()
    singles_count = 0

    print("Fetching Cameroonian music catalog from iTunes Search API...\n")

    for idx, artist in enumerate(ARTIST_ROSTER, start=1):
        stage_name = artist["stage_name"]
        artist_id = deterministic_uuid("artist", stage_name)
        phone = f"+23768000{idx:04d}"
        genre = artist["genre"]
        bpm = GENRE_BPM.get(genre, 112)
        status = artist["status"]

        # Trending score: 99 down to 70 for trending, 65 down to 40 for fresh
        if status == "trending":
            t_idx = next(i for i, a in enumerate(trending_artists) if a["stage_name"] == stage_name)
            base_score = round(99.0 - (t_idx * (29.0 / max(len(trending_artists) - 1, 1))), 1)
        else:
            f_idx = next(i for i, a in enumerate(fresh_artists) if a["stage_name"] == stage_name)
            base_score = round(65.0 - (f_idx * (25.0 / max(len(fresh_artists) - 1, 1))), 1)

        avatar_url: Optional[str] = None
        added_norm_titles: set[str] = set()
        artist_songs_temp: List[Dict[str, Any]] = []

        for t_offset, target_track in enumerate(artist["targets"]):
            query = f"{stage_name} {target_track}"
            results = itunes_search(query, limit=3)
            match = pick_best_track_match(results, stage_name, target_track)

            # Special handling: keep exact target title for Kocee's challenge track if needed
            if match:
                matched_title = (match.get("trackName") or target_track).strip()
                # If this is Kocee's "We Di Go Na Go", preserve that title if iTunes returned a different track
                if stage_name == "Kocee" and target_track == "We Di Go Na Go" and "go na go" not in normalize_text(matched_title):
                    title = "We Di Go Na Go"
                    album_name = "Single"
                    clip_url = FALLBACK_CLIP_URL
                else:
                    title = matched_title
                    album_name = clean_album_name(match.get("collectionName"))
                    clip_url = match.get("previewUrl") or FALLBACK_CLIP_URL

                if not avatar_url and match.get("artworkUrl100"):
                    avatar_url = upgrade_artwork_url(match.get("artworkUrl100"))
            else:
                title = target_track
                album_name = "Single"
                clip_url = FALLBACK_CLIP_URL

            # Grab avatar from general artist search if still missing
            if not avatar_url:
                fallback_res = itunes_search(stage_name, limit=3)
                for r in fallback_res:
                    if normalize_text(stage_name) in normalize_text(r.get("artistName", "")) and r.get("artworkUrl100"):
                        avatar_url = upgrade_artwork_url(r.get("artworkUrl100"))
                        break

            norm_t = normalize_text(title)
            if norm_t in added_norm_titles:
                continue
            added_norm_titles.add(norm_t)

            if clip_url == FALLBACK_CLIP_URL:
                total_fallbacks += 1
            else:
                total_itunes_previews += 1

            if album_name == "Single":
                singles_count += 1
            else:
                album_names_seen.add(f"{stage_name}::{album_name}")

            song_id = deterministic_uuid("song", stage_name, title)
            song_score = round(max(base_score - (t_offset * 0.4), 1.0), 1)
            artist_songs_temp.append({
                "id": song_id,
                "artist_id": artist_id,
                "title": title,
                "album_name": album_name,
                "genre": genre,
                "language": artist["language"],
                "clip_url": clip_url,
                "duration_sec": 25,
                "bpm": bpm,
                "status": status,
                "trending_score": song_score,
            })
            song_lookup[(stage_name, target_track)] = song_id
            song_lookup[(stage_name, title)] = song_id
            time.sleep(0.08)

        # Fetch 2-3 tracks from one real album for major (trending) artists
        if status == "trending" and artist.get("album_hint"):
            album_tracks = fetch_album_tracks_for_artist(
                stage_name,
                artist["album_hint"],
                added_norm_titles,
                max_tracks=3,
            )
            for a_offset, r in enumerate(album_tracks):
                a_title = (r.get("trackName") or "").strip()
                a_album = clean_album_name(r.get("collectionName"))
                a_clip = r.get("previewUrl") or FALLBACK_CLIP_URL
                if not a_title:
                    continue
                if not avatar_url and r.get("artworkUrl100"):
                    avatar_url = upgrade_artwork_url(r.get("artworkUrl100"))

                if a_clip == FALLBACK_CLIP_URL:
                    total_fallbacks += 1
                else:
                    total_itunes_previews += 1

                if a_album == "Single":
                    singles_count += 1
                else:
                    album_names_seen.add(f"{stage_name}::{a_album}")

                a_song_id = deterministic_uuid("song", stage_name, a_title)
                a_score = round(max(base_score - 1.0 - (a_offset * 0.3), 70.0), 1)
                artist_songs_temp.append({
                    "id": a_song_id,
                    "artist_id": artist_id,
                    "title": a_title,
                    "album_name": a_album,
                    "genre": genre,
                    "language": artist["language"],
                    "clip_url": a_clip,
                    "duration_sec": 25,
                    "bpm": bpm,
                    "status": status,
                    "trending_score": a_score,
                })
                song_lookup[(stage_name, a_title)] = a_song_id
            time.sleep(0.08)

        user_rows.append({
            "id": artist_id,
            "phone": phone,
            "display_name": stage_name,
            "region": artist["region"],
            "role": "artist",
            "is_suspended": False,
        })

        artist_profile_rows.append({
            "user_id": artist_id,
            "artist_name": stage_name,
            "verification_status": "approved",
            "country_of_residence": "Cameroon",
            "primary_genre": genre,
            "bio": artist["bio"],
            "avatar_url": avatar_url,
            "social_links": {},
            "release_links": [],
        })

        song_rows.extend(artist_songs_temp)
        print(f"  [{idx:02d}/25] {stage_name:<18} | {status:<8} | {len(artist_songs_temp)} track(s)")

    # Upsert users, artist_profiles, and songs
    print("\nUpserting into Supabase (users, artist_profiles, songs)...")
    client.table("users").upsert(user_rows, on_conflict="id").execute()
    client.table("artist_profiles").upsert(artist_profile_rows, on_conflict="user_id").execute()
    client.table("songs").upsert(song_rows, on_conflict="id").execute()

    # Ensure active challenges exist for Kocee ("We Di Go Na Go"), Libianca, Blanche Bailly, and Cysoul
    challenge_rows: List[Dict[str, Any]] = []
    starts_at = now.isoformat()
    ends_at = (now + timedelta(days=7)).isoformat()

    for c_artist, c_track in CHALLENGE_SPECS:
        song_id = song_lookup.get((c_artist, c_track))
        if not song_id:
            # Fallback to first song by that artist
            artist_id = deterministic_uuid("artist", c_artist)
            match_song = next((s for s in song_rows if s["artist_id"] == artist_id), None)
            if match_song:
                song_id = match_song["id"]
                c_track = match_song["title"]

        if song_id:
            challenge_id = deterministic_uuid("challenge", c_artist, c_track)
            challenge_rows.append({
                "id": challenge_id,
                "song_id": song_id,
                "title": f"{c_artist} - {c_track} Challenge",
                "status": "active",
                "starts_at": starts_at,
                "ends_at": ends_at,
            })

    if challenge_rows:
        client.table("challenges").upsert(challenge_rows, on_conflict="id").execute()

    # Ensure a real creation by "Buea Animator" exists for Kocee's "We Di Go Na Go" challenge
    kocee_challenge_id = deterministic_uuid("challenge", "Kocee", "We Di Go Na Go")
    buea_creator_id = deterministic_uuid("user", "Buea Animator")
    buea_creation_id = deterministic_uuid("creation", "Buea Animator", "We Di Go Na Go")

    client.table("users").upsert(
        [{
            "id": buea_creator_id,
            "phone": "+237680000099",
            "display_name": "Buea Animator",
            "region": "Southwest",
            "role": "fan_creator",
            "is_suspended": False,
        }],
        on_conflict="id",
    ).execute()

    client.table("creations").upsert(
        [{
            "id": buea_creation_id,
            "challenge_id": kocee_challenge_id,
            "creator_id": buea_creator_id,
            "character_id": "tantie",
            "moves_timeline": [
                {
                    "start": 42.0,
                    "end": 46.0,
                    "action": "approach",
                    "charA_action": "approach",
                    "charB_action": "turn_around",
                    "charA_id": "tantie",
                    "charB_id": "mboa_boy",
                    "bg": "street_buea",
                    "bgMotion": "scroll_left",
                    "prop": "none",
                    "dialogueA": "We di go na go!",
                    "dialogueB": "On est ensemble!",
                },
                {
                    "start": 46.0,
                    "end": 50.0,
                    "action": "celebrate",
                    "charA_action": "celebrate",
                    "charB_action": "laugh",
                    "charA_id": "tantie",
                    "charB_id": "mboa_boy",
                    "bg": "street_buea",
                    "bgMotion": "static",
                    "prop": "none",
                    "sfx": "applause",
                    "dialogueA": "No stress in Buea town!",
                },
                {
                    "start": 50.0,
                    "end": 54.0,
                    "action": "shocked",
                    "charA_action": "shocked",
                    "charB_action": "angry_argue",
                    "charA_id": "tantie",
                    "charB_id": "mboa_boy",
                    "bg": "living_room",
                    "bgMotion": "zoom_in",
                    "prop": "phone",
                    "sfx": "phone_ding",
                    "dialogueA": "Who send this message?!",
                    "dialogueB": "Ah Tantie calm down!",
                },
                {
                    "start": 54.0,
                    "end": 58.0,
                    "action": "slip_fall",
                    "charA_action": "slip_fall",
                    "charB_action": "shocked",
                    "charA_id": "tantie",
                    "charB_id": "mboa_boy",
                    "bg": "chop_house",
                    "bgMotion": "static",
                    "prop": "none",
                    "sfx": "comedy_slip",
                    "dialogueA": "Chai! Dis floor slippery!",
                    "dialogueB": "Ashia Tantie!",
                },
            ],
            "caption": 'Kocee "We Di Go Na Go" official animation! We cropped the chorus (0:42 — 0:58) 🇨🇲🔥',
            "views": 520,
        }],
        on_conflict="id",
    ).execute()

    # Summary Table
    print("\n" + "=" * 58)
    print("           BEATTOONS CAMEROON MUSIC SEED SUMMARY          ")
    print("=" * 58)
    print(f"  {'Metric':<38} | {'Count':>12}")
    print("-" * 58)
    print(f"  {'Total Artists Seeded':<38} | {len(artist_profile_rows):>12}")
    print(f"  {'  - Major / Trending Artists':<38} | {len(trending_artists):>12}")
    print(f"  {'  - Upcoming / Fresh Artists':<38} | {len(fresh_artists):>12}")
    print(f"  {'Total Songs Seeded':<38} | {len(song_rows):>12}")
    print(f"  {'Distinct Albums / EPs':<38} | {len(album_names_seen):>12}")
    print(f"  {'Singles':<38} | {singles_count:>12}")
    print(f"  {'Real iTunes 30s Preview URLs':<38} | {total_itunes_previews:>12}")
    print(f"  {'Offline Fallback Audio URLs':<38} | {total_fallbacks:>12}")
    print(f"  {'Active Challenges Upserted':<38} | {len(challenge_rows):>12}")
    print("=" * 58)


if __name__ == "__main__":
    main()
