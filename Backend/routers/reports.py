from fastapi import APIRouter, Depends, HTTPException, status
from db import get_supabase_client
from auth import get_current_user
from schemas import ReportCreate

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("", summary="Report a Creation or Song (FR-35)")
def create_report(
    req: ReportCreate,
    current_user: dict = Depends(get_current_user),
):
    """Allows an authenticated user to report inappropriate content or copyright violations."""
    client = get_supabase_client()
    try:
        new_report = {
            "reporter_id": current_user["id"],
            "target_type": req.target_type,
            "target_id": req.target_id,
            "reason": req.reason.strip(),
            "status": "open",
        }
        res = client.table("reports").insert(new_report).execute()
        return {
            "status": "ok",
            "message": "Report submitted successfully to the moderation queue.",
            "report": res.data[0] if res.data else new_report,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit report: {str(e)}",
        )

