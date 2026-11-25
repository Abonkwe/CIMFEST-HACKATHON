import os
import time
import uuid
from typing import Any, Dict, Optional
import httpx

FAPSHI_ENV = os.getenv("FAPSHI_ENV", "sandbox").strip().lower()
FAPSHI_BASE_URL = (
    "https://live.fapshi.com" if FAPSHI_ENV == "live" else "https://sandbox.fapshi.com"
)
FAPSHI_DEMO_MODE = os.getenv("FAPSHI_DEMO_MODE", "true").strip().lower() in (
    "1",
    "true",
    "yes",
)

FAPSHI_COLLECT_API_USER = os.getenv("FAPSHI_COLLECT_API_USER", "").strip()
FAPSHI_COLLECT_API_KEY = os.getenv("FAPSHI_COLLECT_API_KEY", "").strip()
FAPSHI_PAYOUT_API_USER = os.getenv("FAPSHI_PAYOUT_API_USER", "").strip()
FAPSHI_PAYOUT_API_KEY = os.getenv("FAPSHI_PAYOUT_API_KEY", "").strip()
FAPSHI_WEBHOOK_SECRET = os.getenv("FAPSHI_WEBHOOK_SECRET", "").strip()

# Tracks demo collection timestamps so status transitions PENDING -> SUCCESSFUL after 4s
_DEMO_COLLECTION_TIMESTAMPS: Dict[str, float] = {}


def is_demo_mode(service: str = "collect") -> bool:
    """Returns True when demo mode is enabled or API credentials for the service are missing."""
    if FAPSHI_DEMO_MODE:
        return True
    if service == "payout":
        return not (FAPSHI_PAYOUT_API_USER and FAPSHI_PAYOUT_API_KEY)
    return not (FAPSHI_COLLECT_API_USER and FAPSHI_COLLECT_API_KEY)


def normalize_cameroon_phone(phone: str) -> str:
    """Strip +237 / 237 and non-digits so Fapshi receives a 9-digit Cameroon number (e.g. 670000000)."""
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if digits.startswith("237") and len(digits) > 9:
        digits = digits[3:]
    if len(digits) > 9:
        digits = digits[-9:]
    return digits


def normalize_medium(medium: Optional[str]) -> str:
    lower = str(medium or "mobile money").strip().lower()
    if "orange" in lower or lower == "om":
        return "orange money"
    return "mobile money"


def _collect_headers() -> Dict[str, str]:
    return {
        "apiuser": FAPSHI_COLLECT_API_USER,
        "apikey": FAPSHI_COLLECT_API_KEY,
        "Content-Type": "application/json",
    }


def _payout_headers() -> Dict[str, str]:
    return {
        "apiuser": FAPSHI_PAYOUT_API_USER,
        "apikey": FAPSHI_PAYOUT_API_KEY,
        "Content-Type": "application/json",
    }


def direct_pay(
    amount: int,
    phone: str,
    medium: str = "mobile money",
    name: str = "BeatToons Fan",
    email: str = "fan@beattoons.cm",
    user_id: str = "",
    external_id: str = "",
    message: str = "BeatToons Artist Tip",
) -> Dict[str, Any]:
    """Initiate a Fapshi Mobile Money collection via POST /direct-pay."""
    clean_phone = normalize_cameroon_phone(phone)
    clean_medium = normalize_medium(medium)

    if is_demo_mode("collect") or not (FAPSHI_COLLECT_API_USER and FAPSHI_COLLECT_API_KEY):
        trans_id = f"fapshi_demo_{uuid.uuid4().hex[:12]}"
        _DEMO_COLLECTION_TIMESTAMPS[trans_id] = time.time()
        return {
            "transId": trans_id,
            "status": "PENDING",
            "message": "Demo Mobile Money prompt sent",
            "demo": True,
        }

    payload = {
        "amount": int(amount),
        "phone": clean_phone,
        "medium": clean_medium,
        "name": name or "BeatToons Fan",
        "email": email or "fan@beattoons.cm",
        "userId": str(user_id),
        "externalId": str(external_id),
        "message": message,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{FAPSHI_BASE_URL}/direct-pay",
                json=payload,
                headers=_collect_headers(),
            )
            data = resp.json() if resp.content else {}
            if resp.status_code >= 400:
                if FAPSHI_DEMO_MODE:
                    trans_id = f"fapshi_demo_{uuid.uuid4().hex[:12]}"
                    _DEMO_COLLECTION_TIMESTAMPS[trans_id] = time.time()
                    return {
                        "transId": trans_id,
                        "status": "PENDING",
                        "message": "Demo fallback Mobile Money prompt sent",
                        "demo": True,
                    }
                raise RuntimeError(data.get("message") or f"Fapshi direct-pay error ({resp.status_code})")

            return {
                "transId": data.get("transId") or data.get("trans_id") or f"fapshi_{uuid.uuid4().hex[:10]}",
                "status": str(data.get("status") or "PENDING").upper(),
                "message": data.get("message") or "Approve the Mobile Money prompt on your phone",
                "demo": False,
                "raw": data,
            }
    except Exception as exc:
        if FAPSHI_DEMO_MODE:
            trans_id = f"fapshi_demo_{uuid.uuid4().hex[:12]}"
            _DEMO_COLLECTION_TIMESTAMPS[trans_id] = time.time()
            return {
                "transId": trans_id,
                "status": "PENDING",
                "message": f"Demo fallback active ({exc})",
                "demo": True,
            }
        raise


def get_payment_status(trans_id: str) -> Dict[str, Any]:
    """Check Fapshi payment status via GET /payment-status/{trans_id}."""
    if not trans_id:
        return {"transId": "", "status": "PENDING", "demo": True}

    if trans_id.startswith("fapshi_demo_") or not (FAPSHI_COLLECT_API_USER and FAPSHI_COLLECT_API_KEY):
        created_ts = _DEMO_COLLECTION_TIMESTAMPS.get(trans_id)
        if created_ts is None:
            # Unknown demo ID (e.g. after server reload) -> treat as completed
            return {"transId": trans_id, "status": "SUCCESSFUL", "demo": True}
        elapsed = time.time() - created_ts
        status_val = "SUCCESSFUL" if elapsed >= 4.0 else "PENDING"
        return {"transId": trans_id, "status": status_val, "demo": True}

    try:
        with httpx.Client(timeout=12.0) as client:
            resp = client.get(
                f"{FAPSHI_BASE_URL}/payment-status/{trans_id}",
                headers=_collect_headers(),
            )
            data = resp.json() if resp.content else {}
            if resp.status_code >= 400:
                return {"transId": trans_id, "status": "PENDING", "demo": False, "raw": data}
            raw_status = str(data.get("status") or "PENDING").upper()
            return {"transId": trans_id, "status": raw_status, "demo": False, "raw": data}
    except Exception:
        return {"transId": trans_id, "status": "PENDING", "demo": False}


def disburse_payout(
    amount: int,
    phone: str,
    medium: str = "mobile money",
    name: str = "BeatToons Artist",
    email: str = "artist@beattoons.cm",
    user_id: str = "",
    external_id: str = "",
    message: str = "BeatToons Vault Payout",
) -> Dict[str, Any]:
    """Disburse Mobile Money funds to an artist via POST /payout."""
    clean_phone = normalize_cameroon_phone(phone)
    clean_medium = normalize_medium(medium)

    if is_demo_mode("payout") or not (FAPSHI_PAYOUT_API_USER and FAPSHI_PAYOUT_API_KEY):
        trans_id = f"fapshi_demo_payout_{uuid.uuid4().hex[:12]}"
        return {
            "transId": trans_id,
            "status": "SUCCESSFUL",
            "message": "Demo payout disbursed instantly",
            "demo": True,
        }

    payload = {
        "amount": int(amount),
        "phone": clean_phone,
        "medium": clean_medium,
        "name": name or "BeatToons Artist",
        "email": email or "artist@beattoons.cm",
        "userId": str(user_id),
        "externalId": str(external_id),
        "message": message,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                f"{FAPSHI_BASE_URL}/payout",
                json=payload,
                headers=_payout_headers(),
            )
            data = resp.json() if resp.content else {}
            if resp.status_code >= 400:
                if FAPSHI_DEMO_MODE:
                    trans_id = f"fapshi_demo_payout_{uuid.uuid4().hex[:12]}"
                    return {
                        "transId": trans_id,
                        "status": "SUCCESSFUL",
                        "message": "Demo fallback payout disbursed",
                        "demo": True,
                    }
                raise RuntimeError(data.get("message") or f"Fapshi payout error ({resp.status_code})")

            raw_status = str(data.get("status") or "SUCCESSFUL").upper()
            return {
                "transId": data.get("transId") or data.get("trans_id") or f"fapshi_po_{uuid.uuid4().hex[:10]}",
                "status": raw_status,
                "message": data.get("message") or "Payout initiated",
                "demo": False,
                "raw": data,
            }
    except Exception as exc:
        if FAPSHI_DEMO_MODE:
            trans_id = f"fapshi_demo_payout_{uuid.uuid4().hex[:12]}"
            return {
                "transId": trans_id,
                "status": "SUCCESSFUL",
                "message": f"Demo fallback payout ({exc})",
                "demo": True,
            }
        raise
