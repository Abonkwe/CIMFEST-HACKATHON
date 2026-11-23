from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class User(BaseModel):
    id: str
    phone: str
    display_name: str
    region: str
    role: str  # 'admin', 'artist', 'fan_creator'
    created_at: Optional[str] = None


class LoginRequest(BaseModel):
    phone: str
    otp_code: Optional[str] = "1234"


class AuthResponse(BaseModel):
    status: str
    user: User
    token: str


class Song(BaseModel):
    id: str
    artist_id: str
    artist_name: Optional[str] = None
    title: str
    genre: str
    language: str
    clip_url: str
    duration_sec: int
    bpm: int
    status: str  # 'trending', 'fresh'
    trending_score: float
    created_at: Optional[str] = None


class Challenge(BaseModel):
    id: str
    song_id: str
    song: Optional[Song] = None
    status: str  # 'active', 'ended'
    starts_at: Optional[str] = None
    ends_at: str
    created_at: Optional[str] = None


class MoveItem(BaseModel):
    start: float
    end: float
    action: str


class Creation(BaseModel):
    id: str
    challenge_id: str
    creator_id: str
    creator_name: Optional[str] = None
    creator_region: Optional[str] = None
    character: str
    moves_timeline: List[Dict[str, Any]] = Field(default_factory=list)
    caption: str
    views: int = 0
    vote_count: int = 0
    has_voted: bool = False
    created_at: Optional[str] = None


class VoteRequest(BaseModel):
    creation_id: str
    user_id: str


class VoteResponse(BaseModel):
    status: str
    creation_id: str
    total_votes: int
    message: str

