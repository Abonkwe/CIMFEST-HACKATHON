import os
import re
import socket
import uuid
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from auth import get_current_user, router as auth_router
from db import get_supabase_client
from routers.admin import router as admin_router
from routers.artists import router as artists_router
from routers.challenges import router as challenges_router
from routers.creations import router as creations_router
from routers.feed import router as feed_router
from routers.payments import router as payments_router
from routers.reports import router as reports_router
from routers.songs import router as songs_router
from routers.users import router as users_router
from routers.votes import router as votes_router

app = FastAPI(
    title="CamVibe API",
    description="Backend API for CamVibe — a Cameroon-first mobile music challenge platform (CIMFEST Hackathon 2026).",
    version="1.0.0",
)

# Configure CORS for localhost and any LAN / Wi-Fi device on the network (any port/hostname)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include application routers
app.include_router(auth_router)
app.include_router(songs_router)
app.include_router(challenges_router)
app.include_router(creations_router)
app.include_router(votes_router)
app.include_router(feed_router)
app.include_router(artists_router)
app.include_router(users_router)
app.include_router(reports_router)
app.include_router(admin_router)
app.include_router(payments_router)


@app.get("/health", tags=["Health & Status"])
def health_check():
    return {
        "status": "ok",
        "service": "CamVibe API",
    }


ALLOWED_VIDEO_TYPES = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
}
MAX_VIDEO_BYTES = 25 * 1024 * 1024  # 25 MB


@app.post("/creations/upload-video", tags=["Creations"])
async def upload_creation_video(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a Dance Challenge or Music Cover video (<= 25 MB) to Supabase Storage bucket 'creation-videos'."""
    raw_ct = (file.content_type or "").split(";")[0].strip().lower()
    raw_name = file.filename or "video.mp4"
    ext = os.path.splitext(raw_name)[1].lower().lstrip(".")

    if raw_ct not in ALLOWED_VIDEO_TYPES:
        if ext == "mp4":
            raw_ct = "video/mp4"
        elif ext == "webm":
            raw_ct = "video/webm"
        elif ext == "mov":
            raw_ct = "video/quicktime"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported video format. Please upload MP4, WebM, or MOV (QuickTime).",
            )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded video file is empty.",
        )

    if len(file_bytes) > MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Video file exceeds the 25 MB size limit.",
        )

    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", raw_name)
    if not os.path.splitext(safe_name)[1]:
        safe_name = f"{safe_name}.{ALLOWED_VIDEO_TYPES[raw_ct]}"
    storage_path = f"{current_user['id']}/{uuid.uuid4().hex}_{safe_name}"

    client = get_supabase_client()
    try:
        client.storage.from_("creation-videos").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": raw_ct},
        )
        public_url = client.storage.from_("creation-videos").get_public_url(storage_path)
        return {"video_url": public_url}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload video to storage: {str(exc)}",
        )


@app.get("/test-db", tags=["Health & Status"])
def test_db():
    try:
        client = get_supabase_client()
        songs_response = client.table("songs").select("*").execute()
        challenges_response = client.table("challenges").select("*").execute()

        songs = songs_response.data or []
        challenges = challenges_response.data or []

        return {
            "status": "ok",
            "songs_count": len(songs),
            "challenges_count": len(challenges),
            "songs": songs,
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Database connection error: {str(e)}"
        )


def _get_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    lan_ip = _get_lan_ip()
    print(f"CamVibe API listening on http://{host}:{port} (LAN: http://{lan_ip}:{port})")
    uvicorn.run("main:app", host=host, port=port, reload=True)
