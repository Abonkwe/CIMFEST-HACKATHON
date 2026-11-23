from fastapi import APIRouter, Depends, HTTPException, status
from db import get_supabase_client
from auth import get_current_user
from schemas import SongCreate

router = APIRouter(prefix="/songs", tags=["Songs"])


@router.get("/trending", summary="Get Trending Songs (FR-10, FR-14)")
def get_trending_songs():
    """Query songs where status == 'trending', joined with users and artist_profiles.

    Enforces FR-14: Only songs from verified Cameroonian artists (verification_status == 'approved') are returned.
    Ordered by trending_score descending.
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


@router.post("", summary="Upload a Song Clip (FR-7, FR-8)")
def upload_song(song: SongCreate, current_user: dict = Depends(get_current_user)):
    """Allows verified artists to upload a 15-30 second song clip.

    Enforces:
    - User has role 'artist' and approved entry in artist_profiles.
    - Duration is between 15 and 30 seconds.
    - Songs enter the 'fresh' pool (FR-8) with initial trending_score = 0.
    """
    if current_user.get("role") != "artist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only accounts with the 'artist' role can upload songs.",
        )

    client = get_supabase_client()
    # Verify approved artist profile
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

    # Validate duration between 15 and 30 seconds
    if not (15 <= song.duration_sec <= 30):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Clip duration must be between 15 and 30 seconds.",
        )

    new_song_data = {
        "artist_id": current_user["id"],
        "title": song.title,
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
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error uploading song: {str(e)}")
