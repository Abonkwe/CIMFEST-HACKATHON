from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from cache import get_cached, set_cached
from db import get_supabase_client

router = APIRouter(prefix="/challenges", tags=["Challenges"])


@router.get("/active", summary="Get Active Challenges with Song and Submission Count (FR-15, FR-19)")
def get_active_challenges():
    """Query active challenges (status == 'active' and ends_at > now()) using batched queries
    and O(n) in-memory joins (zero N+1 queries), cached briefly for fast page loads.
    """
    cache_key = "challenges:active"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

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
        if not challenges:
            set_cached(cache_key, [], ttl_seconds=20.0)
            return []

        challenge_ids = [ch["id"] for ch in challenges if ch.get("id")]
        song_ids = list({ch["song_id"] for ch in challenges if ch.get("song_id")})

        # Batch fetch songs and creations in parallel-friendly single queries
        songs_data = (
            client.table("songs").select("*").in_("id", song_ids).execute().data or []
            if song_ids
            else []
        )
        creations_data = (
            client.table("creations")
            .select("id, challenge_id, creator_id, character_id, caption, views, created_at")
            .in_("challenge_id", challenge_ids)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
            if challenge_ids
            else []
        )

        # Batch fetch all referenced users (song artists + creation authors) in one query
        artist_ids = [s["artist_id"] for s in songs_data if s.get("artist_id")]
        creator_ids = [cr["creator_id"] for cr in creations_data if cr.get("creator_id")]
        user_ids = list(set(artist_ids + creator_ids))
        users_data = (
            client.table("users").select("id, display_name, region").in_("id", user_ids).execute().data
            or []
            if user_ids
            else []
        )

        users_by_id = {u["id"]: u for u in users_data}
        songs_by_id = {}
        for s in songs_data:
            song_copy = dict(s)
            artist_user = users_by_id.get(song_copy.get("artist_id"), {})
            if artist_user.get("display_name"):
                song_copy["artist_name"] = artist_user["display_name"]
            songs_by_id[song_copy["id"]] = song_copy

        creations_by_challenge_id: dict[str, list] = {}
        for cr in creations_data:
            cid = cr.get("challenge_id")
            if not cid:
                continue
            cr_copy = dict(cr)
            creator = users_by_id.get(cr_copy.get("creator_id"), {})
            cr_copy["creator_display_name"] = creator.get("display_name", "Creator")
            creations_by_challenge_id.setdefault(cid, []).append(cr_copy)

        enriched_challenges = []
        for ch in challenges:
            ch_copy = dict(ch)
            ch_creations = creations_by_challenge_id.get(ch_copy["id"], [])
            creations_count = len(ch_creations)

            ch_copy["song"] = songs_by_id.get(ch_copy.get("song_id"))
            ch_copy["creations_count"] = creations_count
            ch_copy["entries_count"] = creations_count
            ch_copy["creations"] = ch_creations[:5]
            enriched_challenges.append(ch_copy)

        set_cached(cache_key, enriched_challenges, ttl_seconds=20.0)
        return enriched_challenges
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch active challenges: {str(e)}")


@router.get("/{challenge_id}", summary="Get Challenge Details with Fair Virality Leaderboard (FR-19, FR-29, FR-30)")
def get_challenge_by_id(
    challenge_id: str,
    tab: str = Query("top", description="Leaderboard tab: 'top' (all creators) or 'rising' (new creators <= 2 creations)"),
):
    """Returns challenge details, song info, and all creations enriched with creator display name,
    views, vote_count, and fair engagement rate (FR-29), using batched queries (no N+1).
    """
    cache_key = f"challenge:{challenge_id}:{tab}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    client = get_supabase_client()
    try:
        ch_res = client.table("challenges").select("*").eq("id", challenge_id).execute()
        if not ch_res.data:
            raise HTTPException(status_code=404, detail="Challenge not found.")
        challenge = dict(ch_res.data[0])

        # Fetch associated song and its artist
        song_id = challenge.get("song_id")
        song = None
        if song_id:
            s_res = client.table("songs").select("*").eq("id", song_id).execute()
            if s_res.data:
                song = dict(s_res.data[0])
                if song.get("artist_id"):
                    u_res = client.table("users").select("display_name").eq("id", song["artist_id"]).execute()
                    if u_res.data:
                        song["artist_name"] = u_res.data[0].get("display_name")
        challenge["song"] = song

        # Fetch creations for this challenge
        creations = client.table("creations").select("*").eq("challenge_id", challenge_id).execute().data or []
        if not creations:
            challenge["tab"] = tab
            challenge["creations"] = []
            challenge["creations_count"] = 0
            set_cached(cache_key, challenge, ttl_seconds=20.0)
            return challenge

        creation_ids = [c["id"] for c in creations if c.get("id")]
        creator_ids = list({c["creator_id"] for c in creations if c.get("creator_id")})

        # Batch fetch votes, users, and creator creation counts only for relevant IDs
        votes_data = (
            client.table("votes").select("creation_id").in_("creation_id", creation_ids).execute().data
            or []
            if creation_ids
            else []
        )
        users_data = (
            client.table("users").select("id, display_name, region").in_("id", creator_ids).execute().data
            or []
            if creator_ids
            else []
        )
        all_creator_creations = (
            client.table("creations").select("creator_id").in_("creator_id", creator_ids).execute().data
            or []
            if creator_ids
            else []
        )

        vote_counts: dict[str, int] = {}
        for v in votes_data:
            cid = v.get("creation_id")
            if cid:
                vote_counts[cid] = vote_counts.get(cid, 0) + 1

        user_map = {u["id"]: u for u in users_data}

        creator_total_creations: dict[str, int] = {}
        for c in all_creator_creations:
            uid = c.get("creator_id")
            if uid:
                creator_total_creations[uid] = creator_total_creations.get(uid, 0) + 1

        enriched_creations = []
        for c in creations:
            c_copy = dict(c)
            creator_id = c_copy.get("creator_id")
            creator = user_map.get(creator_id, {})
            views = max(c_copy.get("views") or 0, 0)
            votes = vote_counts.get(c_copy["id"], 0)
            engagement_rate = round(votes / max(views, 1), 4)

            c_copy["creator_display_name"] = creator.get("display_name", "Anonymous Creator")
            c_copy["creator_region"] = creator.get("region", "Cameroon")
            c_copy["vote_count"] = votes
            c_copy["views"] = views
            c_copy["engagement_rate"] = engagement_rate
            c_copy["creator_total_creations"] = creator_total_creations.get(creator_id, 1)

            if tab == "rising":
                if creator_total_creations.get(creator_id, 1) <= 2:
                    enriched_creations.append(c_copy)
            else:
                enriched_creations.append(c_copy)

        enriched_creations.sort(key=lambda x: (x["engagement_rate"], x["vote_count"]), reverse=True)
        challenge["tab"] = tab
        challenge["creations"] = enriched_creations
        challenge["creations_count"] = len(enriched_creations)

        set_cached(cache_key, challenge, ttl_seconds=20.0)
        return challenge
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch challenge details: {str(e)}")
