"""Samsara fleet management API tools for the logistics department.

Provides read-only tools covering vehicles, drivers, safety,
HOS compliance, fuel, trips, idling, equipment, live sharing links,
and dashcam media retrieval.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# ── Samsara API helper ─────────────────────────────────────────────────────

_BASE_URL = "https://api.samsara.com"


def _default_time_range() -> tuple[str, str]:
    """Return (start_time, end_time) as ISO 8601 strings covering the last 24 hours."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(hours=24)
    return start.strftime("%Y-%m-%dT%H:%M:%SZ"), now.strftime("%Y-%m-%dT%H:%M:%SZ")


def _default_time_range_ms() -> tuple[int, int]:
    """Return (start_ms, end_ms) as epoch milliseconds covering the last 24 hours."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(hours=24)
    return int(start.timestamp() * 1000), int(now.timestamp() * 1000)


async def _samsara_request(
    method: str,
    path: str,
    params: dict | None = None,
    json_body: dict | None = None,
) -> dict:
    """Make an authenticated request to the Samsara API.

    Returns the parsed JSON response dict.
    Raises on HTTP or network errors.
    """
    settings = get_settings()
    if not settings.samsara_api_key:
        logger.error("Samsara API key is not configured")
        raise ValueError("Samsara API key is not configured. Check your .env file.")
    headers = {
        "Authorization": f"Bearer {settings.samsara_api_key}",
        "Accept": "application/json",
    }
    url = f"{_BASE_URL}{path}"
    logger.info("Samsara API request: %s %s params=%s", method, url, params)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.request(
            method,
            url,
            headers=headers,
            params=params,
            json=json_body,
        )
        if resp.status_code >= 400:
            logger.error("Samsara API error: %s %s → %d: %s", method, path, resp.status_code, resp.text[:300])
        resp.raise_for_status()
        logger.info("Samsara API response: %s %s → %d", method, path, resp.status_code)
        return resp.json()


# ── Tool definitions (Claude tool_use format) ─────────────────────────────

SAMSARA_TOOLS: list[dict] = [
    {
        "name": "samsara_get_vehicles",
        "description": "List all vehicles registered in Samsara with their details (name, VIN, make, model, serial, tags).",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Max vehicles to return (default 50, max 512).",
                    "default": 50,
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_vehicle_locations",
        "description": "Get the most recent GPS locations for all Samsara vehicles (latitude, longitude, speed, heading, time).",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "samsara_get_vehicle_stats",
        "description": "Get real-time diagnostic stats for vehicles — engine state, GPS, odometer, fuel percent, battery, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "types": {
                    "type": "string",
                    "description": "Comma-separated stat types: engineStates,gpsOdometerMeters,fuelPercents,batteryMilliVolts,obdEngineSeconds (default: engineStates,gpsOdometerMeters,fuelPercents).",
                    "default": "engineStates,gpsOdometerMeters,fuelPercents",
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_drivers",
        "description": "List all drivers in Samsara with their name, phone, license, tags, and current vehicle assignment.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Max drivers to return (default 50, max 512).",
                    "default": 50,
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_driver_safety_scores",
        "description": "Get safety scores for drivers over a time period. Includes harsh events, speeding, and overall score.",
        "input_schema": {
            "type": "object",
            "properties": {
                "driver_id": {
                    "type": "string",
                    "description": "Samsara driver ID. If omitted, returns scores for all drivers.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_safety_events",
        "description": "Get safety events (harsh braking, harsh acceleration, crashes, near-collisions) across the fleet.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Max events to return (default 50).",
                    "default": 50,
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_hos_logs",
        "description": "Get Hours of Service (HOS/ELD) logs for drivers — duty status changes, driving time, rest periods.",
        "input_schema": {
            "type": "object",
            "properties": {
                "driver_id": {
                    "type": "string",
                    "description": "Samsara driver ID. If omitted, returns HOS logs for all drivers.",
                },
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 start time (e.g. 2025-04-01T00:00:00Z). Defaults to last 24 hours.",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 end time. Defaults to now.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_hos_violations",
        "description": "Get HOS violations (driving over limit, missing breaks, etc.) across drivers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "driver_id": {
                    "type": "string",
                    "description": "Samsara driver ID to filter by. If omitted, returns violations for all drivers.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_fuel_energy",
        "description": "Get fuel and energy consumption data for vehicles over a time range.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 start time (e.g. 2025-04-01T00:00:00Z). Defaults to last 24 hours.",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 end time. Defaults to now.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_trips",
        "description": "Get trip history for vehicles — start/end locations, distance, duration, fuel used.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vehicle_id": {
                    "type": "string",
                    "description": "Samsara vehicle ID to filter trips for a specific vehicle.",
                },
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 start time (e.g. 2025-04-01T00:00:00Z). Defaults to last 24 hours.",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 end time. Defaults to now.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_idle_history",
        "description": "Get vehicle idling report — periods where engine was running but vehicle was stationary.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 start time. Defaults to last 24 hours.",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 end time. Defaults to now.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "samsara_get_equipment",
        "description": "List all equipment (trailers, containers, assets) tracked in Samsara with their current location.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Max equipment items to return (default 50).",
                    "default": 50,
                },
            },
            "required": [],
        },
    },
    # ── Live Sharing & Media tools ─────────────────────────────────────
    {
        "name": "samsara_get_live_shares",
        "description": "List all active (non-expired) live sharing links. These are Samsara-hosted pages that show real-time GPS locations on an interactive map.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "samsara_get_dashcam_media",
        "description": "List dashcam media (photos/videos) captured by Samsara cameras, filtered by vehicle and time range. Max 1-day range per request. Returns URLs for playback.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vehicle_id": {
                    "type": "string",
                    "description": "Samsara vehicle ID to retrieve dashcam media for.",
                },
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 start time (e.g. 2025-07-09T00:00:00Z). Max 1-day range from end_time.",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 end time (e.g. 2025-07-09T23:59:59Z). Max 1-day range from start_time.",
                },
            },
            "required": ["vehicle_id", "start_time", "end_time"],
        },
    },
]


# ── Tool executor ──────────────────────────────────────────────────────────


async def execute_samsara_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute a Samsara tool and return the result dict."""
    try:
        if tool_name == "samsara_get_vehicles":
            limit = tool_input.get("limit", 50)
            data = await _samsara_request("GET", "/fleet/vehicles", params={"limit": limit})
            vehicles = data.get("data", [])
            return {
                "results": [
                    {
                        "id": v.get("id"),
                        "name": v.get("name", ""),
                        "vin": v.get("vin", ""),
                        "make": v.get("make", ""),
                        "model": v.get("model", ""),
                        "year": v.get("year", ""),
                        "serial": v.get("serial", ""),
                        "tags": [t.get("name", "") for t in v.get("tags", [])],
                    }
                    for v in vehicles
                ],
                "total": len(vehicles),
            }

        if tool_name == "samsara_get_vehicle_locations":
            data = await _samsara_request("GET", "/fleet/vehicles/locations")
            locations = data.get("data", [])
            return {
                "results": [
                    {
                        "id": v.get("id"),
                        "name": v.get("name", ""),
                        "latitude": v.get("location", {}).get("latitude"),
                        "longitude": v.get("location", {}).get("longitude"),
                        "speed_mph": v.get("location", {}).get("speedMilesPerHour"),
                        "heading": v.get("location", {}).get("heading"),
                        "time": v.get("location", {}).get("time"),
                        "address": v.get("location", {}).get("reverseGeo", {}).get("formattedLocation", ""),
                    }
                    for v in locations
                ],
                "total": len(locations),
            }

        if tool_name == "samsara_get_vehicle_stats":
            types_str = tool_input.get("types", "engineStates,gpsOdometerMeters,fuelPercents")
            data = await _samsara_request(
                "GET", "/fleet/vehicles/stats", params={"types": types_str}
            )
            vehicles = data.get("data", [])
            results = []
            for v in vehicles:
                entry: dict[str, Any] = {"id": v.get("id"), "name": v.get("name", "")}
                for stat_type in types_str.split(","):
                    values = v.get(stat_type, [])
                    if values:
                        entry[stat_type] = values[0].get("value") if len(values) == 1 else values
                results.append(entry)
            return {"results": results, "total": len(results)}

        if tool_name == "samsara_get_drivers":
            limit = tool_input.get("limit", 50)
            data = await _samsara_request("GET", "/fleet/drivers", params={"limit": limit})
            drivers = data.get("data", [])
            return {
                "results": [
                    {
                        "id": d.get("id"),
                        "name": d.get("name", ""),
                        "phone": d.get("phone", ""),
                        "license_number": d.get("licenseNumber", ""),
                        "license_state": d.get("licenseState", ""),
                        "status": d.get("driverActivationStatus", ""),
                        "tags": [t.get("name", "") for t in d.get("tags", [])],
                        "vehicle_id": (d.get("staticAssignedVehicle") or {}).get("id"),
                    }
                    for d in drivers
                ],
                "total": len(drivers),
            }

        if tool_name == "samsara_get_driver_safety_scores":
            driver_id = tool_input.get("driver_id")
            start_ms, end_ms = _default_time_range_ms()
            score_params = {"startMs": start_ms, "endMs": end_ms}
            if driver_id:
                data = await _samsara_request(
                    "GET", f"/fleet/drivers/{driver_id}/safety-score", params=score_params
                )
                score = data.get("data", {})
                return {
                    "driver_id": driver_id,
                    "safety_score": score.get("safetyScore"),
                    "total_harsh_events": score.get("totalHarshEventCount"),
                    "total_time_driven_ms": score.get("totalTimeDrivenMs"),
                    "crash_count": score.get("crashCount"),
                }
            # All drivers — list them first, then fetch scores
            drivers_data = await _samsara_request("GET", "/fleet/drivers", params={"limit": 100})
            drivers = drivers_data.get("data", [])
            results = []
            for d in drivers:
                try:
                    score_data = await _samsara_request(
                        "GET", f"/fleet/drivers/{d['id']}/safety-score", params=score_params
                    )
                    s = score_data.get("data", {})
                    results.append({
                        "driver_id": d.get("id"),
                        "name": d.get("name", ""),
                        "safety_score": s.get("safetyScore"),
                        "total_harsh_events": s.get("totalHarshEventCount"),
                    })
                except httpx.HTTPStatusError:
                    results.append({
                        "driver_id": d.get("id"),
                        "name": d.get("name", ""),
                        "safety_score": None,
                        "error": "Could not fetch score",
                    })
            return {"results": results, "total": len(results)}

        if tool_name == "samsara_get_safety_events":
            limit = tool_input.get("limit", 50)
            default_start, default_end = _default_time_range()
            start_time = tool_input.get("start_time", default_start)
            end_time = tool_input.get("end_time", default_end)
            data = await _samsara_request(
                "GET",
                "/fleet/safety-events",
                params={"limit": limit, "startTime": start_time, "endTime": end_time},
            )
            events = data.get("data", [])
            return {
                "results": [
                    {
                        "id": e.get("id"),
                        "type": e.get("behaviorLabel", ""),
                        "time": e.get("time"),
                        "driver_name": (e.get("driver") or {}).get("name", ""),
                        "vehicle_name": (e.get("vehicle") or {}).get("name", ""),
                        "max_speed_mph": e.get("maxSpeedMph"),
                        "location": e.get("location", {}),
                    }
                    for e in events
                ],
                "total": len(events),
            }

        if tool_name == "samsara_get_hos_logs":
            default_start, default_end = _default_time_range()
            params: dict[str, Any] = {
                "startTime": tool_input.get("start_time", default_start),
                "endTime": tool_input.get("end_time", default_end),
            }
            if tool_input.get("driver_id"):
                params["driverIds"] = tool_input["driver_id"]
            data = await _samsara_request("GET", "/fleet/hos/logs", params=params)
            logs = data.get("data", [])
            return {
                "results": [
                    {
                        "driver_id": (l.get("driver") or {}).get("id"),
                        "driver_name": (l.get("driver") or {}).get("name", ""),
                        "status": l.get("hosStatusType", ""),
                        "start_time": l.get("startTime"),
                        "end_time": l.get("endTime"),
                        "vehicle_name": (l.get("vehicle") or {}).get("name", ""),
                        "location": l.get("location", {}),
                    }
                    for l in logs
                ],
                "total": len(logs),
            }

        if tool_name == "samsara_get_hos_violations":
            default_start, default_end = _default_time_range()
            params = {
                "startTime": tool_input.get("start_time", default_start),
                "endTime": tool_input.get("end_time", default_end),
            }
            if tool_input.get("driver_id"):
                params["driverIds"] = tool_input["driver_id"]
            data = await _samsara_request("GET", "/fleet/hos/violations", params=params)
            violations = data.get("data", [])
            return {
                "results": [
                    {
                        "id": v.get("id"),
                        "type": v.get("violationType", ""),
                        "driver_name": (v.get("driver") or {}).get("name", ""),
                        "start_time": v.get("startTime"),
                        "end_time": v.get("endTime"),
                        "vehicle_name": (v.get("vehicle") or {}).get("name", ""),
                    }
                    for v in violations
                ],
                "total": len(violations),
            }

        if tool_name == "samsara_get_fuel_energy":
            default_start, default_end = _default_time_range()
            params = {
                "startTime": tool_input.get("start_time", default_start),
                "endTime": tool_input.get("end_time", default_end),
            }
            data = await _samsara_request("GET", "/fleet/vehicles/fuel-energy", params=params)
            vehicles = data.get("data", [])
            return {
                "results": [
                    {
                        "vehicle_id": v.get("id"),
                        "vehicle_name": v.get("name", ""),
                        "fuel_consumed_ml": v.get("fuelConsumedMl"),
                        "fuel_efficiency_mpg": v.get("fuelEfficiencyMpg"),
                        "distance_meters": v.get("distanceMeters"),
                    }
                    for v in vehicles
                ],
                "total": len(vehicles),
            }

        if tool_name == "samsara_get_trips":
            default_start, default_end = _default_time_range()
            params: dict[str, Any] = {
                "startTime": tool_input.get("start_time", default_start),
                "endTime": tool_input.get("end_time", default_end),
            }
            if tool_input.get("vehicle_id"):
                params["vehicleId"] = tool_input["vehicle_id"]
            data = await _samsara_request("GET", "/fleet/trips", params=params)
            trips = data.get("data", [])
            return {
                "results": [
                    {
                        "vehicle_name": (t.get("vehicle") or {}).get("name", ""),
                        "driver_name": (t.get("driver") or {}).get("name", ""),
                        "start_time": t.get("startTime"),
                        "end_time": t.get("endTime"),
                        "start_location": t.get("startLocation", ""),
                        "end_location": t.get("endLocation", ""),
                        "distance_meters": t.get("distanceMeters"),
                        "fuel_consumed_ml": t.get("fuelConsumedMl"),
                    }
                    for t in trips
                ],
                "total": len(trips),
            }

        if tool_name == "samsara_get_idle_history":
            default_start, default_end = _default_time_range()
            params = {
                "startTime": tool_input.get("start_time", default_start),
                "endTime": tool_input.get("end_time", default_end),
            }
            data = await _samsara_request("GET", "/fleet/vehicles/idle-history", params=params)
            vehicles = data.get("data", [])
            return {
                "results": [
                    {
                        "vehicle_id": v.get("id"),
                        "vehicle_name": v.get("name", ""),
                        "idle_duration_ms": v.get("idleDurationMs"),
                        "idle_fuel_consumed_ml": v.get("idleFuelConsumedMl"),
                    }
                    for v in vehicles
                ],
                "total": len(vehicles),
            }

        if tool_name == "samsara_get_equipment":
            limit = tool_input.get("limit", 50)
            data = await _samsara_request("GET", "/fleet/equipment", params={"limit": limit})
            equipment = data.get("data", [])
            return {
                "results": [
                    {
                        "id": eq.get("id"),
                        "name": eq.get("name", ""),
                        "type": eq.get("equipmentType", ""),
                        "serial": eq.get("serial", ""),
                        "latitude": (eq.get("location") or {}).get("latitude"),
                        "longitude": (eq.get("location") or {}).get("longitude"),
                        "tags": [t.get("name", "") for t in eq.get("tags", [])],
                    }
                    for eq in equipment
                ],
                "total": len(equipment),
            }

        # ── Live Sharing Links ─────────────────────────────────────

        if tool_name == "samsara_get_live_shares":
            data = await _samsara_request("GET", "/live-shares")
            shares = data.get("data", [])
            results = []
            embed_url = None
            for s in shares:
                url = s.get("liveSharingUrl", "") or s.get("url", "")
                results.append({
                    "id": s.get("id"),
                    "name": s.get("name", ""),
                    "type": s.get("type", ""),
                    "url": url,
                    "expires_at": s.get("expiresAt"),
                })
                if not embed_url and url:
                    embed_url = url
            result: dict[str, Any] = {"results": results, "total": len(results)}
            if embed_url:
                result["_embed"] = {
                    "type": "iframe",
                    "url": embed_url,
                    "title": "Live Fleet Tracking Map",
                }
            return result

        # ── Dashcam Media Retrieval ────────────────────────────────

        if tool_name == "samsara_get_dashcam_media":
            params: dict[str, Any] = {
                "vehicleIds": tool_input["vehicle_id"],
                "startTime": tool_input["start_time"],
                "endTime": tool_input["end_time"],
            }
            data = await _samsara_request("GET", "/cameras/media", params=params)
            media_items = (data.get("data") or {}).get("media") or []
            results = []
            embeds = []
            for m in media_items:
                url = m.get("url", "")
                media_type = m.get("mediaType", "")
                item: dict[str, Any] = {
                    "id": m.get("id"),
                    "type": media_type,
                    "url": url,
                    "time": m.get("capturedAtTime") or m.get("time"),
                    "camera": m.get("cameraName", ""),
                    "vehicle_name": (m.get("vehicle") or {}).get("name", ""),
                    "driver_name": (m.get("driver") or {}).get("name", ""),
                }
                results.append(item)
                if url and "video" in media_type:
                    embeds.append({
                        "type": "video",
                        "url": url,
                        "title": f"Dashcam — {item['vehicle_name'] or 'Unknown'} at {item['time'] or 'N/A'}",
                    })
            result_dict: dict[str, Any] = {"results": results, "total": len(results)}
            if not results:
                result_dict["message"] = "No dashcam media found for this vehicle in the given time range. The vehicle may not have a camera installed, or no media was captured during this period."
            if embeds:
                result_dict["_embeds"] = embeds[:5]
            return result_dict

        return {"error": f"Unknown Samsara tool: {tool_name}"}

    except httpx.TimeoutException as exc:
        logger.error("Samsara tool '%s' timed out: %s", tool_name, exc)
        return {"error": f"Samsara API timed out for '{tool_name}'. The service may be slow or unavailable."}
    except httpx.HTTPStatusError as exc:
        logger.error("Samsara tool '%s' HTTP error %d: %s", tool_name, exc.response.status_code, exc.response.text[:300])
        return {"error": f"Samsara API error {exc.response.status_code}: {exc.response.text[:300]}"}
    except httpx.HTTPError as exc:
        logger.error("Samsara tool '%s' request error: %s", tool_name, exc)
        return {"error": f"Samsara API request error: {exc}"}
    except ValueError as exc:
        logger.error("Samsara tool '%s' config error: %s", tool_name, exc)
        return {"error": str(exc)}
    except Exception as exc:
        logger.error("Samsara tool '%s' unexpected error: %s: %s", tool_name, type(exc).__name__, exc)
        return {"error": f"Samsara tool error: {exc}"}
