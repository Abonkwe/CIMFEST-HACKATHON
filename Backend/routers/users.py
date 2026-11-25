from fastapi import APIRouter, Depends, HTTPException, status
from auth import fetch_artist_profile, get_current_user
from db import get_supabase_client

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me/profile", summary="Get Current User Profile Summary, Creations & Badges (FR-34)")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Returns the authenticated user's profile, creations, engagement stats, and computed badges."""
    client = get_supabase_client()
    user_id = current_user["id"]

    try:
        # 1. Fetch user's creations
        cr_res = (
            client.table("creations")
            .select("*")
            .eq("creator_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        raw_creations = cr_res.data or []

        # 2. Fetch votes cast by this user
        cast_res = (
            client.table("votes")
            .select("id")
            .eq("user_id", user_id)
            .execute()
        )
        votes_cast = len(cast_res.data or [])

        # 3. Enrich creations with challenge, song, and vote counts
        creations = []
        votes_received = 0

        if raw_creations:
            creation_ids = [c["id"] for c in raw_creations]
            challenge_ids = list({c.get("challenge_id") for c in raw_creations if c.get("challenge_id")})

            challenges_map = {}
            songs_map = {}
            if challenge_ids:
                ch_res = (
                    client.table("challenges")
                    .select("id, song_id, status, ends_at")
                    .in_("id", challenge_ids)
                    .execute()
                )
                challenges_map = {ch["id"]: ch for ch in (ch_res.data or [])}

                song_ids = list({ch.get("song_id") for ch in challenges_map.values() if ch.get("song_id")})
                if song_ids:
                    s_res = (
                        client.table("songs")
                        .select("id, title, clip_url, bpm, genre, language")
                        .in_("id", song_ids)
                        .execute()
                    )
                    songs_map = {s["id"]: s for s in (s_res.data or [])}

            v_res = (
                client.table("votes")
                .select("creation_id")
                .in_("creation_id", creation_ids)
                .execute()
            )
            vote_counts = {}
            for v in (v_res.data or []):
                cid = v.get("creation_id")
                vote_counts[cid] = vote_counts.get(cid, 0) + 1

            for c in raw_creations:
                cid = c["id"]
                views = max(c.get("views") or 0, 0)
                vote_count = vote_counts.get(cid, 0)
                votes_received += vote_count
                engagement_rate = round(vote_count / max(views, 1), 4)

                ch_id = c.get("challenge_id")
                challenge_info = challenges_map.get(ch_id, {})
                song_id = challenge_info.get("song_id")
                song_info = songs_map.get(song_id, {})

                creations.append({
                    **c,
                    "character_id": c.get("character_id") or c.get("character") or "tantie",
                    "views": views,
                    "vote_count": vote_count,
                    "engagement_rate": engagement_rate,
                    "creator_display_name": current_user.get("display_name"),
                    "creator_region": current_user.get("region"),
                    "creator": {
                        "id": user_id,
                        "display_name": current_user.get("display_name"),
                        "region": current_user.get("region"),
                    },
                    "challenge": {
                        "id": ch_id,
                        "status": challenge_info.get("status"),
                        "ends_at": challenge_info.get("ends_at"),
                    },
                    "song": {
                        "id": song_id,
                        "title": song_info.get("title", "Unknown Track"),
                        "clip_url": song_info.get("clip_url", ""),
                        "bpm": song_info.get("bpm", 110),
                        "genre": song_info.get("genre", "Afropop"),
                    },
                })

        creations_count = len(creations)
        artist_profile = fetch_artist_profile(client, str(user_id))

        # 4. Compute achievement badges (FR-34)
        badges = []
        if creations_count >= 1:
            badges.append({
                "id": "first_creation",
                "name": "First Creation",
                "icon": "🎬",
                "description": "Published your first animated story to a challenge",
            })
        if votes_received >= 3:
            badges.append({
                "id": "crowd_favorite",
                "name": "Crowd Favorite",
                "icon": "🔥",
                "description": "Earned 3+ community votes across your creations",
            })
        if votes_cast >= 1:
            badges.append({
                "id": "super_fan",
                "name": "Super Fan",
                "icon": "💛",
                "description": "Supported Cameroon creators by voting in challenges",
            })
        if current_user.get("role") == "artist" and artist_profile and artist_profile.get("verification_status") == "approved":
            badges.append({
                "id": "verified_artist",
                "name": "Verified Cameroonian Artist",
                "icon": "✓",
                "description": "Approved Cameroonian music artist on BeatToons",
            })

        return {
            "user": current_user,
            "artist_profile": artist_profile,
            "creations": creations,
            "stats": {
                "creations_count": creations_count,
                "votes_received": votes_received,
                "votes_cast": votes_cast,
            },
            "badges": badges,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load user profile: {str(e)}",
        )

