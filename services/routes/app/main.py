import os
from datetime import datetime, timezone
from typing import Literal

import googlemaps
from fastapi import FastAPI
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    service: str
    status: Literal["ok", "degraded"]
    timestamp: str


class RouteEstimateRequest(BaseModel):
    origin: str = Field(min_length=1)
    destination: str = Field(min_length=1)
    waypoints: list[str] | None = None


class RouteEstimate(BaseModel):
    origin: str
    destination: str
    distanceMeters: int
    durationSeconds: int
    estimatedCo2SavingsGrams: int
    provider: Literal["mock", "google-maps"]
    polyline: str | None = None


app = FastAPI(title="Eco Carpool Route Service")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        service="routes",
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/estimate-route", response_model=RouteEstimate)
def estimate_route(request: RouteEstimateRequest) -> RouteEstimate:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")

    if not api_key:
        return mock_estimate(request)

    client = googlemaps.Client(key=api_key)
    matrix = client.distance_matrix(
        origins=[request.origin],
        destinations=[request.destination],
        mode="driving",
        units="metric",
    )
    element = matrix["rows"][0]["elements"][0]

    if element.get("status") != "OK":
        return mock_estimate(request)

    distance_meters = int(element["distance"]["value"])
    duration_seconds = int(element["duration"]["value"])

    return RouteEstimate(
        origin=request.origin,
        destination=request.destination,
        distanceMeters=distance_meters,
        durationSeconds=duration_seconds,
        estimatedCo2SavingsGrams=estimate_co2_savings(distance_meters),
        provider="google-maps",
    )


def mock_estimate(request: RouteEstimateRequest) -> RouteEstimate:
    # TODO: Replace this deterministic placeholder after route requirements are finalized.
    seed = len(request.origin) + len(request.destination)
    distance_meters = 8_000 + seed * 375
    duration_seconds = 900 + seed * 45

    return RouteEstimate(
        origin=request.origin,
        destination=request.destination,
        distanceMeters=distance_meters,
        durationSeconds=duration_seconds,
        estimatedCo2SavingsGrams=estimate_co2_savings(distance_meters),
        provider="mock",
    )


def estimate_co2_savings(distance_meters: int) -> int:
    grams_per_km_single_occupancy = 192
    shared_trip_factor = 0.45
    distance_km = distance_meters / 1000
    return round(distance_km * grams_per_km_single_occupancy * shared_trip_factor)
