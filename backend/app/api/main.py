import os, uuid, json, hashlib, tempfile
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from google.cloud import firestore, storage
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService

from app.config import VIDEO_BUCKET, EMERGENCY_ADVANCE_PHP, ADVANCE_FRACTION_WITHOUT_BASELINE
from app.tools.evidence import get_weather_history, get_flood_extent, classify_event
from app.tools.video import extract_inventory, compare_videos
from app.tools.lock import lock_evidence
from app.tools.claims import build_dossier
from app.tools.fraud import check_fraud
from app.agents.pipeline import claim_pipeline

app = FastAPI(title="Bayanihan API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db = firestore.Client()
gcs = storage.Client()


# ── helpers ──────────────────────────────────────────────────────────────────

def _upload_to_gcs(file_bytes: bytes, filename: str, policy_id: str, kind: str) -> str:
    bucket = gcs.bucket(VIDEO_BUCKET)
    blob_name = f"{policy_id}/{kind}/{filename}"
    blob = bucket.blob(blob_name)
    blob.upload_from_string(file_bytes, content_type="video/mp4")
    return f"gs://{VIDEO_BUCKET}/{blob_name}"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "bayanihan-api"}


# ── baselines ─────────────────────────────────────────────────────────────────

class BaselineFinalize(BaseModel):
    policy_id: str
    event_id: Optional[str] = None
    lat: float
    lon: float
    forecast_flood_depth_cm: int = 60
    rooms_covered: list[str]


@app.post("/uploads/baseline")
async def upload_baseline(
    file: UploadFile = File(...),
    policy_id: str = "",
    lat: float = 0.0,
    lon: float = 0.0,
    forecast_flood_depth_cm: int = 60,
):
    """Upload baseline video, extract inventory, lock evidence."""
    video_bytes = await file.read()
    baseline_id = str(uuid.uuid4())

    # Save temp file for Gemini Files API
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    # Upload to GCS for evidence lock
    gcs_uri = _upload_to_gcs(video_bytes, f"{baseline_id}.mp4", policy_id, "baseline")

    # Lock evidence (hash + Firestore record)
    evidence = lock_evidence(gcs_uri, policy_id, "baseline", lat, lon)

    # Extract inventory + coaching with Gemini
    inventory = extract_inventory(tmp_path, forecast_flood_depth_cm)
    os.unlink(tmp_path)

    # Store baseline record
    baseline_doc = {
        "baseline_id": baseline_id,
        "policy_id": policy_id,
        "evidence_id": evidence["sha256"],
        "gcs_uri": gcs_uri,
        "sha256": evidence["sha256"],
        "lat": lat,
        "lon": lon,
        "rooms_seen": inventory.get("rooms_seen", []),
        "inventory": inventory.get("items", []),
        "coaching_actions": inventory.get("coaching_actions", []),
        "status": "complete",
        "locked_at": evidence["locked_at"],
    }
    db.collection("baselines").document(baseline_id).set(baseline_doc)

    return {
        "baseline_id": baseline_id,
        "sha256": evidence["sha256"],
        "rooms_seen": inventory.get("rooms_seen", []),
        "coaching_actions": inventory.get("coaching_actions", []),
        "items_found": len(inventory.get("items", [])),
    }


# ── claims ────────────────────────────────────────────────────────────────────

class StartClaim(BaseModel):
    policy_id: str
    event_id: str
    baseline_id: str
    address_lat: float
    address_lon: float
    event_start_date: str   # YYYY-MM-DD
    event_end_date: str     # YYYY-MM-DD


@app.post("/claims")
async def start_claim(body: StartClaim):
    """Start a claim: confirm event, issue emergency advance."""
    claim_id = str(uuid.uuid4())

    # Get baseline
    baseline_doc = db.collection("baselines").document(body.baseline_id).get()
    has_baseline = baseline_doc.exists

    # Confirm event with weather evidence
    weather = get_weather_history(body.address_lat, body.address_lon,
                                  body.event_start_date, body.event_end_date)
    flood = get_flood_extent(body.address_lat, body.address_lon,
                             f"{body.event_start_date}", f"{body.event_end_date}",
                             f"{body.event_start_date}", f"{body.event_end_date}")
    classification = classify_event(
        flood.get("flooded_share"),
        weather["max_rainfall_mm"],
        weather["max_wind_kph"],
    )

    advance_paid = 0
    if classification == "confirmed":
        advance_paid = EMERGENCY_ADVANCE_PHP if has_baseline else int(EMERGENCY_ADVANCE_PHP * ADVANCE_FRACTION_WITHOUT_BASELINE)

    claim_doc = {
        "claim_id": claim_id,
        "policy_id": body.policy_id,
        "event_id": body.event_id,
        "baseline_id": body.baseline_id if has_baseline else None,
        "event_classification": classification,
        "weather_evidence": weather,
        "flood_evidence": flood,
        "advance_paid_php": advance_paid,
        "stage": "evidence_confirmed",
        "created_at": _now(),
    }
    db.collection("claims").document(claim_id).set(claim_doc)

    return {
        "claim_id": claim_id,
        "event_classification": classification,
        "advance_paid_php": advance_paid,
        "message": f"Event {classification}. Emergency advance: PHP {advance_paid:,}" if advance_paid else f"Event {classification}. No advance issued.",
    }


@app.post("/claims/{claim_id}/damage")
async def submit_damage(
    claim_id: str,
    file: UploadFile = File(...),
    lat: float = 0.0,
    lon: float = 0.0,
):
    """Upload damage walk video, run full claim pipeline, return dossier."""
    claim_doc = db.collection("claims").document(claim_id).get()
    if not claim_doc.exists:
        raise HTTPException(404, "Claim not found")
    claim = claim_doc.to_dict()

    video_bytes = await file.read()
    damage_id = str(uuid.uuid4())

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        damage_path = tmp.name

    # GCS + evidence lock
    gcs_uri = _upload_to_gcs(video_bytes, f"{damage_id}.mp4", claim["policy_id"], "damage")
    damage_evidence = lock_evidence(gcs_uri, claim["policy_id"], "damage", lat, lon)

    # Get baseline video path (download from GCS for comparison)
    baseline_id = claim.get("baseline_id")
    baseline_sha256, inventory_json = "", "[]"
    baseline_path = None

    if baseline_id:
        bl = db.collection("baselines").document(baseline_id).get().to_dict()
        baseline_sha256 = bl["sha256"]
        inventory_json = json.dumps(bl.get("inventory", []))
        # Download baseline video for comparison
        bl_blob_name = bl["gcs_uri"].removeprefix(f"gs://{VIDEO_BUCKET}/")
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as btmp:
            gcs.bucket(VIDEO_BUCKET).blob(bl_blob_name).download_to_file(btmp)
            baseline_path = btmp.name

    # Run video comparison
    if baseline_path:
        damage_report = compare_videos(baseline_path, damage_path, inventory_json)
        os.unlink(baseline_path)
    else:
        damage_report = {"findings": [], "water_line_cm": None, "summary": "No baseline — adjuster review required."}

    os.unlink(damage_path)

    # Fraud check
    policy_doc = db.collection("policies").document(claim["policy_id"]).get()
    policy = policy_doc.to_dict() if policy_doc.exists else {"lat": lat, "lon": lon}

    fraud_result = check_fraud(
        claim_id=claim_id,
        baseline_sha256=baseline_sha256,
        damage_sha256=damage_evidence["sha256"],
        baseline_gcs_uri=bl["gcs_uri"] if baseline_id else gcs_uri,
        damage_gcs_uri=gcs_uri,
        video_lat=lat,
        video_lon=lon,
        policy_lat=policy.get("lat", lat),
        policy_lon=policy.get("lon", lon),
        water_line_cm=damage_report.get("water_line_cm"),
        max_rainfall_mm=claim["weather_evidence"]["max_rainfall_mm"],
        damage_findings=damage_report.get("findings", []),
        manipulation_risk=damage_report.get("manipulation_risk", "none"),
        manipulation_flags=damage_report.get("manipulation_flags", []),
    )

    # Build dossier
    dossier = build_dossier(
        claim_id=claim_id,
        damage_findings=damage_report.get("findings", []),
        advance_paid_php=claim["advance_paid_php"],
    )

    # Update claim stage
    db.collection("claims").document(claim_id).update({
        "stage": "dossier_ready",
        "damage_evidence_sha256": damage_evidence["sha256"],
        "damage_gcs_uri": gcs_uri,
        "fraud_route": fraud_result["route"],
        "completed_at": _now(),
    })
    db.collection("dossiers").document(claim_id).set(dossier)

    return {
        "claim_id": claim_id,
        "policy_holder": claim.get("policy_id", "Claimant"),
        "fraud_route": fraud_result["route"],
        "fraud_score": fraud_result["score"],
        "fraud_flags": fraud_result["flags"],
        "net_payable_php": dossier["net_payable_php"],
        "recommendation": dossier["recommendation"],
        "coverage_items": dossier.get("coverage_items", []),
        "deductible_php": dossier.get("deductible_php", 5000),
        "advance_paid_php": claim["advance_paid_php"],
        "weather": {
            "rainfall_mm": claim["weather_evidence"]["max_rainfall_mm"],
            "wind_kph": claim["weather_evidence"]["max_wind_kph"],
        },
        "flood_evidence": claim.get("flood_evidence", {}),
        "dossier": dossier,
    }


@app.get("/claims/{claim_id}/dossier")
def get_dossier(claim_id: str):
    doc = db.collection("dossiers").document(claim_id).get()
    if not doc.exists:
        raise HTTPException(404, "Dossier not found")
    return doc.to_dict()


class AdjusterDecision(BaseModel):
    adjuster_id: str
    outcome: str   # approved | adjusted | declined
    amount_php: Optional[int] = None
    reason: Optional[str] = None


@app.post("/claims/{claim_id}/decision")
def adjuster_decision(claim_id: str, body: AdjusterDecision):
    """Record adjuster decision and close the claim."""
    db.collection("decisions").document(claim_id).set({
        "claim_id": claim_id,
        "adjuster_id": body.adjuster_id,
        "outcome": body.outcome,
        "amount_php": body.amount_php,
        "reason": body.reason,
        "decided_at": _now(),
    })
    db.collection("claims").document(claim_id).update({"stage": f"decided_{body.outcome}"})
    return {"claim_id": claim_id, "outcome": body.outcome, "amount_php": body.amount_php}


@app.get("/events/{event_id}/summary")
def event_summary(event_id: str):
    claims = db.collection("claims").where("event_id", "==", event_id).stream()
    claim_list = [c.to_dict() for c in claims]
    return {
        "event_id": event_id,
        "total_claims": len(claim_list),
        "advances_paid": sum(c.get("advance_paid_php", 0) for c in claim_list),
        "stages": {s: sum(1 for c in claim_list if c.get("stage") == s) for s in set(c.get("stage") for c in claim_list)},
    }


# ── Serve React frontend (must be last) ───────────────────────────────────────
_dist = Path(os.environ.get(
    "FRONTEND_DIST",
    str(Path(__file__).parent.parent.parent.parent / "frontend" / "dist")
))
_index = str(_dist / "index.html")

app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

# Explicit SPA routes — React Router handles client-side navigation
for _spa_path in ["/", "/walk", "/protection-plan", "/claim", "/adjuster"]:
    app.add_api_route(_spa_path, lambda: FileResponse(_index), methods=["GET"], include_in_schema=False)
