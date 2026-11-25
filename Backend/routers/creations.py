from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from cache import invalidate_cache
from db import get_supabase_client
from auth import get_current_user
from schemas import CreationCreate

router = APIRouter(prefix="/creations", tags=["Creations"])


@router.post("", summary="Submit a Creation to an Active Challenge (FR-17, FR-18, FR-24)")
def submit_creation(creation: CreationCreate, current_user: dict = Depends(get_current_user)):
    """Allows authenticated users to submit character animation moves to an active challenge.

    Enforces:
    - Target challenge exists, has status 'active', and ends_at > now().
    - Submissions are rejected with HTTP 400 if the challenge has ended.
    - Stores the animation moves_timeline as lightweight JSON data.
    """
    client = get_supabase_client()
    try:
        # Verify target challenge
        ch_res = client.table("challenges").select("*").eq("id", creation.challenge_id).execute()
        if not ch_res.data:
            raise HTTPException(status_code=404, detail="Target challenge not found.")
        challenge = ch_res.data[0]

        if challenge.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target challenge is not active.",
            )

        ends_at_str = challenge.get("ends_at")
        if ends_at_str:
            try:
                ends_at = datetime.fromisoformat(ends_at_str.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) > ends_at:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Challenge has ended. Submissions are closed.",
                    )
            except ValueError:
                pass

        # Serialize moves_timeline to list of dictionaries
        timeline_data = [block.model_dump() for block in creation.moves_timeline]

        new_creation_data = {
            "challenge_id": creation.challenge_id,
            "creator_id": current_user["id"],
            "character_id": creation.character_id,
            "moves_timeline": timeline_data,
            "caption": creation.caption,
            "views": 0,
        }

        res = client.table("creations").insert(new_creation_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save creation to database.")
        invalidate_cache("feed:", "challenges:", "challenge:")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error saving creation: {str(e)}")


@router.post("/{creation_id}/view", summary="Record a View on a Creation (FR-29)")
def record_creation_view(creation_id: str):
    """Increments the views count by 1 for a creation.

    Used by the frontend when a creation plays in the feed or challenge view.
    """
    client = get_supabase_client()
    try:
        cr_res = client.table("creations").select("id, views").eq("id", creation_id).execute()
        if not cr_res.data:
            raise HTTPException(status_code=404, detail="Creation not found.")

        current_views = cr_res.data[0].get("views") or 0
        new_views = current_views + 1

        update_res = client.table("creations").update({"views": new_views}).eq("id", creation_id).execute()
        invalidate_cache("feed:", "challenges:", "challenge:")
        return {
            "status": "ok",
            "creation_id": creation_id,
            "views": new_views,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record creation view: {str(e)}")
