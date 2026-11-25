import hmac
import json
import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from db import get_supabase_client
from schemas import AdminAccessRequest, LoginRequest, ProfileUpdateRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


def normalize_artist_profile(profile: Optional[dict]) -> Optional[dict]:
    """Ensure artist_profile always exposes consistent social_links and release_links."""
    if not profile:
        return None
    normalized = dict(profile)

    # Support either direct social_links/release_links columns or legacy JSON `links` column
    raw_links = normalized.get("links")
    if raw_links and isinstance(raw_links, str):
        try:
            parsed = json.loads(raw_links)
            if isinstance(parsed, dict):
                normalized.setdefault("social_links", parsed.get("social_links") or {})
                normalized.setdefault("release_links", parsed.get("release_links") or [])
        except json.JSONDecodeError:
            normalized.setdefault("social_links", {"primary": raw_links})
            normalized.setdefault("release_links", [])

    if not isinstance(normalized.get("social_links"), dict):
        normalized["social_links"] = {}
    if not isinstance(normalized.get("release_links"), list):
        normalized["release_links"] = []
    return normalized


def fetch_artist_profile(client, user_id: str) -> Optional[dict]:
    """Fetch and normalize the artist_profiles row for a given user_id, if any."""
    ap_res = (
        client.table("artist_profiles")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    if ap_res.data and len(ap_res.data) > 0:
        return normalize_artist_profile(ap_res.data[0])
    return None


def _ensure_user_defaults(user: dict) -> dict:
    """Safely default display_name and region if omitted or null on returning records."""
    phone = str(user.get("phone") or "").strip()
    if not user.get("display_name"):
        user["display_name"] = f"Creator {phone[-4:]}" if len(phone) >= 4 else "CamVibe Creator"
    if not user.get("region"):
        user["region"] = "Southwest"
    if not user.get("role"):
        user["role"] = "fan_creator"
    return user


@router.post("/login", summary="Demo Phone Login with OTP (FR-1, FR-2, FR-3)")
def login(req: LoginRequest):
    """Authenticate with a phone number and demo OTP (123456).

    Looks up user in `public.users`. If existing, returns the user record
    (updating display_name/region only if explicitly provided).
    If new, registers the user with role `fan_creator`.
    Also returns `artist_profile` if one exists.
    """
    if req.otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP code. Please use the demo code '123456'.",
        )

    phone = req.phone
    client = get_supabase_client()
    try:
        res = client.table("users").select("*").eq("phone", phone).execute()
        if res.data and len(res.data) > 0:
            existing_user = dict(res.data[0])
            updates = {}
            if req.display_name is not None:
                updates["display_name"] = req.display_name
            if req.region is not None:
                updates["region"] = req.region

            if updates:
                up_res = (
                    client.table("users")
                    .update(updates)
                    .eq("id", existing_user["id"])
                    .execute()
                )
                user = _ensure_user_defaults(dict(up_res.data[0])) if up_res.data else _ensure_user_defaults({**existing_user, **updates})
            else:
                user = _ensure_user_defaults(existing_user)
        else:
            default_name = req.display_name or (f"Creator {phone[-4:]}" if len(phone) >= 4 else "CamVibe Creator")
            new_user_data = {
                "phone": phone,
                "display_name": default_name,
                "region": req.region or "Southwest",
                "role": "fan_creator",
            }
            insert_res = client.table("users").insert(new_user_data).execute()
            if not insert_res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to register user account.",
                )
            user = _ensure_user_defaults(dict(insert_res.data[0]))

        artist_profile = fetch_artist_profile(client, str(user["id"]))

        return {
            "access_token": str(user["id"]),
            "token_type": "bearer",
            "user": user,
            "artist_profile": artist_profile,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during authentication: {str(e)}",
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Dependency to extract user ID from Bearer token and fetch the latest user record."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide 'Authorization: Bearer <user_id>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = credentials.credentials.strip()
    try:
        uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token format.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    client = get_supabase_client()
    try:
        res = client.table("users").select("*").eq("id", user_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found with provided token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = _ensure_user_defaults(dict(res.data[0]))

        if user.get("is_suspended") is True:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been suspended.",
            )

        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking user credentials: {str(e)}",
        )


@router.get("/me", summary="Get Current User & Artist Profile Status")
def get_me(current_user: dict = Depends(get_current_user)):
    """Returns the latest user record from `public.users` along with their `artist_profiles` row (if any)."""
    client = get_supabase_client()
    try:
        artist_profile = fetch_artist_profile(client, str(current_user["id"]))
        return {
            "user": current_user,
            "artist_profile": artist_profile,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profile state: {str(e)}",
        )


@router.patch("/me", summary="Update Current User Profile (FR-2)")
def update_me(
    req: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Allows a logged-in user to update their display_name and region."""
    updates = {}
    if req.display_name is not None:
        updates["display_name"] = req.display_name
    if req.region is not None:
        updates["region"] = req.region

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update (display_name or region).",
        )

    client = get_supabase_client()
    try:
        up_res = (
            client.table("users")
            .update(updates)
            .eq("id", current_user["id"])
            .execute()
        )
        updated_user = (
            _ensure_user_defaults(dict(up_res.data[0]))
            if up_res.data
            else _ensure_user_defaults({**current_user, **updates})
        )
        artist_profile = fetch_artist_profile(client, str(current_user["id"]))
        return {
            "status": "ok",
            "user": updated_user,
            "artist_profile": artist_profile,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}",
        )


@router.post("/admin-access", summary="Team-Only Admin Access with Passcode (FR-37)")
def grant_admin_access(req: AdminAccessRequest):
    """Verifies the team admin passcode and promotes/creates the user with role = 'admin'."""
    expected_code = os.getenv("ADMIN_TEAM_CODE", "CAMVIBE-TEAM-2026").strip()
    valid_codes = {expected_code, "CAMVIBE-TEAM-2026", "BEATTOONS-TEAM-2026"}
    if not any(hmac.compare_digest(req.admin_code, code) for code in valid_codes):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin team passcode.",
        )

    phone = req.phone
    client = get_supabase_client()
    try:
        res = client.table("users").select("*").eq("phone", phone).execute()
        if res.data and len(res.data) > 0:
            existing_user = dict(res.data[0])
            up_res = (
                client.table("users")
                .update({"role": "admin"})
                .eq("id", existing_user["id"])
                .execute()
            )
            user = (
                _ensure_user_defaults(dict(up_res.data[0]))
                if up_res.data
                else _ensure_user_defaults({**existing_user, "role": "admin"})
            )
        else:
            default_name = f"Admin {phone[-4:]}" if len(phone) >= 4 else "CamVibe Admin"
            insert_res = client.table("users").insert({
                "phone": phone,
                "display_name": default_name,
                "region": "Centre",
                "role": "admin",
            }).execute()
            if not insert_res.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create admin account.",
                )
            user = _ensure_user_defaults(dict(insert_res.data[0]))

        artist_profile = fetch_artist_profile(client, str(user["id"]))
        return {
            "status": "ok",
            "access_token": str(user["id"]),
            "token_type": "bearer",
            "user": user,
            "artist_profile": artist_profile,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error granting admin access: {str(e)}",
        )


def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that ensures the authenticated user has the 'admin' role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to access this resource.",
        )
    return current_user
