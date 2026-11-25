import os
import socket
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
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
    title="BeatToons API",
    description="Backend API for BeatToons — a Cameroon-first mobile music challenge platform (CIMFEST Hackathon 2026).",
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
        "service": "BeatToons API",
    }


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
    print(f"BeatToons API listening on http://{host}:{port} (LAN: http://{lan_ip}:{port})")
    uvicorn.run("main:app", host=host, port=port, reload=True)
