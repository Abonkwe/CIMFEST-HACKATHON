from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from cache import invalidate_cache
from db import get_supabase_client
from auth import get_current_user, normalize_artist_profile
from schemas import ArtistApplyRequest, ArtistChallengeCreate

router = APIRouter(prefix="/artists", tags=["Artists"])


@router.post("/apply", summary="Apply to become a Verified Cameroonian Artist (FR-5)")
def apply_for_artist_verification(
    req: ArtistApplyRequest,
    current_user: dict = Depends(get_current_user),
):
    """Allows an authenticated user to submit an expanded artist verification application.

    Upserts a row in `public.artist_profiles` with `verification_status = 'pending'`.
    """
    client = get_supabase_client()
    try:
        existing = (
            client.table("artist_profiles")
            .select("*")
            .eq("user_id", current_user["id"])
            .execute()
        )

        profile_payload = {
            "artist_name": req.artist_name,
            "full_legal_name": req.full_legal_name,
            "email": req.email,
            "country_of_residence": req.country_of_residence,
            "primary_genre": req.primary_genre,
            "bio": req.bio,
            "avatar_url": req.avatar_url,
            "social_links": req.social_links or {},
            "release_links": req.release_links or [],
            "verification_status": "pending",
            "reviewed_by": None,
            "reviewed_at": None,
        }

        if existing.data and len(existing.data) > 0:
            existing_profile = existing.data[0]
            if existing_profile.get("verification_status") == "approved" and current_user.get("role") == "artist":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Your artist profile is already verified and approved.",
                )

            res = (
                client.table("artist_profiles")
                .update(profile_payload)
                .eq("user_id", current_user["id"])
                .execute()
            )
        else:
            res = (
                client.table("artist_profiles")
                .insert({
                    "user_id": current_user["id"],
                    **profile_payload,
                })
                .execute()
            )

        updated_profile = normalize_artist_profile(res.data[0]) if res.data else {}
        return {
            "status": "ok",
            "message": "Artist verification application submitted. Pending admin review.",
            "profile": updated_profile,
            "artist_profile": updated_profile,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit artist application: {str(e)}",
        )


@router.get("/me/songs", summary="Get Artist's Songs with Plays, Creations & Votes (FR-36)")
def get_artist_songs_with_insights(current_user: dict = Depends(get_current_user)):
    """Returns all songs uploaded by the logged-in artist (fresh & trending) with per-song metrics."""
    client = get_supabase_client()
    user_id = current_user["id"]
    try:
        ap_res = (
            client.table("artist_profiles")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        profile = normalize_artist_profile(ap_res.data[0]) if ap_res.data else {}
        artist_name = (profile or {}).get("artist_name") or current_user.get("display_name", "Artist")

        songs_res = (
            client.table("songs")
            .select("*")
            .eq("artist_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        songs = songs_res.data or []
        if not songs:
            return {"status": "ok", "songs_count": 0, "songs": []}

        song_ids = [s["id"] for s in songs]

        ch_res = (
            client.table("challenges")
            .select("id, song_id, status")
            .in_("song_id", song_ids)
            .execute()
        )
        challenges = ch_res.data or []
        challenge_to_song = {ch["id"]: ch["song_id"] for ch in challenges}
        active_challenges_by_song: dict[str, int] = {}
        for ch in challenges:
            if ch.get("status") == "active":
                sid = ch.get("song_id")
                active_challenges_by_song[sid] = active_challenges_by_song.get(sid, 0) + 1

        challenge_ids = list(challenge_to_song.keys())
        creations = []
        if challenge_ids:
            cr_res = (
                client.table("creations")
                .select("id, challenge_id, views")
                .in_("challenge_id", challenge_ids)
                .execute()
            )
            creations = cr_res.data or []

        creation_ids = [c["id"] for c in creations]
        vote_counts: dict[str, int] = {}
        if creation_ids:
            v_res = (
                client.table("votes")
                .select("creation_id")
                .in_("creation_id", creation_ids)
                .execute()
            )
            for v in (v_res.data or []):
                cid = v.get("creation_id")
                vote_counts[cid] = vote_counts.get(cid, 0) + 1

        creations_by_song: dict[str, int] = {}
        plays_by_song: dict[str, int] = {}
        votes_by_song: dict[str, int] = {}
        for c in creations:
            sid = challenge_to_song.get(c.get("challenge_id"))
            if not sid:
                continue
            creations_by_song[sid] = creations_by_song.get(sid, 0) + 1
            plays_by_song[sid] = plays_by_song.get(sid, 0) + max(c.get("views") or 0, 0)
            votes_by_song[sid] = votes_by_song.get(sid, 0) + vote_counts.get(c["id"], 0)

        enriched = []
        for s in songs:
            sid = s["id"]
            enriched.append({
                **s,
                "artist_name": artist_name,
                "creations_count": creations_by_song.get(sid, 0),
                "plays_count": plays_by_song.get(sid, 0),
                "votes_count": votes_by_song.get(sid, 0),
                "active_challenges_count": active_challenges_by_song.get(sid, 0),
            })

        return {
            "status": "ok",
            "songs_count": len(enriched),
            "songs": enriched,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch artist songs: {str(e)}",
        )


@router.post("/challenges", summary="Launch a Challenge for Your Song (FR-15)")
def launch_artist_challenge(
    req: ArtistChallengeCreate,
    current_user: dict = Depends(get_current_user),
):
    """Allows a verified artist to launch a time-limited challenge for one of their own songs.

    Automatically promotes the song from 'fresh' to 'trending' so fans can discover it immediately.
    """
    if current_user.get("role") != "artist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verified artists can launch song challenges.",
        )

    client = get_supabase_client()
    try:
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
                detail="Your artist profile must be approved before launching challenges.",
            )

        song_res = client.table("songs").select("*").eq("id", req.song_id).execute()
        if not song_res.data:
            raise HTTPException(status_code=404, detail="Song not found.")
        song = song_res.data[0]

        if song.get("artist_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only launch challenges for your own uploaded songs.",
            )

        now = datetime.now(timezone.utc)
        ends_at = now + timedelta(hours=req.duration_hours)

        ch_res = client.table("challenges").insert({
            "song_id": req.song_id,
            "title": req.title,
            "status": "active",
            "starts_at": now.isoformat(),
            "ends_at": ends_at.isoformat(),
            "created_by": current_user["id"],
        }).execute()

        if not ch_res.data:
            raise HTTPException(status_code=500, detail="Failed to create challenge.")
        created_challenge = ch_res.data[0]

        song_promoted = False
        if song.get("status") == "fresh":
            client.table("songs").update({"status": "trending"}).eq("id", req.song_id).execute()
            song["status"] = "trending"
            song_promoted = True

        created_challenge["song"] = song
        invalidate_cache("challenges:", "songs:")

        return {
            "status": "ok",
            "message": "Challenge launched successfully!",
            "challenge": created_challenge,
            "song_promoted": song_promoted,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to launch challenge: {str(e)}",
        )
