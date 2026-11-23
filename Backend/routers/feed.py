from fastapi import APIRouter, HTTPException
from db import get_supabase_client

router = APIRouter(tags=["Feed"])


@router.get("/feed", summary="Get Global Creations Feed (FR-33)")
def get_global_feed():
    """Return recent and popular creations joined with songs (title, clip_url, bpm),

    users (display_name, region), challenges (status, ends_at), views, total vote_count,
    and engagement_rate (round(vote_count / max(views, 1), 4)).
    """
    client = get_supabase_client()
    try:
        # Fetch creations
        cr_res = (
            client.table("creations")
            .select("*")
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        creations = cr_res.data or []

        # Fetch songs
        songs_res = client.table("songs").select("id, title, clip_url, bpm, genre").execute()
        songs_map = {s["id"]: s for s in (songs_res.data or [])}

        # Fetch users
        users_res = client.table("users").select("id, display_name, region").execute()
        users_map = {u["id"]: u for u in (users_res.data or [])}

        # Fetch challenges
        ch_res = client.table("challenges").select("id, song_id, status, ends_at").execute()
        challenges_map = {c["id"]: c for c in (ch_res.data or [])}

        # Fetch votes
        v_res = client.table("votes").select("creation_id").execute()
        vote_counts = {}
        for v in (v_res.data or []):
            cid = v.get("creation_id")
            vote_counts[cid] = vote_counts.get(cid, 0) + 1

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

            item = {
                **c,
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
            }
            feed.append(item)

        # Sort by popularity (vote_count and engagement_rate)
        feed.sort(key=lambda x: (x["vote_count"], x["engagement_rate"]), reverse=True)
        return feed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch creations feed: {str(e)}")

