import json
from fastapi import APIRouter, Depends, HTTPException, status
from db import get_supabase_client
from auth import get_current_user
from schemas import ArtistApplyRequest

router = APIRouter(prefix="/artists", tags=["Artists"])


@router.post("/apply", summary="Apply to become a Verified Cameroonian Artist (FR-5)")
def apply_for_artist_verification(
    req: ArtistApplyRequest,
    current_user: dict = Depends(get_current_user),
):
    """Allows an authenticated user to submit an application to become a verified artist.

    Upserts a row in artist_profiles with verification_status = 'pending'.
    """
    client = get_supabase_client()
    try:
        links_data = json.dumps({
            "social_links": req.social_links,
            "release_links": req.release_links,
        })

        # Check for existing profile
        existing = (
            client.table("artist_profiles")
            .select("*")
            .eq("user_id", current_user["id"])
            .execute()
        )

        if existing.data and len(existing.data) > 0:
            res = (
                client.table("artist_profiles")
                .update({
                    "artist_name": req.artist_name.strip(),
                    "links": links_data,
                    "verification_status": "pending",
                })
                .eq("user_id", current_user["id"])
                .execute()
            )
        else:
            res = (
                client.table("artist_profiles")
                .insert({
                    "user_id": current_user["id"],
                    "artist_name": req.artist_name.strip(),
                    "links": links_data,
                    "verification_status": "pending",
                })
                .execute()
            )

        updated_profile = res.data[0] if res.data else {}
        return {
            "status": "ok",
            "message": "Artist verification application submitted. Pending admin review.",
            "profile": updated_profile,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit artist application: {str(e)}",
        )

