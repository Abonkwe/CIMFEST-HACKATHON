from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from db import get_supabase_client
from routers.admin import router as admin_router
from routers.artists import router as artists_router
from routers.challenges import router as challenges_router
from routers.creations import router as creations_router
from routers.feed import router as feed_router
from routers.reports import router as reports_router
from routers.songs import router as songs_router
from routers.votes import router as votes_router

app = FastAPI(
    title="BeatToons API",
    description="Backend API for BeatToons — a Cameroon-first mobile music challenge platform (CIMFEST Hackathon 2026).",
    version="1.0.0",
)

# Configure CORS for localhost and local network devices (e.g. mobile phones on Wi-Fi)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$",
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
app.include_router(reports_router)
app.include_router(admin_router)


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
