"""Samsara fleet management API tools for the logistics department.

Provides read-only tools covering vehicles, drivers, safety,
HOS compliance, fuel, trips, idling, equipment, live sharing links,
and dashcam media retrieval.
"""

from typing import Any

import httpx

from app.config import get_settings

# ── Samsara API helper ─────────────────────────────────────────────────────

_BASE_URL = "https://api.samsara.com"


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
    headers = {
        "Authorization": f"Bearer {settings.samsara_api_key}",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.request(
            method,
            f"{_BASE_URL}{path}",
            headers=headers,
            params=params,
            json=json_body,
        )
        resp.raise_for_status()
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
        "name": "samsara_create_live_share",
        "description": "Create a new live sharing link — a Samsara-hosted page showing real-time GPS locations on an interactive map. Requires Write Live Sharing Links scope.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Display name for the share link (e.g. 'Fleet Overview').",
                },
                "type": {
                    "type": "string",
                    "description": "Link type: 'assetsLocation' (track specific vehicles), 'assetsNearLocation' (vehicles near a point), or 'assetsOnRoute' (vehicles on a route).",
                    "default": "assetsLocation",
                    "enum": ["assetsLocation", "assetsNearLocation", "assetsOnRoute"],
                },
                "vehicle_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of Samsara vehicle IDs to include (for assetsLocation type).",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "samsara_request_dashcam_clip",
        "description": "Request retrieval of a recorded dashcam video clip for a specific vehicle and time. The clip is not immediately available — use samsara_get_dashcam_clip to check status and get the download URL.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vehicle_id": {
                    "type": "string",
                    "description": "Samsara vehicle ID to retrieve dashcam footage for.",
                },
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 start time of the clip (e.g. 2025-04-01T14:00:00Z).",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 end time of the clip (e.g. 2025-04-01T14:05:00Z). Max 1 minute from start.",
                },
            },
            "required": ["vehicle_id", "start_time", "end_time"],
        },
    },
    {
        "name": "samsara_get_dashcam_clip",
        "description": "Check the status of a dashcam clip retrieval request and get the download/playback URL when ready. Returns status: 'pending', 'processing', 'available', or 'failed'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "retrieval_id": {
                    "type": "string",
                    "description": "The media retrieval ID returned by samsara_request_dashcam_clip.",
                },
            },
            "required": ["retrieval_id"],
        },
    },
    {
        "name": "samsara_get_uploaded_media",
        "description": "List dashcam media (photos/videos) that have been uploaded to Samsara, filtered by time range. Returns URLs for playback.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start_time": {
                    "type": "string",
                    "description": "ISO 8601 start time (e.g. 2025-04-01T00:00:00Z).",
                },
                "end_time": {
                    "type": "string",
                    "description": "ISO 8601 end time (e.g. 2025-04-02T00:00:00Z).",
                },
                "vehicle_id": {
                    "type": "string",
                    "description": "Optional Samsara vehicle ID to filter by.",
                },
            },
            "required": ["start_time", "end_time"],
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
            if driver_id:
                data = await _samsara_request("GET", f"/fleet/drivers/{driver_id}/safety-score")
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
                        "GET", f"/fleet/drivers/{d['id']}/safety-score"
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
            data = await _samsara_request(
                "GET", "/fleet/safety-events", params={"limit": limit}
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
            params: dict[str, Any] = {}
            if tool_input.get("driver_id"):
                params["driverIds"] = tool_input["driver_id"]
            if tool_input.get("start_time"):
                params["startTime"] = tool_input["start_time"]
            if tool_input.get("end_time"):
                params["endTime"] = tool_input["end_time"]
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
                        "location": l.get("codriverName", ""),
                    }
                    for l in logs
                ],
                "total": len(logs),
            }

        if tool_name == "samsara_get_hos_violations":
            params = {}
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
            params = {}
            if tool_input.get("start_time"):
                params["startTime"] = tool_input["start_time"]
            if tool_input.get("end_time"):
                params["endTime"] = tool_input["end_time"]
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
            params: dict[str, Any] = {}
            if tool_input.get("vehicle_id"):
                params["vehicleId"] = tool_input["vehicle_id"]
            if tool_input.get("start_time"):
                params["startTime"] = tool_input["start_time"]
            if tool_input.get("end_time"):
                params["endTime"] = tool_input["end_time"]
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
            params = {}
            if tool_input.get("start_time"):
                params["startTime"] = tool_input["start_time"]
            if tool_input.get("end_time"):
                params["endTime"] = tool_input["end_time"]
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
                url = s.get("url", "")
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

        if tool_name == "samsara_create_live_share":
            name = tool_input.get("name", "Fleet Share")
            link_type = tool_input.get("type", "assetsLocation")
            body: dict[str, Any] = {"name": name, "type": link_type}
            vehicle_ids = tool_input.get("vehicle_ids")
            if vehicle_ids and link_type == "assetsLocation":
                body["assetIds"] = [{"id": vid} for vid in vehicle_ids]
            data = await _samsara_request("POST", "/live-shares", json_body=body)
            share = data.get("data", data)
            url = share.get("url", "")
            result = {
                "id": share.get("id"),
                "name": share.get("name", ""),
                "type": share.get("type", ""),
                "url": url,
                "expires_at": share.get("expiresAt"),
                "message": "Live sharing link created successfully. Open the URL to see real-time GPS tracking on an interactive map.",
            }
            if url:
                result["_embed"] = {
                    "type": "iframe",
                    "url": url,
                    "title": f"Live Tracking: {name}",
                }
            return result

        # ── Dashcam Media Retrieval ────────────────────────────────

        if tool_name == "samsara_request_dashcam_clip":
            vehicle_id = tool_input["vehicle_id"]
            start_time = tool_input["start_time"]
            end_time = tool_input["end_time"]
            body = {
                "vehicleId": vehicle_id,
                "startTime": start_time,
                "endTime": end_time,
            }
            data = await _samsara_request("POST", "/fleet/media-retrieval", json_body=body)
            retrieval = data.get("data", data)
            return {
                "retrieval_id": retrieval.get("id"),
                "status": retrieval.get("status", "pending"),
                "vehicle_id": vehicle_id,
                "start_time": start_time,
                "end_time": end_time,
                "message": "Dashcam clip retrieval requested. Use samsara_get_dashcam_clip with the retrieval_id to check when the video is ready.",
            }

        if tool_name == "samsara_get_dashcam_clip":
            retrieval_id = tool_input["retrieval_id"]
            data = await _samsara_request("GET", f"/fleet/media-retrieval/{retrieval_id}")
            retrieval = data.get("data", data)
            status = retrieval.get("status", "unknown")
            result: dict[str, Any] = {
                "retrieval_id": retrieval_id,
                "status": status,
            }
            if status == "available":
                urls = retrieval.get("urls", [])
                if urls:
                    video_url = urls[0].get("url", "")
                    result["video_url"] = video_url
                    result["urls"] = urls
                    if video_url:
                        result["_embed"] = {
                            "type": "video",
                            "url": video_url,
                            "title": f"Dashcam Clip — {retrieval_id[:8]}",
                        }
                result["message"] = "Dashcam clip is ready for playback."
            elif status in ("pending", "processing"):
                result["message"] = f"Clip is still {status}. Check again in a few seconds."
            else:
                result["message"] = f"Clip retrieval status: {status}"
            return result

        if tool_name == "samsara_get_uploaded_media":
            params: dict[str, Any] = {
                "startTime": tool_input["start_time"],
                "endTime": tool_input["end_time"],
            }
            if tool_input.get("vehicle_id"):
                params["vehicleId"] = tool_input["vehicle_id"]
            data = await _samsara_request("GET", "/fleet/uploaded-media", params=params)
            media_items = data.get("data", [])
            results = []
            embeds = []
            for m in media_items:
                url = m.get("url", "")
                media_type = m.get("mediaType", "")
                item = {
                    "id": m.get("id"),
                    "type": media_type,
                    "url": url,
                    "time": m.get("capturedAt") or m.get("time"),
                    "vehicle_name": (m.get("vehicle") or {}).get("name", ""),
                    "driver_name": (m.get("driver") or {}).get("name", ""),
                }
                results.append(item)
                if url and media_type in ("video", "video/mp4"):
                    embeds.append({
                        "type": "video",
                        "url": url,
                        "title": f"Dashcam — {item['vehicle_name'] or 'Unknown'} at {item['time'] or 'N/A'}",
                    })
            result_dict: dict[str, Any] = {"results": results, "total": len(results)}
            if embeds:
                result_dict["_embeds"] = embeds[:5]  # Limit to 5 videos
            return result_dict

        return {"error": f"Unknown Samsara tool: {tool_name}"}

    except httpx.HTTPStatusError as exc:
        return {"error": f"Samsara API error {exc.response.status_code}: {exc.response.text[:300]}"}
    except httpx.HTTPError as exc:
        return {"error": f"Samsara API request error: {exc}"}
    except Exception as exc:
        return {"error": f"Samsara tool error: {exc}"}
