from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from db import get_supabase_client
from auth import get_admin_user
from schemas import ArtistReviewRequest, ModerateRequest

router = APIRouter(prefix="/admin", tags=["Admin & Moderation"])


@router.post("/recalculate-trending", summary="Recalculate Song Trending Scores & Promote Fresh Tracks (FR-11, FR-12)")
def recalculate_trending_scores(current_admin: dict = Depends(get_admin_user)):
    """Computes trending_score = (total_creations * 3) + (total_votes * 1) for every song.

    Automatically promotes any 'fresh' song with trending_score >= 5 to status = 'trending' (FR-12).
    """
    client = get_supabase_client()
    try:
        # Fetch songs, challenges, creations, and votes
        songs_res = client.table("songs").select("*").execute()
        songs = songs_res.data or []

        ch_res = client.table("challenges").select("id, song_id").execute()
        challenges = ch_res.data or []

        cr_res = client.table("creations").select("id, challenge_id").execute()
        creations = cr_res.data or []

        v_res = client.table("votes").select("id, creation_id").execute()
        votes = v_res.data or []

        # Map challenge_ids to song_id
        challenge_song_map = {ch["id"]: ch["song_id"] for ch in challenges}

        # Count votes per creation
        vote_counts = {}
        for v in votes:
            cid = v.get("creation_id")
            vote_counts[cid] = vote_counts.get(cid, 0) + 1

        # Count creations and votes per song
        song_creations = {}
        song_votes = {}
        for c in creations:
            song_id = challenge_song_map.get(c.get("challenge_id"))
            if song_id:
                song_creations[song_id] = song_creations.get(song_id, 0) + 1
                c_votes = vote_counts.get(c["id"], 0)
                song_votes[song_id] = song_votes.get(song_id, 0) + c_votes

        updated_songs = []
        for s in songs:
            sid = s["id"]
            tot_cr = song_creations.get(sid, 0)
            tot_vt = song_votes.get(sid, 0)

            # FR-11 formula: (creations * 3) + (votes * 1)
            score = float((tot_cr * 3) + (tot_vt * 1))
            current_status = s.get("status", "fresh")
            new_status = current_status

            # FR-12 promotion threshold: fresh -> trending if score >= 5
            promoted = False
            if current_status == "fresh" and score >= 5.0:
                new_status = "trending"
                promoted = True

            # Update database
            client.table("songs").update({
                "trending_score": score,
                "status": new_status,
            }).eq("id", sid).execute()

            s["trending_score"] = score
            s["status"] = new_status
            s["promoted"] = promoted
            s["total_creations"] = tot_cr
            s["total_votes"] = tot_vt
            updated_songs.append(s)

        return {
            "status": "ok",
            "message": "Trending scores recalculated successfully.",
            "songs_count": len(updated_songs),
            "songs": updated_songs,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate trending scores: {str(e)}",
        )


@router.get("/queues", summary="Get Admin Queues: Verification & Reports (FR-37)")
def get_admin_queues(current_admin: dict = Depends(get_admin_user)):
    """Returns all pending artist verification applications and open reports."""
    client = get_supabase_client()
    try:
        # Pending artists
        p_res = (
            client.table("artist_profiles")
            .select("*")
            .eq("verification_status", "pending")
            .execute()
        )
        pending_artists = p_res.data or []

        # Open reports
        r_res = (
            client.table("reports")
            .select("*")
            .eq("status", "open")
            .execute()
        )
        open_reports = r_res.data or []

        return {
            "status": "ok",
            "pending_artists": pending_artists,
            "pending_artists_count": len(pending_artists),
            "open_reports": open_reports,
            "open_reports_count": len(open_reports),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch admin queues: {str(e)}",
        )


@router.post("/artists/{user_id}/review", summary="Review Artist Application (FR-6)")
def review_artist_application(
    user_id: str,
    req: ArtistReviewRequest,
    current_admin: dict = Depends(get_admin_user),
):
    """Reviews an artist application: sets verification_status ('approved' or 'rejected'),

    reviewed_by, and reviewed_at. If approved, automatically upgrades user.role to 'artist'.
    """
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        # Check profile exists
        existing = (
            client.table("artist_profiles")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Artist profile not found.")

        # Update artist_profile
        client.table("artist_profiles").update({
            "verification_status": req.decision,
            "reviewed_by": current_admin["id"],
            "reviewed_at": now_iso,
        }).eq("user_id", user_id).execute()

        # If approved, update user's role to artist
        if req.decision == "approved":
            client.table("users").update({"role": "artist"}).eq("id", user_id).execute()

        return {
            "status": "ok",
            "user_id": user_id,
            "verification_status": req.decision,
            "reviewed_by": current_admin["id"],
            "reviewed_at": now_iso,
            "message": f"Artist application has been {req.decision}.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to review artist application: {str(e)}",
        )


@router.post("/moderate", summary="Perform Moderation Action (FR-38)")
def moderate_content(
    req: ModerateRequest,
    current_admin: dict = Depends(get_admin_user),
):
    """Executes moderation action: remove_creation, remove_song, suspend_user, or resolve_report.

    Optionally marks the associated report_id as 'resolved'.
    """
    client = get_supabase_client()
    try:
        if req.action == "remove_creation":
            # Delete votes on creation first to respect foreign keys
            client.table("votes").delete().eq("creation_id", req.target_id).execute()
            client.table("creations").delete().eq("id", req.target_id).execute()

        elif req.action == "remove_song":
            client.table("songs").delete().eq("id", req.target_id).execute()

        elif req.action == "suspend_user":
            client.table("users").update({"is_suspended": True}).eq("id", req.target_id).execute()

        elif req.action == "resolve_report":
            client.table("reports").update({"status": "resolved"}).eq("id", req.target_id).execute()

        # If report_id was provided alongside another action, mark it resolved
        if req.report_id:
            client.table("reports").update({"status": "resolved"}).eq("id", req.report_id).execute()

        return {
            "status": "ok",
            "action": req.action,
            "target_id": req.target_id,
            "report_id": req.report_id,
            "moderated_by": current_admin["id"],
            "message": f"Moderation action '{req.action}' executed successfully.",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute moderation action: {str(e)}",
        )

