from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from db import get_supabase_client
from auth import get_admin_user, normalize_artist_profile
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


@router.get("/analytics", summary="Platform-Wide Real-Time Admin Analytics (FR-6, FR-37, FR-38)")
def get_admin_analytics(current_admin: dict = Depends(get_admin_user)):
    """Returns real-time platform totals, regional user breakdown, top songs, and full pending applications."""
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        users = client.table("users").select("*").execute().data or []
        artist_profiles = client.table("artist_profiles").select("*").execute().data or []
        songs = client.table("songs").select("*").execute().data or []
        challenges = client.table("challenges").select("*").execute().data or []
        creations = client.table("creations").select("id, challenge_id").execute().data or []
        votes = client.table("votes").select("id, creation_id").execute().data or []
        reports = client.table("reports").select("id, status").execute().data or []

        user_map = {u["id"]: u for u in users}
        ap_map = {ap["user_id"]: normalize_artist_profile(ap) or ap for ap in artist_profiles}

        # Regional breakdown
        users_by_region: dict[str, int] = {}
        total_fans_creators = 0
        for u in users:
            region = u.get("region") or "Unknown"
            users_by_region[region] = users_by_region.get(region, 0) + 1
            if u.get("role") == "fan_creator":
                total_fans_creators += 1

        verified_artists = sum(1 for ap in artist_profiles if ap.get("verification_status") == "approved")
        pending_profiles = [ap for ap in artist_profiles if ap.get("verification_status") == "pending"]
        active_challenges = sum(
            1
            for ch in challenges
            if ch.get("status") == "active" and (not ch.get("ends_at") or ch["ends_at"] > now_iso)
        )
        open_reports = sum(1 for r in reports if r.get("status") == "open")

        # Song engagement ranking (creations + votes)
        challenge_to_song = {ch["id"]: ch.get("song_id") for ch in challenges}
        vote_counts_by_creation: dict[str, int] = {}
        for v in votes:
            cid = v.get("creation_id")
            if cid:
                vote_counts_by_creation[cid] = vote_counts_by_creation.get(cid, 0) + 1

        song_creations: dict[str, int] = {}
        song_votes: dict[str, int] = {}
        for c in creations:
            sid = challenge_to_song.get(c.get("challenge_id"))
            if sid:
                song_creations[sid] = song_creations.get(sid, 0) + 1
                song_votes[sid] = song_votes.get(sid, 0) + vote_counts_by_creation.get(c["id"], 0)

        top_songs = []
        for s in songs:
            sid = s["id"]
            cr_count = song_creations.get(sid, 0)
            vt_count = song_votes.get(sid, 0)
            ap = ap_map.get(s.get("artist_id")) or {}
            u = user_map.get(s.get("artist_id")) or {}
            top_songs.append({
                "id": sid,
                "title": s.get("title"),
                "album_name": s.get("album_name", "Single"),
                "artist_name": ap.get("artist_name") or u.get("display_name", "Artist"),
                "genre": s.get("genre"),
                "status": s.get("status"),
                "trending_score": s.get("trending_score", 0.0),
                "creations_count": cr_count,
                "votes_count": vt_count,
                "engagement_total": cr_count + vt_count,
            })

        top_songs.sort(key=lambda item: (item["engagement_total"], item["trending_score"]), reverse=True)
        top_songs = top_songs[:5]

        # Full pending applications enriched with applicant phone/display_name/region
        pending_applications = []
        for ap in pending_profiles:
            normalized = normalize_artist_profile(ap) or dict(ap)
            applicant = user_map.get(ap.get("user_id")) or {}
            pending_applications.append({
                **normalized,
                "phone": applicant.get("phone"),
                "display_name": applicant.get("display_name"),
                "region": applicant.get("region"),
            })

        return {
            "status": "ok",
            "totals": {
                "total_users": len(users),
                "total_fans_creators": total_fans_creators,
                "verified_artists": verified_artists,
                "pending_artists": len(pending_profiles),
                "total_songs": len(songs),
                "active_challenges": active_challenges,
                "total_creations": len(creations),
                "total_votes": len(votes),
                "open_reports": open_reports,
            },
            "users_by_region": users_by_region,
            "top_songs": top_songs,
            "pending_applications": pending_applications,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute admin analytics: {str(e)}",
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
        raw_pending = p_res.data or []

        # Enrich with applicant user info
        users_map = {}
        if raw_pending:
            u_res = client.table("users").select("id, display_name, phone, region, role").execute()
            users_map = {u["id"]: u for u in (u_res.data or [])}

        pending_artists = []
        for ap in raw_pending:
            normalized = normalize_artist_profile(ap) or {}
            normalized["user"] = users_map.get(ap.get("user_id"))
            pending_artists.append(normalized)

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
        ap_update_res = client.table("artist_profiles").update({
            "verification_status": req.decision,
            "reviewed_by": current_admin["id"],
            "reviewed_at": now_iso,
        }).eq("user_id", user_id).execute()

        # Fetch target user and update role cleanly
        user_res = client.table("users").select("*").eq("id", user_id).execute()
        updated_user = user_res.data[0] if user_res.data else None

        if req.decision == "approved":
            u_up = client.table("users").update({"role": "artist"}).eq("id", user_id).execute()
            if u_up.data:
                updated_user = u_up.data[0]
        elif req.decision == "rejected" and updated_user and updated_user.get("role") == "artist":
            u_up = client.table("users").update({"role": "fan_creator"}).eq("id", user_id).execute()
            if u_up.data:
                updated_user = u_up.data[0]

        updated_profile = normalize_artist_profile(ap_update_res.data[0]) if ap_update_res.data else None

        return {
            "status": "ok",
            "user_id": user_id,
            "verification_status": req.decision,
            "reviewed_by": current_admin["id"],
            "reviewed_at": now_iso,
            "artist_profile": updated_profile,
            "user": updated_user,
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

