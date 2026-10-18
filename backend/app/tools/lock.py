import hashlib
from datetime import datetime, timezone
from google.cloud import firestore, storage


def lock_evidence(gcs_uri: str, policy_id: str, kind: str, lat: float, lon: float) -> dict:
    """Hashes a GCS video file and writes an append-only evidence record to Firestore."""
    bucket_name, blob_name = gcs_uri.removeprefix("gs://").split("/", 1)
    blob = storage.Client().bucket(bucket_name).blob(blob_name)
    sha = hashlib.sha256()
    with blob.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            sha.update(chunk)
    record = {
        "policy_id": policy_id,
        "kind": kind,
        "uri": gcs_uri,
        "sha256": sha.hexdigest(),
        "lat": lat,
        "lon": lon,
        "locked_at": datetime.now(timezone.utc).isoformat(),
    }
    firestore.Client().collection("evidence").add(record)
    return record


def verify_hash(gcs_uri: str, expected_sha256: str) -> dict:
    """Recomputes the SHA-256 of a GCS file and compares it to the stored hash."""
    bucket_name, blob_name = gcs_uri.removeprefix("gs://").split("/", 1)
    blob = storage.Client().bucket(bucket_name).blob(blob_name)
    sha = hashlib.sha256()
    with blob.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            sha.update(chunk)
    actual = sha.hexdigest()
    return {"match": actual == expected_sha256, "actual": actual, "expected": expected_sha256}
