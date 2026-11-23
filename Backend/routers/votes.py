from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from db import get_supabase_client
from auth import get_current_user
from schemas import VoteCreate

router = APIRouter(prefix="/votes", tags=["Votes"])


@router.post("", summary="Cast a Vote for a Creation (FR-26, FR-27, NFR-9)")
def vote_creation(vote: VoteCreate, current_user: dict = Depends(get_current_user)):
    """Records one vote per user per creation.

    Enforces:
    - Target creation exists.
    - Associated challenge is active and has not expired.
    - Duplicate votes from the same account are rejected with HTTP 409 Conflict.
    - Returns updated total vote count for the creation.
    """
    client = get_supabase_client()
    try:
        # Verify creation exists
        cr_res = client.table("creations").select("*").eq("id", vote.creation_id).execute()
        if not cr_res.data:
            raise HTTPException(status_code=404, detail="Creation not found.")
        creation = cr_res.data[0]

        # Verify parent challenge is active and not ended
        challenge_id = creation.get("challenge_id")
        ch_res = client.table("challenges").select("*").eq("id", challenge_id).execute()
        if not ch_res.data:
            raise HTTPException(status_code=404, detail="Associated challenge not found.")
        challenge = ch_res.data[0]

        if challenge.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voting closed. This challenge is not active.",
            )

        ends_at_str = challenge.get("ends_at")
        if ends_at_str:
            try:
                ends_at = datetime.fromisoformat(ends_at_str.replace("Z", "+00:00"))
                if datetime.now(timezone.utc) > ends_at:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Voting closed. This challenge has ended.",
                    )
            except ValueError:
                pass

        # Server-side duplicate vote check (FR-27)
        existing_vote = (
            client.table("votes")
            .select("id")
            .eq("creation_id", vote.creation_id)
            .eq("user_id", current_user["id"])
            .execute()
        )
        if existing_vote.data and len(existing_vote.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already voted for this creation",
            )

        # Insert vote with unique constraint handling
        try:
            client.table("votes").insert(
                {"creation_id": vote.creation_id, "user_id": current_user["id"]}
            ).execute()
        except Exception as db_err:
            err_str = str(db_err).lower()
            if "unique" in err_str or "duplicate" in err_str or "23505" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="You have already voted for this creation",
                )
            raise

        # Fetch updated total vote count for this creation
        v_res = client.table("votes").select("id").eq("creation_id", vote.creation_id).execute()
        total_votes = len(v_res.data or [])

        return {
            "status": "ok",
            "creation_id": vote.creation_id,
            "vote_count": total_votes,
            "message": "Vote recorded successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error casting vote: {str(e)}")

