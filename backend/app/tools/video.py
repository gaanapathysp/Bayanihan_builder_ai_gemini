import os
import time
import pathlib
from google import genai
from google.genai import types
from pydantic import BaseModel
from app.config import GEMINI_API_KEY, PRO_MODEL, FLASH_MODEL

client = genai.Client(api_key=GEMINI_API_KEY)


class Finding(BaseModel):
    room: str
    item: str
    status: str         # new_damage | pre_existing | missing | not_seen
    description: str
    confidence: float


class DamageReport(BaseModel):
    findings: list[Finding]
    water_line_cm: int | None
    summary: str
    manipulation_flags: list[str]   # e.g. ["screen_recording", "staged_damage", "lighting_inconsistency"]
    manipulation_risk: str          # "none" | "low" | "high"


class InventoryItem(BaseModel):
    room: str
    item: str
    estimated_value_php: int
    height_from_floor_cm: int


class BaselineInventory(BaseModel):
    items: list[InventoryItem]
    rooms_seen: list[str]
    coaching_actions: list[str]


def _upload_video(path: str) -> types.File:
    """Uploads a local video file to the Gemini Files API and waits until ACTIVE."""
    file = client.files.upload(file=path)
    while file.state.name == "PROCESSING":
        time.sleep(3)
        file = client.files.get(name=file.name)
    if file.state.name != "ACTIVE":
        raise RuntimeError(f"Gemini file {file.name} failed processing: {file.state.name}")
    return file


def compare_videos(baseline_path: str, damage_path: str, inventory_json: str) -> dict:
    """
    Compares baseline and damage videos using Gemini Files API.
    Uses local file paths — no GCS URI needed, zero billing.
    """
    baseline_file = _upload_video(baseline_path)
    damage_file = _upload_video(damage_path)

    prompt = (
        f"Video 1 is the home BEFORE the typhoon (baseline). "
        f"Video 2 is AFTER the typhoon (damage). "
        f"Baseline inventory: {inventory_json}. "
        f"\n\nFRAUD DETECTION — check both videos for these signs of manipulation:\n"
        f"- Screen recording: bezel edges, screen glare, Moiré patterns, refresh-rate flicker visible\n"
        f"- Staged damage: items arranged unnaturally, no water or mud stains despite flood claim, "
        f"  damage inconsistent with flood physics (e.g. items wet at top but not bottom)\n"
        f"- Inventory mismatch: items visible in Video 2 that were NOT in Video 1 and don't match baseline\n"
        f"- Lighting inconsistency: sudden changes suggesting a different location or time of day\n"
        f"Set manipulation_risk to 'high' if any strong fraud indicator found, 'low' if minor anomalies, 'none' if clean.\n"
        f"\nDAMAGE ASSESSMENT — for each room compare before and after:\n"
        f"Identify new damage, pre-existing damage, missing items, items not visible. "
        f"Estimate water line height in cm if visible. "
        f"Be conservative — only flag damage you can clearly see."
    )

    response = client.models.generate_content(
        model=PRO_MODEL,
        contents=[baseline_file, damage_file, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=DamageReport,
            temperature=0.1,
        ),
    )

    # Clean up uploaded files immediately to save quota
    client.files.delete(name=baseline_file.name)
    client.files.delete(name=damage_file.name)

    return response.parsed.model_dump()


def extract_inventory(video_path: str, forecast_flood_depth_cm: int = 60) -> dict:
    """
    Extracts item inventory from a baseline video and generates coaching actions.
    Uses Gemini Flash (free tier).
    """
    video_file = _upload_video(video_path)

    prompt = (
        f"This is a home baseline recording. "
        f"The forecast flood depth is {forecast_flood_depth_cm} cm. "
        f"List all visible items per room with estimated PHP replacement value and height from floor. "
        f"For items whose height < {forecast_flood_depth_cm} cm, add a coaching action to move them up. "
        f"Max 8 coaching actions total. Be specific and brief."
    )

    response = client.models.generate_content(
        model=FLASH_MODEL,
        contents=[video_file, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BaselineInventory,
            temperature=0.2,
        ),
    )

    client.files.delete(name=video_file.name)
    return response.parsed.model_dump()
