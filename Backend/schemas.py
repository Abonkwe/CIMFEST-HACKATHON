from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code, e.g. +237670000001")
    otp: str = Field(..., description="6-digit verification code. Use demo code: 123456")
    display_name: Optional[str] = Field(None, description="Optional user display name")
    region: Optional[str] = Field("Southwest", description="Cameroon region or 'Abroad'")


class SongCreate(BaseModel):
    title: str = Field(..., description="Title of the song")
    genre: str = Field(..., description="Genre e.g. Makossa, Bikutsi, Afropop")
    language: str = Field(..., description="Language e.g. Duala, Ewondo, English, Pidgin")
    clip_url: str = Field(..., description="Public URL to the 15-30s audio clip")
    duration_sec: int = Field(20, description="Clip duration in seconds (15 to 30)")
    bpm: int = Field(110, description="Beats per minute")


class MoveBlock(BaseModel):
    start: float = Field(..., description="Start timestamp in seconds")
    end: float = Field(..., description="End timestamp in seconds")
    action: str = Field(..., description="Dance action name e.g. sway, footwork, spin")


class CreationCreate(BaseModel):
    challenge_id: str = Field(..., description="UUID of the active challenge")
    character_id: str = Field(..., description="Character identifier e.g. KmerBoy, MboaGirl")
    moves_timeline: List[MoveBlock] = Field(..., description="List of synchronized dance move blocks")
    caption: Optional[str] = Field(None, description="Optional caption in English, French, or Pidgin")


class VoteCreate(BaseModel):
    creation_id: str = Field(..., description="UUID of the creation to vote for")


class ArtistApplyRequest(BaseModel):
    artist_name: str = Field(..., description="Stage / Artist Name")
    social_links: Dict[str, Any] = Field(default_factory=dict, description="Social media links, e.g. {'instagram': '...', 'twitter': '...'}")
    release_links: List[str] = Field(default_factory=list, description="Links to previous releases or tracks on Spotify, YouTube, etc.")


class ArtistReviewRequest(BaseModel):
    decision: Literal["approved", "rejected"] = Field(..., description="Admin review decision")


class ReportCreate(BaseModel):
    target_type: Literal["creation", "song"] = Field(..., description="Type of content being reported")
    target_id: str = Field(..., description="UUID of the reported creation or song")
    reason: str = Field(..., description="Reason for reporting (e.g. copyright, inappropriate content)")


class ModerateRequest(BaseModel):
    action: Literal["remove_creation", "remove_song", "suspend_user", "resolve_report"] = Field(
        ..., description="Moderation action to perform"
    )
    target_id: str = Field(..., description="UUID of the target entity to moderate")
    report_id: Optional[str] = Field(None, description="Optional ID of the report being resolved")
