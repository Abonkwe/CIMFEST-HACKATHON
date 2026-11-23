from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from db import get_supabase_client
from schemas import LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


@router.post("/login", summary="Demo Phone Login with OTP (FR-1, FR-3)")
def login(req: LoginRequest):
    """Authenticate with a phone number and demo OTP (123456).

    Looks up user in `users`. If existing, returns the user record.
    If new, registers the user with role `fan_creator`.
    """
    if req.otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP code. Please use the demo code '123456'.",
        )

    client = get_supabase_client()
    try:
        res = client.table("users").select("*").eq("phone", req.phone.strip()).execute()
        if res.data and len(res.data) > 0:
            user = res.data[0]
        else:
            default_name = req.display_name or f"User {req.phone.strip()[-4:]}"
            new_user_data = {
                "phone": req.phone.strip(),
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
            user = insert_res.data[0]

        return {
            "access_token": str(user["id"]),
            "token_type": "bearer",
            "user": user,
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
    """Dependency to extract user ID from Bearer token and fetch the user record."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide 'Authorization: Bearer <user_id>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = credentials.credentials.strip()
    client = get_supabase_client()
    try:
        res = client.table("users").select("*").eq("id", user_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found with provided token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = res.data[0]

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


def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that ensures the authenticated user has the 'admin' role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to access this resource.",
        )
    return current_user
