import re
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator

VALID_REGIONS = (
    "Southwest",
    "Littoral",
    "Centre",
    "Northwest",
    "West",
    "South",
    "East",
    "Adamawa",
    "North",
    "Far North",
    "Abroad",
)
_REGION_LOOKUP = {r.lower(): r for r in VALID_REGIONS}
CAMEROON_PHONE_RE = re.compile(r"^\+237[26]\d{8}$")


def normalize_phone_number(raw: str) -> str:
    """Strip spaces/punctuation and normalize Cameroonian phone numbers to +237 format."""
    cleaned = re.sub(r"[\s\-()]+", "", str(raw or "").strip())
    if not cleaned:
        return ""
    if cleaned.startswith("00237"):
        cleaned = "+237" + cleaned[5:]
    elif cleaned.startswith("237") and len(cleaned) == 12 and cleaned[3:].isdigit():
        cleaned = "+" + cleaned
    elif len(cleaned) == 9 and cleaned.isdigit() and cleaned[0] in ("6", "2"):
        cleaned = "+237" + cleaned
    elif cleaned.startswith("+237"):
        pass
    return cleaned


def normalize_region_value(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    cleaned = str(raw).strip()
    if not cleaned:
        return None
    return _REGION_LOOKUP.get(cleaned.lower(), cleaned)


class LoginRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code, e.g. +237670000001")
    otp: str = Field(..., description="6-digit verification code. Use demo code: 123456")
    display_name: Optional[str] = Field(None, description="Optional user display name")
    region: Optional[str] = Field(None, description="Cameroon region or 'Abroad'")

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, v: Any) -> str:
        if v is None:
            return ""
        return normalize_phone_number(str(v))

    @field_validator("otp", mode="before")
    @classmethod
    def strip_otp(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("phone")
    @classmethod
    def validate_phone_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("Phone number is required.")
        if not CAMEROON_PHONE_RE.match(v):
            raise ValueError(
                "Please enter a valid 9-digit Cameroonian phone number starting with 6 or 2 (e.g. +237 670 000 001)."
            )
        return v

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        cleaned = str(v).strip()
        return cleaned if cleaned else None

    @field_validator("region", mode="before")
    @classmethod
    def normalize_region(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return normalize_region_value(str(v))


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(None, description="Updated display name")
    region: Optional[str] = Field(None, description="Cameroon region or 'Abroad'")

    @field_validator("display_name", mode="before")
    @classmethod
    def validate_display_name(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        cleaned = str(v).strip()
        if not cleaned:
            raise ValueError("Display name cannot be empty.")
        if len(cleaned) > 60:
            raise ValueError("Display name must be 60 characters or fewer.")
        return cleaned

    @field_validator("region", mode="before")
    @classmethod
    def validate_region(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        cleaned = str(v).strip()
        if not cleaned:
            raise ValueError("Region cannot be empty.")
        canonical = _REGION_LOOKUP.get(cleaned.lower())
        if not canonical:
            raise ValueError(
                f"Invalid region '{cleaned}'. Must be one of: {', '.join(VALID_REGIONS)}."
            )
        return canonical


class AdminAccessRequest(BaseModel):
    phone: str = Field(..., description="Cameroonian phone number (+237...)")
    admin_code: str = Field(..., description="Team admin access passcode")

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_admin_phone(cls, v: Any) -> str:
        if v is None:
            return ""
        return normalize_phone_number(str(v))

    @field_validator("phone")
    @classmethod
    def validate_admin_phone(cls, v: str) -> str:
        if not v or not CAMEROON_PHONE_RE.match(v):
            raise ValueError(
                "Please enter a valid 9-digit Cameroonian phone number starting with 6 or 2."
            )
        return v

    @field_validator("admin_code", mode="before")
    @classmethod
    def strip_admin_code(cls, v: Any) -> str:
        cleaned = str(v or "").strip()
        if not cleaned:
            raise ValueError("Admin passcode is required.")
        return cleaned


class SongCreate(BaseModel):
    title: str = Field(..., description="Title of the song")
    album_name: str = Field("Single", description="Album / EP name or 'Single'")
    genre: str = Field(..., description="Genre e.g. Makossa, Bikutsi, Afropop, Hip Hop")
    language: str = Field(..., description="Language e.g. Duala, Ewondo, English, Pidgin")
    clip_url: str = Field(..., description="Public URL to the 15-30s audio clip")
    duration_sec: int = Field(20, description="Clip duration in seconds (15 to 30)")
    bpm: int = Field(110, description="Beats per minute")

    @field_validator("title", "genre", "language", "clip_url", mode="before")
    @classmethod
    def strip_song_strings(cls, v: Any) -> str:
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("album_name", mode="before")
    @classmethod
    def normalize_album_name(cls, v: Any) -> str:
        cleaned = str(v or "").strip()
        return cleaned if cleaned else "Single"

    @field_validator("title", "genre", "language", "clip_url")
    @classmethod
    def validate_song_strings(cls, v: str) -> str:
        if not v:
            raise ValueError("Field cannot be empty.")
        return v


class AlbumTrackCreate(BaseModel):
    title: str = Field(..., description="Track title")
    clip_url: str = Field(..., description="Public URL to the 15-30s audio clip")
    duration_sec: int = Field(20, description="Clip duration in seconds (15 to 30)")
    bpm: int = Field(110, description="Beats per minute")
    genre: Optional[str] = Field(None, description="Optional genre override for this track")
    language: Optional[str] = Field(None, description="Optional language override for this track")

    @field_validator("title", "clip_url", mode="before")
    @classmethod
    def strip_track_strings(cls, v: Any) -> str:
        return str(v or "").strip()

    @field_validator("title", "clip_url")
    @classmethod
    def validate_track_strings(cls, v: str) -> str:
        if not v:
            raise ValueError("Track title and clip_url are required.")
        return v


class AlbumCreate(BaseModel):
    album_name: str = Field(..., description="Album or EP title")
    genre: str = Field(..., description="Primary genre e.g. Makossa, Bikutsi, Afropop")
    language: str = Field(..., description="Primary language e.g. Duala, Pidgin, English")
    tracks: List[AlbumTrackCreate] = Field(..., description="1 to 10 tracks in the Album/EP")

    @field_validator("album_name", "genre", "language", mode="before")
    @classmethod
    def strip_album_strings(cls, v: Any) -> str:
        return str(v or "").strip()

    @field_validator("album_name", "genre", "language")
    @classmethod
    def validate_album_strings(cls, v: str) -> str:
        if not v:
            raise ValueError("Album name, genre, and language are required.")
        return v


class ArtistChallengeCreate(BaseModel):
    song_id: str = Field(..., description="UUID of the artist's song")
    title: str = Field(..., description="Challenge title")
    duration_hours: int = Field(48, ge=1, le=720, description="Challenge duration in hours (1 to 720)")

    @field_validator("song_id", "title", mode="before")
    @classmethod
    def strip_challenge_fields(cls, v: Any) -> str:
        return str(v or "").strip()

    @field_validator("song_id", "title")
    @classmethod
    def validate_challenge_fields(cls, v: str) -> str:
        if not v:
            raise ValueError("song_id and title are required.")
        return v


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
    momo_phone: str = Field(..., description="MTN Mobile Money phone number (+237...)")
    amount_xaf: int = Field(100, ge=100, description="Vote payment amount in XAF (minimum 100 XAF)")
    payment_provider: Literal["MTN_MOMO"] = Field("MTN_MOMO", description="Payment provider (MTN_MOMO)")
    payment_reference: Optional[str] = Field(None, description="Optional MTN MoMo transaction reference")

    @field_validator("momo_phone", mode="before")
    @classmethod
    def normalize_momo_phone(cls, v: Any) -> str:
        if v is None:
            return ""
        return normalize_phone_number(str(v))

    @field_validator("momo_phone")
    @classmethod
    def validate_momo_phone(cls, v: str) -> str:
        if not v or not CAMEROON_PHONE_RE.match(v):
            raise ValueError(
                "Please enter a valid Cameroonian MTN MoMo number (e.g. +237 670 000 001)."
            )
        return v


class ArtistApplyRequest(BaseModel):
    artist_name: str = Field(..., description="Stage / Artist Name")
    full_legal_name: str = Field(..., description="Full legal name for identity verification")
    email: str = Field(..., description="Verification contact email")
    country_of_residence: str = Field("Cameroon", description="Country of residence")
    primary_genre: str = Field("Afropop", description="Primary music genre")
    bio: Optional[str] = Field(None, description="Short artist bio")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL or base64 data URI")
    social_links: Optional[Union[Dict[str, Any], List[str], str]] = Field(
        default_factory=dict,
        description="Social media links, e.g. {'instagram': '...', 'tiktok': '...'}",
    )
    release_links: Optional[Union[List[str], str]] = Field(
        default_factory=list,
        description="Links to previous releases or tracks on Spotify, YouTube, etc.",
    )

    @field_validator("artist_name", "full_legal_name", "email", mode="before")
    @classmethod
    def strip_required_artist_fields(cls, v: Any) -> str:
        return str(v or "").strip()

    @field_validator("artist_name", "full_legal_name")
    @classmethod
    def validate_required_artist_fields(cls, v: str) -> str:
        if not v:
            raise ValueError("Field is required.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or "@" not in v or "." not in v.split("@", 1)[-1]:
            raise ValueError("A valid verification email address is required.")
        return v

    @field_validator("country_of_residence", mode="before")
    @classmethod
    def normalize_country(cls, v: Any) -> str:
        cleaned = str(v or "").strip()
        return cleaned if cleaned else "Cameroon"

    @field_validator("primary_genre", mode="before")
    @classmethod
    def normalize_primary_genre(cls, v: Any) -> str:
        cleaned = str(v or "").strip()
        return cleaned if cleaned else "Afropop"

    @field_validator("bio", "avatar_url", mode="before")
    @classmethod
    def normalize_optional_artist_text(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        cleaned = str(v).strip()
        return cleaned if cleaned else None

    @field_validator("social_links", mode="before")
    @classmethod
    def normalize_social_links(cls, v: Any) -> Dict[str, Any]:
        if v is None or v == "":
            return {}
        if isinstance(v, str):
            cleaned = v.strip()
            return {"primary": cleaned} if cleaned else {}
        if isinstance(v, list):
            return {
                f"link_{idx + 1}": str(item).strip()
                for idx, item in enumerate(v)
                if item is not None and str(item).strip()
            }
        if isinstance(v, dict):
            return {
                str(k).strip(): str(val).strip()
                for k, val in v.items()
                if val is not None and str(val).strip()
            }
        return {}

    @field_validator("release_links", mode="before")
    @classmethod
    def normalize_release_links(cls, v: Any) -> List[str]:
        if v is None or v == "":
            return []
        if isinstance(v, str):
            return [part.strip() for part in v.split(",") if part.strip()]
        if isinstance(v, list):
            return [
                str(item).strip()
                for item in v
                if item is not None and str(item).strip()
            ]
        return []


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
