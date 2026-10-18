from google.cloud import firestore
from app.config import GPS_FRAUD_METRES, FRAUD_CONFIDENCE_MIN


def check_fraud(claim_id: str, baseline_sha256: str, damage_sha256: str,
                baseline_gcs_uri: str, damage_gcs_uri: str,
                video_lat: float, video_lon: float,
                policy_lat: float, policy_lon: float,
                water_line_cm: int | None, max_rainfall_mm: float,
                damage_findings: list[dict],
                manipulation_risk: str = "none",
                manipulation_flags: list[str] | None = None) -> dict:
    """
    Runs all fraud integrity checks and returns a score (0-100) and route.
    Score < 30: clear. 30-69: review. >= 70: hold.
    """
    from app.tools.lock import verify_hash
    from app.tools.evidence import verify_location

    flags = []
    score = 0

    # 1. Hash integrity
    baseline_check = verify_hash(baseline_gcs_uri, baseline_sha256)
    damage_check = verify_hash(damage_gcs_uri, damage_sha256)
    if not baseline_check["match"]:
        flags.append({"check": "hash_baseline", "detail": "Baseline video hash mismatch — file was modified after locking.", "weight": 70})
        score += 70
    if not damage_check["match"]:
        flags.append({"check": "hash_damage", "detail": "Damage video hash mismatch — file was modified after upload.", "weight": 70})
        score += 70

    # 2. GPS location check
    location = verify_location(video_lat, video_lon, policy_lat, policy_lon)
    dist = location["distance_metres"]
    if dist > GPS_FRAUD_METRES:
        flags.append({"check": "gps_distance", "detail": f"Damage video recorded {dist:.0f}m from insured address — exceeds 500m threshold.", "weight": 40})
        score += 40
    elif dist > 50:
        flags.append({"check": "gps_distance", "detail": f"Damage video recorded {dist:.0f}m from insured address — review recommended.", "weight": 15})
        score += 15

    # 3. Flood height consistency
    if water_line_cm is not None and max_rainfall_mm < 50:
        flags.append({"check": "flood_consistency", "detail": f"Water line of {water_line_cm}cm claimed but rainfall was only {max_rainfall_mm}mm — inconsistent.", "weight": 25})
        score += 25

    # 4. Low confidence findings
    low_conf = [f for f in damage_findings if f.get("confidence", 1) < FRAUD_CONFIDENCE_MIN]
    if len(low_conf) > 0:
        flags.append({"check": "low_confidence", "detail": f"{len(low_conf)} damage findings have confidence below {FRAUD_CONFIDENCE_MIN} — adjuster review needed.", "weight": 10})
        score += 10

    # 5. Video manipulation detection
    if manipulation_risk == "high":
        detail = f"Gemini detected video manipulation: {', '.join(manipulation_flags or ['screen recording or staging suspected'])}."
        flags.append({"check": "manipulation_detected", "detail": detail, "weight": 80})
        score += 80
    elif manipulation_risk == "low":
        detail = f"Minor anomalies detected: {', '.join(manipulation_flags or ['review recommended'])}."
        flags.append({"check": "manipulation_possible", "detail": detail, "weight": 20})
        score += 20

    score = min(score, 100)

    if score >= 70:
        route = "hold"
    elif score >= 30:
        route = "review"
    else:
        route = "clear"

    # Write result to Firestore
    firestore.Client().collection("fraud_checks").document(claim_id).set({
        "claim_id": claim_id,
        "score": score,
        "route": route,
        "flags": flags,
    })

    return {"score": score, "route": route, "flags": flags}
