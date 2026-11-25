from fastapi import APIRouter, Depends, HTTPException, status
from cache import get_cached, invalidate_cache, set_cached
from db import get_supabase_client
from auth import get_current_user
from schemas import AlbumCreate, SongCreate

router = APIRouter(prefix="/songs", tags=["Songs"])


def _require_verified_artist(client, current_user: dict) -> dict:
    """Verify the authenticated user has role 'artist' and an approved artist_profiles row."""
    if current_user.get("role") != "artist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only accounts with the 'artist' role can upload songs.",
        )

    ap_res = (
        client.table("artist_profiles")
        .select("*")
        .eq("user_id", current_user["id"])
        .eq("verification_status", "approved")
        .execute()
    )
    if not ap_res.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Artist verification required. Your artist profile must be approved before uploading.",
        )
    return ap_res.data[0]


def _validate_track_timing(duration_sec: int, bpm: int, track_label: str = "Clip") -> None:
    if not (15 <= duration_sec <= 30):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{track_label} duration must be between 15 and 30 seconds.",
        )
    if not (40 <= bpm <= 240):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{track_label} BPM must be between 40 and 240.",
        )


@router.get("/trending", summary="Get Trending Songs (FR-10, FR-14)")
def get_trending_songs():
    """Query songs where status == 'trending', joined with users and artist_profiles.

    Enforces FR-14: Only songs from verified Cameroonian artists (verification_status == 'approved') are returned.
    Ordered by trending_score descending.
    """
    cache_key = "songs:trending"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    client = get_supabase_client()
    try:
        # Fetch approved artist profiles
        ap_res = (
            client.table("artist_profiles")
            .select("user_id, artist_name, verification_status")
            .eq("verification_status", "approved")
            .execute()
        )
        approved_profiles = ap_res.data or []
        approved_user_ids = {ap["user_id"] for ap in approved_profiles}
        artist_profile_map = {ap["user_id"]: ap for ap in approved_profiles}

        # Fetch users for display details
        u_res = client.table("users").select("id, display_name, region, role").execute()
        user_map = {u["id"]: u for u in (u_res.data or [])}

        # Query trending songs ordered by trending_score descending
        songs_res = (
            client.table("songs")
            .select("*")
            .eq("status", "trending")
            .order("trending_score", desc=True)
            .execute()
        )
        raw_songs = songs_res.data or []

        trending_songs = []
        for song in raw_songs:
            artist_id = song.get("artist_id")
            if artist_id in approved_user_ids:
                profile = artist_profile_map.get(artist_id, {})
                user_info = user_map.get(artist_id, {})
                song["artist_name"] = profile.get("artist_name") or user_info.get("display_name", "Unknown Artist")
                song["artist"] = {**user_info, "artist_profile": profile}
                trending_songs.append(song)

        set_cached(cache_key, trending_songs, ttl_seconds=20.0)
        return trending_songs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch trending songs: {str(e)}")


@router.get("/fresh", summary="Get Fresh Pool Songs (FR-8, FR-12)")
def get_fresh_songs():
    """Query songs in the 'fresh' pool from approved artists.

    Ordered by created_at descending.
    """
    client = get_supabase_client()
    try:
        # Fetch approved artist profiles
        ap_res = (
            client.table("artist_profiles")
            .select("user_id, artist_name, verification_status")
            .eq("verification_status", "approved")
            .execute()
        )
        approved_profiles = ap_res.data or []
        approved_user_ids = {ap["user_id"] for ap in approved_profiles}
        artist_profile_map = {ap["user_id"]: ap for ap in approved_profiles}

        # Fetch users
        u_res = client.table("users").select("id, display_name, region").execute()
        user_map = {u["id"]: u for u in (u_res.data or [])}

        # Query fresh songs
        songs_res = (
            client.table("songs")
            .select("*")
            .eq("status", "fresh")
            .order("created_at", desc=True)
            .execute()
        )
        raw_songs = songs_res.data or []

        fresh_songs = []
        for song in raw_songs:
            artist_id = song.get("artist_id")
            if artist_id in approved_user_ids:
                profile = artist_profile_map.get(artist_id, {})
                user_info = user_map.get(artist_id, {})
                song["artist_name"] = profile.get("artist_name") or user_info.get("display_name", "Unknown Artist")
                song["artist"] = {**user_info, "artist_profile": profile}
                fresh_songs.append(song)

        return fresh_songs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch fresh songs: {str(e)}")


@router.get("/mine", summary="Get Current Artist's Uploaded Songs (Fresh & Trending)")
def get_my_songs(current_user: dict = Depends(get_current_user)):
    """Returns all songs uploaded by the authenticated user (both fresh and trending)."""
    client = get_supabase_client()
    try:
        ap_res = (
            client.table("artist_profiles")
            .select("user_id, artist_name, verification_status")
            .eq("user_id", current_user["id"])
            .execute()
        )
        profile = ap_res.data[0] if ap_res.data else {}
        artist_name = profile.get("artist_name") or current_user.get("display_name", "Artist")

        songs_res = (
            client.table("songs")
            .select("*")
            .eq("artist_id", current_user["id"])
            .order("created_at", desc=True)
            .execute()
        )
        songs = songs_res.data or []
        for song in songs:
            song["artist_name"] = artist_name
            song["artist"] = {**current_user, "artist_profile": profile}
        return songs
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch your songs: {str(e)}")


@router.post("", summary="Upload a Song Clip (FR-7, FR-8)")
def upload_song(song: SongCreate, current_user: dict = Depends(get_current_user)):
    """Allows verified artists to upload a 15-30 second song clip (Single or Album track).

    Enforces:
    - User has role 'artist' and approved entry in artist_profiles.
    - Duration is between 15 and 30 seconds.
    - Songs enter the 'fresh' pool (FR-8) with initial trending_score = 0.
    """
    client = get_supabase_client()
    profile = _require_verified_artist(client, current_user)
    _validate_track_timing(song.duration_sec, song.bpm, track_label="Clip")

    new_song_data = {
        "artist_id": current_user["id"],
        "title": song.title,
        "album_name": song.album_name,
        "genre": song.genre,
        "language": song.language,
        "clip_url": song.clip_url,
        "duration_sec": song.duration_sec,
        "bpm": song.bpm,
        "status": "fresh",
        "trending_score": 0.0,
    }

    try:
        res = client.table("songs").insert(new_song_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save song record.")
        created = dict(res.data[0])
        created["artist_name"] = profile.get("artist_name") or current_user.get("display_name", "Artist")
        created["artist"] = {**current_user, "artist_profile": profile}
        invalidate_cache("songs:")
        return created
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error uploading song: {str(e)}")


@router.post("/album", summary="Batch Release an Album or EP (FR-7, FR-8)")
def upload_album(album: AlbumCreate, current_user: dict = Depends(get_current_user)):
    """Allows verified artists to release 1 to 10 tracks as an Album or EP into the 'fresh' pool."""
    if not (1 <= len(album.tracks) <= 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An album or EP release must include between 1 and 10 tracks.",
        )

    client = get_supabase_client()
    profile = _require_verified_artist(client, current_user)

    rows = []
    for idx, track in enumerate(album.tracks, start=1):
        _validate_track_timing(track.duration_sec, track.bpm, track_label=f"Track {idx} ('{track.title}')")
        rows.append({
            "artist_id": current_user["id"],
            "title": track.title,
            "album_name": album.album_name,
            "genre": (track.genre or album.genre).strip(),
            "language": (track.language or album.language).strip(),
            "clip_url": track.clip_url,
            "duration_sec": track.duration_sec,
            "bpm": track.bpm,
            "status": "fresh",
            "trending_score": 0.0,
        })

    try:
        res = client.table("songs").insert(rows).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save album tracks.")

        artist_name = profile.get("artist_name") or current_user.get("display_name", "Artist")
        created_songs = []
        for row in res.data:
            s = dict(row)
            s["artist_name"] = artist_name
            s["artist"] = {**current_user, "artist_profile": profile}
            created_songs.append(s)

        invalidate_cache("songs:")
        return {
            "status": "ok",
            "album_name": album.album_name,
            "tracks_count": len(created_songs),
            "songs": created_songs,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error uploading album: {str(e)}")
