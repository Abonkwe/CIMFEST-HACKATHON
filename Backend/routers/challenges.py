from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from db import get_supabase_client

router = APIRouter(prefix="/challenges", tags=["Challenges"])


@router.get("/active", summary="Get Active Challenges with Song and Submission Count (FR-15, FR-19)")
def get_active_challenges():
    """Query challenges where status == 'active' and ends_at > now().

    Joined with the associated song record and count of creation submissions.
    """
    client = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        res = (
            client.table("challenges")
            .select("*")
            .eq("status", "active")
            .gt("ends_at", now_iso)
            .execute()
        )
        challenges = res.data or []

        enriched_challenges = []
        for ch in challenges:
            song_id = ch.get("song_id")
            song = None
            if song_id:
                s_res = client.table("songs").select("*").eq("id", song_id).execute()
                if s_res.data:
                    song = s_res.data[0]
                    if song.get("artist_id"):
                        u_res = client.table("users").select("display_name").eq("id", song["artist_id"]).execute()
                        if u_res.data:
                            song["artist_name"] = u_res.data[0].get("display_name")

            c_res = client.table("creations").select("id").eq("challenge_id", ch["id"]).execute()
            creations_count = len(c_res.data or [])

            ch["song"] = song
            ch["creations_count"] = creations_count
            enriched_challenges.append(ch)

        return enriched_challenges
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch active challenges: {str(e)}")


@router.get("/{challenge_id}", summary="Get Challenge Details with Fair Virality Leaderboard (FR-19, FR-29, FR-30)")
def get_challenge_by_id(
    challenge_id: str,
    tab: str = Query("top", description="Leaderboard tab: 'top' (all creators) or 'rising' (new creators <= 2 creations)"),
):
    """Returns challenge details, song info, and all creations enriched with creator display name,

    views, vote_count, and fair engagement rate (FR-29).
    Supports 'rising' tab for small creators (FR-30).
    """
    client = get_supabase_client()
    try:
        ch_res = client.table("challenges").select("*").eq("id", challenge_id).execute()
        if not ch_res.data:
            raise HTTPException(status_code=404, detail="Challenge not found.")
        challenge = ch_res.data[0]

        # Attach associated song
        song_id = challenge.get("song_id")
        song = None
        if song_id:
            s_res = client.table("songs").select("*").eq("id", song_id).execute()
            if s_res.data:
                song = s_res.data[0]
                if song.get("artist_id"):
                    u_res = client.table("users").select("display_name").eq("id", song["artist_id"]).execute()
                    if u_res.data:
                        song["artist_name"] = u_res.data[0].get("display_name")
        challenge["song"] = song

        # Fetch creations for this challenge
        c_res = client.table("creations").select("*").eq("challenge_id", challenge_id).execute()
        creations = c_res.data or []

        # Count votes per creation
        v_res = client.table("votes").select("creation_id").execute()
        all_votes = v_res.data or []
        vote_counts = {}
        for v in all_votes:
            cid = v.get("creation_id")
            vote_counts[cid] = vote_counts.get(cid, 0) + 1

        # Fetch users to map creator display name & region
        u_res = client.table("users").select("id, display_name, region").execute()
        user_map = {u["id"]: u for u in (u_res.data or [])}

        # Count total creations across platform per creator to support FR-30 ("Rising" leaderboard)
        all_c_res = client.table("creations").select("creator_id").execute()
        creator_total_creations = {}
        for c in (all_c_res.data or []):
            uid = c.get("creator_id")
            creator_total_creations[uid] = creator_total_creations.get(uid, 0) + 1

        enriched_creations = []
        for c in creations:
            creator_id = c.get("creator_id")
            creator = user_map.get(creator_id, {})
            views = max(c.get("views") or 0, 0)
            votes = vote_counts.get(c["id"], 0)
            # FR-29: Calculate engagement_rate = vote_count / max(views, 1)
            engagement_rate = round(votes / max(views, 1), 4)

            c["creator_display_name"] = creator.get("display_name", "Anonymous Creator")
            c["creator_region"] = creator.get("region", "Cameroon")
            c["vote_count"] = votes
            c["views"] = views
            c["engagement_rate"] = engagement_rate
            c["creator_total_creations"] = creator_total_creations.get(creator_id, 1)

            # FR-30: Filter for 'rising' tab (creators with 2 or fewer total creations)
            if tab == "rising":
                if creator_total_creations.get(creator_id, 1) <= 2:
                    enriched_creations.append(c)
            else:
                enriched_creations.append(c)

        # FR-29: Sort by engagement_rate descending, then vote_count descending
        enriched_creations.sort(key=lambda x: (x["engagement_rate"], x["vote_count"]), reverse=True)
        challenge["tab"] = tab
        challenge["creations"] = enriched_creations
        challenge["creations_count"] = len(enriched_creations)

        return challenge
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch challenge details: {str(e)}")
