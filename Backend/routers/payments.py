from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from auth import get_current_user
from db import get_supabase_client
import fapshi_service
from schemas import ArtistWithdrawRequest, FapshiDonateRequest

router = APIRouter(tags=["Payments & Artist Vault"])

# Fallback in-memory stores ONLY used if Supabase PostgREST schema cache returns PGRST205
_MEM_TRANSACTIONS: Dict[str, Dict[str, Any]] = {}
_MEM_LEDGER: List[Dict[str, Any]] = []


def _is_schema_cache_missing(exc: Exception) -> bool:
    msg = str(exc)
    return "PGRST205" in msg or "Could not find the table" in msg


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _insert_transaction(client, row: Dict[str, Any]) -> Dict[str, Any]:
    try:
        res = client.table("payment_transactions").insert(row).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return row
    except Exception as exc:
        if _is_schema_cache_missing(exc):
            _MEM_TRANSACTIONS[row["id"]] = dict(row)
            return dict(row)
        raise


def _update_transaction(client, tx_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        res = (
            client.table("payment_transactions")
            .update(updates)
            .eq("id", tx_id)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as exc:
        if _is_schema_cache_missing(exc):
            if tx_id in _MEM_TRANSACTIONS:
                _MEM_TRANSACTIONS[tx_id].update(updates)
                return dict(_MEM_TRANSACTIONS[tx_id])
            return None
        raise
    return None


def _get_transaction_by_id(client, tx_id: str) -> Optional[Dict[str, Any]]:
    try:
        res = (
            client.table("payment_transactions")
            .select("*")
            .eq("id", tx_id)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
    except Exception as exc:
        if _is_schema_cache_missing(exc):
            return _MEM_TRANSACTIONS.get(tx_id)
        raise


def _get_transaction_by_fapshi_id(client, fapshi_trans_id: str) -> Optional[Dict[str, Any]]:
    try:
        res = (
            client.table("payment_transactions")
            .select("*")
            .eq("fapshi_trans_id", fapshi_trans_id)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None
    except Exception as exc:
        if _is_schema_cache_missing(exc):
            for tx in _MEM_TRANSACTIONS.values():
                if tx.get("fapshi_trans_id") == fapshi_trans_id:
                    return tx
            return None
        raise


def _insert_ledger_entry(client, entry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        res = client.table("ledger_entries").insert(entry).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return entry
    except Exception as exc:
        msg = str(exc).lower()
        if _is_schema_cache_missing(exc):
            tx_id = entry.get("transaction_id")
            if tx_id and any(
                e.get("transaction_id") == tx_id and e.get("entry_type") == entry.get("entry_type")
                for e in _MEM_LEDGER
            ):
                return None
            _MEM_LEDGER.append(dict(entry))
            return dict(entry)
        # Idempotency: ignore unique constraint violation on transaction_id
        if "duplicate" in msg or "23505" in msg or "unique" in msg:
            return None
        raise


def _fetch_artist_ledger(client, artist_id: str) -> List[Dict[str, Any]]:
    try:
        res = (
            client.table("ledger_entries")
            .select("*")
            .eq("artist_id", artist_id)
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as exc:
        if _is_schema_cache_missing(exc):
            items = [e for e in _MEM_LEDGER if e.get("artist_id") == artist_id]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)
        raise


def _fetch_artist_transactions(client, artist_id: str) -> List[Dict[str, Any]]:
    try:
        res = (
            client.table("payment_transactions")
            .select("*")
            .eq("artist_id", artist_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return res.data or []
    except Exception as exc:
        if _is_schema_cache_missing(exc):
            items = [tx for tx in _MEM_TRANSACTIONS.values() if tx.get("artist_id") == artist_id]
            return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)[:50]
        raise


def _compute_vault_totals(ledger: List[Dict[str, Any]]) -> Dict[str, int]:
    total_earned = 0
    total_withdrawn = 0
    total_refunded = 0
    for entry in ledger:
        etype = entry.get("entry_type")
        amt = int(entry.get("amount_xaf") or 0)
        if etype == "credit_tip":
            total_earned += amt
        elif etype == "debit_withdrawal":
            total_withdrawn += amt
        elif etype == "credit_refund":
            total_refunded += amt

    net_withdrawn = max(0, total_withdrawn - total_refunded)
    available = max(0, total_earned - net_withdrawn)
    return {
        "total_earned_xaf": total_earned,
        "total_withdrawn_xaf": net_withdrawn,
        "available_balance_xaf": available,
    }


def _mark_collection_successful_idempotent(client, tx: Dict[str, Any]) -> Dict[str, Any]:
    """Idempotently mark payment_transactions.status = 'SUCCESSFUL' and credit artist ledger."""
    tx_id = tx["id"]
    updated = _update_transaction(client, tx_id, {"status": "SUCCESSFUL"})
    if updated:
        tx = updated
    else:
        tx = {**tx, "status": "SUCCESSFUL"}

    # Check if credit_tip already exists for this transaction_id
    existing_ledger = _fetch_artist_ledger(client, tx["artist_id"])
    already_credited = any(
        e.get("transaction_id") == tx_id and e.get("entry_type") == "credit_tip"
        for e in existing_ledger
    )
    if not already_credited:
        _insert_ledger_entry(
            client,
            {
                "id": str(uuid.uuid4()),
                "artist_id": tx["artist_id"],
                "transaction_id": tx_id,
                "entry_type": "credit_tip",
                "amount_xaf": int(tx.get("net_amount_xaf") or tx.get("gross_amount_xaf") or 0),
                "created_at": _now_iso(),
            },
        )
    return tx


@router.post("/payments/fapshi/donate", summary="Donate / Tip an artist via Fapshi Mobile Money")
def donate_via_fapshi(
    req: FapshiDonateRequest,
    current_user: dict = Depends(get_current_user),
):
    clean_phone = fapshi_service.normalize_cameroon_phone(req.phone)
    if len(clean_phone) < 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 9-digit Cameroon Mobile Money number.",
        )

    client = get_supabase_client()
    tx_id = str(uuid.uuid4())
    is_demo = fapshi_service.is_demo_mode("collect")
    net_amount = req.amount_xaf if is_demo else round(req.amount_xaf * 0.97)

    tx_row: Dict[str, Any] = {
        "id": tx_id,
        "artist_id": req.artist_id,
        "direction": "collection",
        "status": "PENDING",
        "gross_amount_xaf": req.amount_xaf,
        "net_amount_xaf": net_amount,
        "phone": clean_phone,
        "medium": req.medium,
        "created_at": _now_iso(),
    }
    if req.creation_id:
        tx_row["creation_id"] = req.creation_id

    _insert_transaction(client, tx_row)

    try:
        fapshi_res = fapshi_service.direct_pay(
            amount=req.amount_xaf,
            phone=clean_phone,
            medium=req.medium,
            name=current_user.get("display_name") or "BeatToons Fan",
            user_id=current_user["id"],
            external_id=tx_id,
            message="BeatToons Artist Tip",
        )
    except Exception as exc:
        _update_transaction(client, tx_id, {"status": "FAILED"})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Fapshi payment initiation failed: {str(exc)}",
        )

    fapshi_trans_id = fapshi_res["transId"]
    _update_transaction(client, tx_id, {"fapshi_trans_id": fapshi_trans_id})

    return {
        "transaction_id": tx_id,
        "fapshi_trans_id": fapshi_trans_id,
        "status": "PENDING",
        "net_amount_xaf": net_amount,
        "demo": fapshi_res.get("demo", False),
        "message": "Approve the Mobile Money prompt on your phone",
    }


@router.get("/payments/fapshi/status/{transaction_id}", summary="Check Fapshi donation status")
def get_fapshi_payment_status(transaction_id: str):
    client = get_supabase_client()
    tx = _get_transaction_by_id(client, transaction_id)
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment transaction not found.",
        )

    current_status = str(tx.get("status") or "PENDING").upper()
    if current_status == "SUCCESSFUL":
        tx = _mark_collection_successful_idempotent(client, tx)
        return {
            "transaction_id": tx["id"],
            "fapshi_trans_id": tx.get("fapshi_trans_id"),
            "status": "SUCCESSFUL",
            "gross_amount_xaf": tx.get("gross_amount_xaf"),
            "net_amount_xaf": tx.get("net_amount_xaf"),
        }

    fapshi_trans_id = tx.get("fapshi_trans_id") or ""
    status_res = fapshi_service.get_payment_status(fapshi_trans_id)
    remote_status = str(status_res.get("status") or "PENDING").upper()

    if remote_status == "SUCCESSFUL":
        tx = _mark_collection_successful_idempotent(client, tx)
    elif remote_status in ("FAILED", "EXPIRED"):
        _update_transaction(client, tx["id"], {"status": remote_status})
        tx["status"] = remote_status

    return {
        "transaction_id": tx["id"],
        "fapshi_trans_id": fapshi_trans_id,
        "status": tx.get("status", "PENDING"),
        "gross_amount_xaf": tx.get("gross_amount_xaf"),
        "net_amount_xaf": tx.get("net_amount_xaf"),
    }


@router.post("/webhooks/fapshi", summary="Fapshi payment webhook callback")
async def fapshi_webhook(
    request: Request,
    x_fapshi_secret: Optional[str] = Header(default=None),
):
    if fapshi_service.FAPSHI_WEBHOOK_SECRET:
        if x_fapshi_secret != fapshi_service.FAPSHI_WEBHOOK_SECRET:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook secret.",
            )

    payload = await request.json()
    fapshi_trans_id = str(payload.get("transId") or payload.get("trans_id") or "").strip()
    external_id = str(payload.get("externalId") or payload.get("external_id") or "").strip()
    remote_status = str(payload.get("status") or "").strip().upper()

    client = get_supabase_client()
    tx = None
    if external_id:
        tx = _get_transaction_by_id(client, external_id)
    if not tx and fapshi_trans_id:
        tx = _get_transaction_by_fapshi_id(client, fapshi_trans_id)

    if not tx:
        return {"status": "ignored", "reason": "transaction_not_found"}

    if remote_status == "SUCCESSFUL" and tx.get("direction") == "collection":
        _mark_collection_successful_idempotent(client, tx)
    elif remote_status in ("FAILED", "EXPIRED"):
        _update_transaction(client, tx["id"], {"status": remote_status})

    return {"status": "ok", "transaction_id": tx["id"], "payment_status": remote_status or tx.get("status")}


@router.get("/artists/me/vault", summary="Get authenticated artist's vault balance, ledger, and transactions")
def get_artist_vault(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "artist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verified artists can access the Artist Vault.",
        )

    client = get_supabase_client()
    artist_id = current_user["id"]
    ledger = _fetch_artist_ledger(client, artist_id)
    transactions = _fetch_artist_transactions(client, artist_id)
    totals = _compute_vault_totals(ledger)

    return {
        "status": "ok",
        **totals,
        "ledger": ledger,
        "transactions": transactions,
    }


@router.post("/artists/me/withdraw", summary="Withdraw available vault balance to artist's Mobile Money")
def withdraw_from_artist_vault(
    req: ArtistWithdrawRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "artist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verified artists can withdraw from the Artist Vault.",
        )

    raw_phone = req.phone or current_user.get("phone") or ""
    clean_phone = fapshi_service.normalize_cameroon_phone(raw_phone)
    if len(clean_phone) < 9:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid 9-digit Cameroon Mobile Money number is required for payout.",
        )

    client = get_supabase_client()
    artist_id = current_user["id"]
    ledger = _fetch_artist_ledger(client, artist_id)
    totals = _compute_vault_totals(ledger)

    if req.amount_xaf > totals["available_balance_xaf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient vault balance. Available: {totals['available_balance_xaf']} XAF.",
        )

    tx_id = str(uuid.uuid4())
    tx_row: Dict[str, Any] = {
        "id": tx_id,
        "artist_id": artist_id,
        "direction": "payout",
        "status": "PENDING",
        "gross_amount_xaf": req.amount_xaf,
        "net_amount_xaf": req.amount_xaf,
        "phone": clean_phone,
        "medium": req.medium,
        "created_at": _now_iso(),
    }
    _insert_transaction(client, tx_row)

    # Immediately lock funds in ledger_entries to prevent double-withdrawal
    _insert_ledger_entry(
        client,
        {
            "id": str(uuid.uuid4()),
            "artist_id": artist_id,
            "transaction_id": tx_id,
            "entry_type": "debit_withdrawal",
            "amount_xaf": req.amount_xaf,
            "created_at": _now_iso(),
        },
    )

    try:
        payout_res = fapshi_service.disburse_payout(
            amount=req.amount_xaf,
            phone=clean_phone,
            medium=req.medium,
            name=current_user.get("display_name") or "BeatToons Artist",
            user_id=artist_id,
            external_id=tx_id,
            message="BeatToons Vault Payout",
        )
        fapshi_trans_id = payout_res["transId"]
        _update_transaction(
            client,
            tx_id,
            {"status": "SUCCESSFUL", "fapshi_trans_id": fapshi_trans_id},
        )
    except Exception as exc:
        _update_transaction(client, tx_id, {"status": "FAILED"})
        # Roll back locked funds with a credit_refund entry (transaction_id=None to avoid unique conflict)
        _insert_ledger_entry(
            client,
            {
                "id": str(uuid.uuid4()),
                "artist_id": artist_id,
                "entry_type": "credit_refund",
                "amount_xaf": req.amount_xaf,
                "created_at": _now_iso(),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Payout failed and funds were refunded to your vault: {str(exc)}",
        )

    updated_ledger = _fetch_artist_ledger(client, artist_id)
    updated_totals = _compute_vault_totals(updated_ledger)

    return {
        "status": "SUCCESSFUL",
        "transaction_id": tx_id,
        "fapshi_trans_id": fapshi_trans_id,
        "amount_xaf": req.amount_xaf,
        "phone": clean_phone,
        "medium": req.medium,
        **updated_totals,
        "message": f"{req.amount_xaf:,} XAF sent to {clean_phone} ({req.medium})",
    }
