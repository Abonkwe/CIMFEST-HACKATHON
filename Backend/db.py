import os
from pathlib import Path
from typing import Optional
from fastapi import HTTPException
from supabase import create_client, Client

# Explicitly locate .env file from the backend directory
env_path = Path(__file__).resolve().parent / ".env"


def load_env_file(override: bool = False):
    """Loads .env file using python-dotenv if installed, or pure Python fallback."""
    try:
        from dotenv import load_dotenv

        load_dotenv(dotenv_path=env_path, override=override)
        return
    except ImportError:
        pass

    # Pure Python fallback so running with global python or VS Code doesn't crash
    if env_path.exists():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and (override or k not in os.environ):
                            os.environ[k] = v
        except Exception:
            pass


load_env_file()

_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Returns a reusable Supabase client instance.

    Re-checks the .env file dynamically if credentials were not set at initial module load.
    """
    global _client
    if _client is not None:
        return _client

    # Reload in case .env was edited while the dev server was running
    load_env_file(override=True)
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="Missing Supabase credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in backend/.env",
        )

    try:
        _client = create_client(url, key)
        return _client
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize Supabase client: {str(e)}",
        )
