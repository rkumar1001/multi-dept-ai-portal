"""Shared weather tool — available to all departments via Open-Meteo (free, no API key)."""

from typing import Any

import httpx

_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

WEATHER_TOOLS: list[dict] = [
    {
        "name": "get_weather",
        "description": (
            "Get current weather and a 7-day forecast for a city or location. "
            "Returns temperature, wind speed, humidity, precipitation, and conditions. "
            "Useful for logistics route planning, restaurant outdoor seating decisions, "
            "sales event planning, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City name or place (e.g. 'Toronto', 'New York', 'London, UK').",
                },
            },
            "required": ["location"],
        },
    },
]


def is_weather_tool(tool_name: str) -> bool:
    return tool_name == "get_weather"


async def execute_weather_tool(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
    if tool_name != "get_weather":
        return {"error": f"Unknown weather tool: {tool_name}"}

    location = tool_input.get("location", "").strip()
    if not location:
        return {"error": "Location is required."}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Step 1: Geocode the location name to lat/lon
            geo_resp = await client.get(
                _GEOCODE_URL,
                params={"name": location, "count": 1, "language": "en", "format": "json"},
            )
            geo_resp.raise_for_status()
            geo_data = geo_resp.json()
            results = geo_data.get("results")
            if not results:
                return {"error": f"Could not find location: {location}"}

            place = results[0]
            lat = place["latitude"]
            lon = place["longitude"]
            resolved_name = place.get("name", location)
            country = place.get("country", "")
            admin1 = place.get("admin1", "")

            # Step 2: Fetch weather data
            weather_resp = await client.get(
                _WEATHER_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
                    "timezone": "auto",
                    "forecast_days": 7,
                },
            )
            weather_resp.raise_for_status()
            weather = weather_resp.json()

            current = weather.get("current", {})
            daily = weather.get("daily", {})

            # Map WMO weather codes to descriptions
            condition = _wmo_code_to_text(current.get("weather_code", 0))

            # Build forecast rows
            forecast = []
            dates = daily.get("time", [])
            for i, date in enumerate(dates):
                forecast.append({
                    "date": date,
                    "condition": _wmo_code_to_text((daily.get("weather_code") or [])[i] if i < len(daily.get("weather_code", [])) else 0),
                    "high_c": (daily.get("temperature_2m_max") or [])[i] if i < len(daily.get("temperature_2m_max", [])) else None,
                    "low_c": (daily.get("temperature_2m_min") or [])[i] if i < len(daily.get("temperature_2m_min", [])) else None,
                    "precipitation_mm": (daily.get("precipitation_sum") or [])[i] if i < len(daily.get("precipitation_sum", [])) else None,
                    "max_wind_kmh": (daily.get("wind_speed_10m_max") or [])[i] if i < len(daily.get("wind_speed_10m_max", [])) else None,
                })

            return {
                "location": f"{resolved_name}, {admin1}, {country}".strip(", "),
                "latitude": lat,
                "longitude": lon,
                "current": {
                    "temperature_c": current.get("temperature_2m"),
                    "feels_like_c": current.get("apparent_temperature"),
                    "humidity_pct": current.get("relative_humidity_2m"),
                    "precipitation_mm": current.get("precipitation"),
                    "wind_speed_kmh": current.get("wind_speed_10m"),
                    "wind_direction_deg": current.get("wind_direction_10m"),
                    "condition": condition,
                },
                "forecast": forecast,
            }

    except httpx.HTTPStatusError as exc:
        return {"error": f"Weather API error {exc.response.status_code}: {exc.response.text[:200]}"}
    except httpx.HTTPError as exc:
        return {"error": f"Weather request failed: {exc}"}


_WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Light freezing rain", 67: "Heavy freezing rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
}


def _wmo_code_to_text(code: int) -> str:
    return _WMO_CODES.get(code, f"Unknown ({code})")
