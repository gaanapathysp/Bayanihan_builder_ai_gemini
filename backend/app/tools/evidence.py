import math
import requests


def get_weather_history(lat: float, lon: float, start_date: str, end_date: str) -> dict:
    """
    Fetches rainfall and max wind speed for a location using Open-Meteo (free, no key needed).
    Dates in YYYY-MM-DD format.
    """
    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        f"&daily=precipitation_sum,windspeed_10m_max"
        f"&timezone=Asia%2FManila"
    )
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    data = resp.json().get("daily", {})
    max_rainfall = max(data.get("precipitation_sum", [0]))
    max_wind = max(data.get("windspeed_10m_max", [0]))
    return {
        "max_rainfall_mm": max_rainfall,
        "max_wind_kph": max_wind,
        "dates": data.get("time", []),
    }


def get_flood_extent(lat: float, lon: float, pre_start: str, pre_end: str,
                     post_start: str, post_end: str) -> dict:
    """
    Returns flooded share estimate using Earth Engine Sentinel-1 change detection.
    Falls back to weather-only classification if EE is unavailable.
    """
    try:
        import ee
        ee.Initialize(project="ai-buildercup")
        aoi = ee.Geometry.Point(lon, lat).buffer(200)
        s1 = (ee.ImageCollection("COPERNICUS/S1_GRD")
              .filterBounds(aoi)
              .filter(ee.Filter.eq("instrumentMode", "IW"))
              .select("VH"))
        pre = s1.filterDate(pre_start, pre_end).median()
        post = s1.filterDate(post_start, post_end).median()
        flooded = post.subtract(pre).lt(-3)
        share = flooded.reduceRegion(ee.Reducer.mean(), aoi, 10).get("VH")
        return {"flooded_share": share.getInfo(), "source": "sentinel1"}
    except Exception:
        return {"flooded_share": None, "source": "unavailable"}


def classify_event(flooded_share: float | None, max_rainfall_mm: float,
                   max_wind_kph: float) -> str:
    """Returns 'confirmed', 'possible', or 'not_confirmed' based on evidence thresholds."""
    if (flooded_share is not None and flooded_share >= 0.20):
        return "confirmed"
    if max_rainfall_mm >= 150 or max_wind_kph >= 118:
        return "confirmed"
    if max_rainfall_mm >= 50 or max_wind_kph >= 60 or (flooded_share is not None and flooded_share > 0):
        return "possible"
    return "not_confirmed"


def verify_location(video_lat: float, video_lon: float,
                    policy_lat: float, policy_lon: float) -> dict:
    """Computes distance in metres between two GPS coordinates."""
    R = 6_371_000
    phi1, phi2 = math.radians(policy_lat), math.radians(video_lat)
    dphi = math.radians(video_lat - policy_lat)
    dlambda = math.radians(video_lon - policy_lon)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    distance_m = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return {"distance_metres": round(distance_m, 1), "within_50m": distance_m <= 50}
