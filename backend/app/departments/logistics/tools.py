"""Logistics department tool definitions and execution logic.

Uses real FleetHunt GPS API for live fleet tracking
and Samsara API for comprehensive fleet management.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.departments.logistics.samsara_tools import SAMSARA_TOOLS, execute_samsara_tool

FLEETHUNT_TOOLS = [
    {
        "name": "get_fleet_location",
        "description": "Get the current location and status of all vehicles in the fleet.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_vehicle_by_name",
        "description": "Search for vehicles by name (partial match supported).",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Full or partial vehicle name to search for."},
            },
            "required": ["name"],
        },
    },
    {
        "name": "get_vehicle_by_id",
        "description": "Get a specific vehicle by its device ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "device_id": {"type": "string", "description": "The device ID of the vehicle."},
            },
            "required": ["device_id"],
        },
    },
    {
        "name": "get_moving_vehicles",
        "description": "Get all vehicles that are currently moving.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_idle_vehicles",
        "description": "Get all vehicles that are currently idling (engine on but stationary).",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_stopped_vehicles",
        "description": "Get all vehicles that are currently stopped (engine off).",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_fleet_summary",
        "description": "Get a summary of the fleet including total vehicles, moving, idle, and stopped counts.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_vehicles_near_location",
        "description": "Find vehicles within a given radius of a location.",
        "input_schema": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number", "description": "Latitude of the target location."},
                "longitude": {"type": "number", "description": "Longitude of the target location."},
                "radius_km": {"type": "number", "description": "Search radius in kilometres (default 10).", "default": 10},
            },
            "required": ["latitude", "longitude"],
        },
    },
    {
        "name": "get_speeding_vehicles",
        "description": "Get vehicles currently exceeding a speed threshold.",
        "input_schema": {
            "type": "object",
            "properties": {
                "threshold_kmh": {"type": "number", "description": "Speed threshold in km/h (default 100).", "default": 100},
            },
            "required": [],
        },
    },
    {
        "name": "get_live_tracking",
        "description": "Get detailed live tracking data for a specific vehicle including GPS coordinates, speed, heading, and address.",
        "input_schema": {
            "type": "object",
            "properties": {
                "device_id": {"type": "string", "description": "The device ID of the vehicle to track."},
            },
            "required": ["device_id"],
        },
    },
]

TOOLS = FLEETHUNT_TOOLS + SAMSARA_TOOLS


# ── FleetHunt API helpers ──────────────────────────────────────────────────


async def _fleethunt_get_fleet() -> list[dict]:
    """Fetch all devices from FleetHunt API."""
    settings = get_settings()
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        resp = await client.get(
            f"{settings.fleethunt_base_url}/fleet",
            params={"api_token": settings.fleethunt_api_key},
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == 0:
            raise ValueError(data.get("message", "FleetHunt API error"))
        return data.get("devices", [])


async def _fleethunt_get_device(device_id: str) -> dict | None:
    """Fetch a single device by ID from FleetHunt API."""
    settings = get_settings()
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        resp = await client.get(
            f"{settings.fleethunt_base_url}/fleet",
            params={"api_token": settings.fleethunt_api_key, "device_id": device_id},
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == 0:
            return None
        devices = data.get("devices", [])
        return devices[0] if devices else None


def _is_active_device(d: dict, max_stale_days: int = 7) -> bool:
    """Return True if the device reported data within max_stale_days."""
    dt_str = d.get("device_time")
    if not dt_str:
        return False
    try:
        device_time = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        cutoff = datetime.now(timezone.utc) - timedelta(days=max_stale_days)
        return device_time >= cutoff
    except (ValueError, TypeError):
        return False


async def _fleethunt_get_active_fleet() -> list[dict]:
    """Fetch all devices and filter out stale/decommissioned ones (>7 days old)."""
    all_devices = await _fleethunt_get_fleet()
    return [d for d in all_devices if _is_active_device(d)]


def _derive_status(d: dict) -> str:
    """Derive vehicle status from speed and ignition."""
    speed = d.get("speed", 0) or 0
    ignition = d.get("ignition", 0)
    if speed > 0:
        return "moving"
    if ignition == 1:
        return "idle"
    return "stopped"


def _device_summary(d: dict) -> dict:
    """Extract key fields from a FleetHunt device."""
    return {
        "device_id": d.get("id"),
        "name": d.get("name", ""),
        "status": _derive_status(d),
        "speed": d.get("speed", 0),
        "latitude": d.get("latitude"),
        "longitude": d.get("longitude"),
        "ignition": "on" if d.get("ignition") == 1 else "off",
        "heading": d.get("angle", 0),
        "odometer": d.get("odometer", 0),
        "last_update": d.get("device_time", ""),
    }


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two points in kilometres."""
    R = 6371.0
    la1, lo1, la2, lo2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = la2 - la1, lo2 - lo1
    a = math.sin(dlat / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


# ── Tool executor ──────────────────────────────────────────────────────────


async def execute_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    """Execute a logistics tool against FleetHunt or Samsara API."""
    if tool_name.startswith("samsara_"):
        return await execute_samsara_tool(tool_name, tool_input)
    try:
        if tool_name == "get_fleet_location":
            devices = await _fleethunt_get_active_fleet()
            return {"results": [_device_summary(d) for d in devices], "total": len(devices)}

        if tool_name == "get_vehicle_by_name":
            name = (tool_input.get("name") or "").lower()
            devices = await _fleethunt_get_active_fleet()
            matches = [_device_summary(d) for d in devices if name in (d.get("name") or "").lower()]
            return {"results": matches, "total": len(matches)}

        if tool_name == "get_vehicle_by_id":
            device = await _fleethunt_get_device(tool_input["device_id"])
            if device is None:
                return {"error": f"No vehicle found with device_id={tool_input['device_id']}"}
            return _device_summary(device)

        if tool_name == "get_moving_vehicles":
            devices = await _fleethunt_get_active_fleet()
            moving = [_device_summary(d) for d in devices if (d.get("speed") or 0) > 0]
            return {"results": moving, "total": len(moving)}

        if tool_name == "get_idle_vehicles":
            devices = await _fleethunt_get_active_fleet()
            idle = [_device_summary(d) for d in devices if (d.get("speed") or 0) == 0 and d.get("ignition") == 1]
            return {"results": idle, "total": len(idle)}

        if tool_name == "get_stopped_vehicles":
            devices = await _fleethunt_get_active_fleet()
            stopped = [_device_summary(d) for d in devices if (d.get("speed") or 0) == 0 and d.get("ignition") == 0]
            return {"results": stopped, "total": len(stopped)}

        if tool_name == "get_fleet_summary":
            devices = await _fleethunt_get_active_fleet()
            total = len(devices)
            moving = sum(1 for d in devices if (d.get("speed") or 0) > 0)
            idle = sum(1 for d in devices if (d.get("speed") or 0) == 0 and d.get("ignition") == 1)
            stopped = sum(1 for d in devices if (d.get("speed") or 0) == 0 and d.get("ignition") == 0)
            return {"total_vehicles": total, "moving": moving, "idle": idle, "stopped": stopped}

        if tool_name == "get_vehicles_near_location":
            lat = tool_input["latitude"]
            lng = tool_input["longitude"]
            radius = tool_input.get("radius_km", 10)
            devices = await _fleethunt_get_active_fleet()
            nearby = []
            for d in devices:
                dlat, dlng = d.get("latitude"), d.get("longitude")
                if dlat is not None and dlng is not None:
                    dist = _haversine_km(lat, lng, float(dlat), float(dlng))
                    if dist <= radius:
                        s = _device_summary(d)
                        s["distance_km"] = round(dist, 2)
                        nearby.append(s)
            nearby.sort(key=lambda x: x["distance_km"])
            return {"results": nearby, "total": len(nearby), "search_radius_km": radius}

        if tool_name == "get_speeding_vehicles":
            threshold = tool_input.get("threshold_kmh", 100)
            devices = await _fleethunt_get_active_fleet()
            speeding = [_device_summary(d) for d in devices if (d.get("speed") or 0) > threshold]
            return {"results": speeding, "total": len(speeding), "threshold_kmh": threshold}

        if tool_name == "get_live_tracking":
            device = await _fleethunt_get_device(tool_input["device_id"])
            if device is None:
                return {"error": f"No vehicle found with device_id={tool_input['device_id']}"}
            return {
                "device_id": device.get("id"),
                "name": device.get("name", ""),
                "status": _derive_status(device),
                "latitude": device.get("latitude"),
                "longitude": device.get("longitude"),
                "speed": device.get("speed", 0),
                "heading": device.get("angle", 0),
                "ignition": "on" if device.get("ignition") == 1 else "off",
                "odometer": device.get("odometer", 0),
                "last_update": device.get("device_time", ""),
            }

        return {"error": f"Unknown logistics tool: {tool_name}"}

    except httpx.HTTPError as exc:
        return {"error": f"FleetHunt API error: {exc}"}
    except Exception as exc:
        return {"error": f"Logistics tool error: {exc}"}
