import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from cache import get_cached, set_cached
from db import get_supabase_client

router = APIRouter(tags=["Feed"])


@router.get("/feed", summary="Get Global Creations Feed (FR-33)")
def get_global_feed(
    challenge_id: Optional[str] = Query(None, description="Optional challenge UUID to filter entries"),
):
    """Return recent and popular creations joined with songs, users, and challenges in O(n)
    using batched `.in_()` queries (zero N+1 queries) and a short-lived TTL cache.
    When challenge_id is provided, strictly filters creations to that challenge.
    """
    if challenge_id:
        try:
            uuid.UUID(challenge_id)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid challenge_id format.",
            )

    cache_key = f"feed:{challenge_id or 'all'}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    client = get_supabase_client()
    try:
        # 1. Fetch creations (strictly filtered if challenge_id is provided)
        query = client.table("creations").select("*")
        if challenge_id:
            query = query.eq("challenge_id", challenge_id)
        creations = query.order("created_at", desc=True).limit(50).execute().data or []

        if not creations:
            set_cached(cache_key, [], ttl_seconds=20.0)
            return []

        # 2. Collect referenced IDs and batch-fetch only needed rows
        creation_ids = [c["id"] for c in creations if c.get("id")]
        creator_ids = list({c["creator_id"] for c in creations if c.get("creator_id")})
        challenge_ids = list({c["challenge_id"] for c in creations if c.get("challenge_id")})

        challenges_data = (
            client.table("challenges")
            .select("id, title, song_id, status, ends_at")
            .in_("id", challenge_ids)
            .execute()
            .data
            or []
            if challenge_ids
            else []
        )
        users_data = (
            client.table("users")
            .select("id, display_name, region")
            .in_("id", creator_ids)
            .execute()
            .data
            or []
            if creator_ids
            else []
        )
        votes_data = (
            client.table("votes")
            .select("creation_id")
            .in_("creation_id", creation_ids)
            .execute()
            .data
            or []
            if creation_ids
            else []
        )

        song_ids = list({ch["song_id"] for ch in challenges_data if ch.get("song_id")})
        songs_data = (
            client.table("songs")
            .select("id, title, clip_url, bpm, genre")
            .in_("id", song_ids)
            .execute()
            .data
            or []
            if song_ids
            else []
        )

        # 3. Assemble O(n) lookup dictionaries
        challenges_map = {c["id"]: c for c in challenges_data}
        users_map = {u["id"]: u for u in users_data}
        songs_map = {s["id"]: s for s in songs_data}

        vote_counts: dict[str, int] = {}
        for v in votes_data:
            cid = v.get("creation_id")
            if cid:
                vote_counts[cid] = vote_counts.get(cid, 0) + 1

        # 4. Join in memory
        feed = []
        for c in creations:
            cid = c["id"]
            views = max(c.get("views") or 0, 0)
            votes = vote_counts.get(cid, 0)
            engagement_rate = round(votes / max(views, 1), 4)

            ch_id = c.get("challenge_id")
            challenge_info = challenges_map.get(ch_id, {})
            song_id = challenge_info.get("song_id")
            song_info = songs_map.get(song_id, {})
            creator_info = users_map.get(c.get("creator_id"), {})
            song_title = song_info.get("title", "Unknown Track")
            challenge_title = challenge_info.get("title") or f"{song_title} Challenge"

            feed.append({
                **c,
                "challenge_id": ch_id,
                "challenge_title": challenge_title,
                "views": views,
                "vote_count": votes,
                "engagement_rate": engagement_rate,
                "creator": {
                    "id": c.get("creator_id"),
                    "display_name": creator_info.get("display_name", "Anonymous Creator"),
                    "region": creator_info.get("region", "Cameroon"),
                },
                "challenge": {
                    "id": ch_id,
                    "title": challenge_title,
                    "status": challenge_info.get("status"),
                    "ends_at": challenge_info.get("ends_at"),
                },
                "song": {
                    "id": song_id,
                    "title": song_title,
                    "clip_url": song_info.get("clip_url", ""),
                    "bpm": song_info.get("bpm", 110),
                    "genre": song_info.get("genre", "Afropop"),
                },
            })

        feed.sort(key=lambda x: (x["vote_count"], x["engagement_rate"]), reverse=True)
        set_cached(cache_key, feed, ttl_seconds=20.0)
        return feed
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch creations feed: {str(e)}")
