import os
import re
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI
from pydantic import BaseModel, Field


RoutePreference = Literal["fastest", "cheapest", "greenest", "balanced"]
TransportMode = Literal["driving", "transit", "walking", "cycling", "carpool"]
Provider = Literal["mock", "google-route-optimization"]


class HealthResponse(BaseModel):
    service: str
    status: Literal["ok", "degraded"]
    timestamp: str


class RouteStop(BaseModel):
    label: str
    address: str
    latitude: float | None = None
    longitude: float | None = None


class RouteComparisonRequest(BaseModel):
    origin: str = Field(min_length=1)
    destination: str = Field(min_length=1)
    waypoints: list[RouteStop] | None = None
    preference: RoutePreference = "balanced"
    modes: list[TransportMode] = ["driving", "transit", "carpool", "cycling"]


class RouteOption(BaseModel):
    id: str
    mode: TransportMode
    label: str
    distanceMeters: int
    durationSeconds: int
    costCents: int
    carbonGrams: int
    co2SavingsGrams: int
    score: int
    provider: Provider
    polyline: str | None = None
    explanation: str


class RouteComparisonResponse(BaseModel):
    preference: RoutePreference
    origin: str
    destination: str
    recommendedOptionId: str
    options: list[RouteOption]


class OptimizeRouteRequest(BaseModel):
    origin: RouteStop
    destination: RouteStop
    stops: list[RouteStop] = []
    preference: RoutePreference = "balanced"


class OptimizedRoute(BaseModel):
    orderedStops: list[RouteStop]
    distanceMeters: int
    durationSeconds: int
    carbonGrams: int
    provider: Provider
    polyline: str | None = None


class RideOffer(BaseModel):
    id: str
    origin: str
    destination: str
    departureTime: str | None = None
    departure_time: str | None = None
    arrivalTime: str | None = None
    arrival_time: str | None = None
    seatsAvailable: int | None = None
    seats_available: int | None = None
    maxPassengers: int | None = None
    max_passengers: int | None = None
    pricePerSeatCents: int | None = None
    price_per_seat_cents: int | None = None
    distanceMeters: int | None = None
    distance_meters: int | None = None
    costPerPersonCents: int | None = None
    cost_per_person_cents: int | None = None
    co2SavingsGrams: int | None = None
    co2_savings_grams: int | None = None


class RideRequest(BaseModel):
    id: str
    origin: str
    destination: str
    departureTime: str | None = None
    departure_time: str | None = None
    arrivalTime: str | None = None
    arrival_time: str | None = None
    seatsNeeded: int | None = None
    seats_needed: int | None = None
    bikeFallbackRequested: bool | None = None
    bike_fallback_requested: bool | None = None


class MatchRequest(BaseModel):
    offers: list[RideOffer]
    requests: list[RideRequest]


class CarpoolMatch(BaseModel):
    offerId: str
    requestId: str
    score: int
    pickupOffsetMeters: int
    dropoffOffsetMeters: int
    sharedDistanceMeters: int
    estimatedSavingsCents: int
    estimatedCo2SavingsGrams: int
    requiresDriverConfirmation: bool
    reason: str


app = FastAPI(title="Servicio de agente GoPath")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        service="agent",
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/routes/compare", response_model=RouteComparisonResponse)
def compare_routes(request: RouteComparisonRequest) -> RouteComparisonResponse:
    options = [build_option(request, mode) for mode in request.modes]
    recommended = sorted(options, key=lambda option: rank_option(option, request.preference), reverse=True)[0]
    return RouteComparisonResponse(
        preference=request.preference,
        origin=request.origin,
        destination=request.destination,
        recommendedOptionId=recommended.id,
        options=options,
    )


@app.post("/routes/optimize", response_model=OptimizedRoute)
def optimize_route(request: OptimizeRouteRequest) -> OptimizedRoute:
    if should_call_google(request):
        google_route = optimize_with_google(request)
        if google_route:
            return google_route

    return mock_optimized_route(request)


@app.post("/matches/suggest", response_model=list[CarpoolMatch])
def suggest_matches(request: MatchRequest) -> list[CarpoolMatch]:
    matches: list[CarpoolMatch] = []
    for ride_request in request.requests:
        for offer in request.offers:
            pickup_offset = estimate_address_offset(offer.origin, ride_request.origin)
            dropoff_offset = estimate_address_offset(offer.destination, ride_request.destination)
            if pickup_offset > 2500 or dropoff_offset > 2500:
                continue

            score = max(60, 100 - round((pickup_offset + dropoff_offset) / 100))
            price = (
                offer.costPerPersonCents
                or offer.cost_per_person_cents
                or offer.pricePerSeatCents
                or offer.price_per_seat_cents
                or 0
            )
            distance = offer.distanceMeters or offer.distance_meters or deterministic_distance(offer.origin, offer.destination)
            co2_savings = offer.co2SavingsGrams or offer.co2_savings_grams or estimate_co2_savings(distance)
            matches.append(
                CarpoolMatch(
                    offerId=offer.id,
                    requestId=ride_request.id,
                    score=score,
                    pickupOffsetMeters=pickup_offset,
                    dropoffOffsetMeters=dropoff_offset,
                    sharedDistanceMeters=distance,
                    estimatedSavingsCents=max(price, 1200),
                    estimatedCo2SavingsGrams=co2_savings,
                    requiresDriverConfirmation=True,
                    reason="Recogida y destino cercanos; la ruta se ajustara despues de que confirme el conductor.",
                )
            )
    return sorted(matches, key=lambda match: match.score, reverse=True)


def should_call_google(request: OptimizeRouteRequest) -> bool:
    if os.getenv("MOCK_ROUTE_OPTIMIZATION", "true").lower() == "true":
        return False
    return all(has_coordinates(stop) for stop in [request.origin, request.destination, *request.stops])


def optimize_with_google(request: OptimizeRouteRequest) -> OptimizedRoute | None:
    try:
        from google.maps import routeoptimization_v1
    except ImportError:
        return None

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "hackathon-2026-496821")
    client = routeoptimization_v1.RouteOptimizationClient()
    shipments = [
        {
            "label": stop.label,
            "deliveries": [
                {
                    "arrival_location": {
                        "latitude": stop.latitude,
                        "longitude": stop.longitude,
                    }
                }
            ],
        }
        for stop in request.stops
    ]
    google_request = {
        "parent": f"projects/{project_id}",
        "model": {
            "shipments": shipments,
            "vehicles": [
                {
                    "label": "gopath-carpool",
                    "start_location": {"latitude": request.origin.latitude, "longitude": request.origin.longitude},
                    "end_location": {"latitude": request.destination.latitude, "longitude": request.destination.longitude},
                }
            ],
        },
        "consider_road_traffic": True,
        "populate_polylines": True,
    }

    try:
        response = client.optimize_tours(request=google_request)
    except Exception:
        return None

    route = response.routes[0] if response.routes else None
    if not route:
        return None

    ordered_stops = []
    for visit in route.visits:
        if 0 <= visit.shipment_index < len(request.stops):
            ordered_stops.append(request.stops[visit.shipment_index])

    distance_meters = int(sum(transition.travel_distance_meters for transition in route.transitions))
    duration_seconds = int(sum(transition.travel_duration.seconds for transition in route.transitions))

    return OptimizedRoute(
        orderedStops=ordered_stops,
        distanceMeters=distance_meters,
        durationSeconds=duration_seconds,
        carbonGrams=estimate_carbon(distance_meters, "carpool"),
        provider="google-route-optimization",
        polyline=getattr(route, "route_polyline", None),
    )


def build_option(request: RouteComparisonRequest, mode: TransportMode) -> RouteOption:
    distance = deterministic_distance(request.origin, request.destination)
    duration = deterministic_duration(distance, mode)
    cost = estimate_cost(distance, mode)
    carbon = estimate_carbon(distance, mode)
    driving_carbon = estimate_carbon(distance, "driving")
    savings = max(0, driving_carbon - carbon)

    explanation = f"{spanish_mode(mode)} equilibra tiempo, costo y emisiones para esta ruta."
    if mode == "cycling" and distance > 10_000:
        explanation = "La ruta en bici es larga para este viaje; comparala con opciones compartidas antes de decidir."
    if mode == "carpool":
        explanation = "El viaje compartido reduce el costo de gasolina por persona y el CO2 cuando se suman pasajeros compatibles."

    return RouteOption(
        id=f"{mode}-{uuid4().hex[:8]}",
        mode=mode,
        label=spanish_mode(mode),
        distanceMeters=distance,
        durationSeconds=duration,
        costCents=cost,
        carbonGrams=carbon,
        co2SavingsGrams=savings,
        score=score(mode, duration, cost, carbon),
        provider="mock",
        explanation=explanation,
    )


def mock_optimized_route(request: OptimizeRouteRequest) -> OptimizedRoute:
    stops = sorted(request.stops, key=lambda stop: normalize(stop.address))
    distance = deterministic_distance(request.origin.address, request.destination.address) + len(stops) * 1200
    return OptimizedRoute(
        orderedStops=stops,
        distanceMeters=distance,
        durationSeconds=deterministic_duration(distance, "carpool"),
        carbonGrams=estimate_carbon(distance, "carpool"),
        provider="mock",
    )


def spanish_mode(mode: TransportMode) -> str:
    return {
        "driving": "Auto",
        "transit": "Transporte publico",
        "walking": "Caminata",
        "cycling": "Bicicleta",
        "carpool": "Viaje compartido",
    }[mode]


def rank_option(option: RouteOption, preference: RoutePreference) -> int:
    if preference == "fastest":
        return -option.durationSeconds
    if preference == "cheapest":
        return -option.costCents
    if preference == "greenest":
        return -option.carbonGrams
    return option.score


def deterministic_distance(origin: str, destination: str) -> int:
    seed = len(origin.strip()) + len(destination.strip())
    return 5_500 + seed * 430


def deterministic_duration(distance_meters: int, mode: TransportMode) -> int:
    meters_per_second = {
        "driving": 9.5,
        "carpool": 8.5,
        "transit": 6.2,
        "cycling": 4.8,
        "walking": 1.4,
    }[mode]
    return round(distance_meters / meters_per_second)


def estimate_cost(distance_meters: int, mode: TransportMode) -> int:
    distance_km = distance_meters / 1000
    return round(
        {
            "driving": 420 + distance_km * 310,
            "carpool": 250 + distance_km * 130,
            "transit": 1200,
            "cycling": 0,
            "walking": 0,
        }[mode]
    )


def estimate_carbon(distance_meters: int, mode: TransportMode) -> int:
    grams_per_km = {
        "driving": 192,
        "carpool": 82,
        "transit": 55,
        "cycling": 0,
        "walking": 0,
    }[mode]
    return round((distance_meters / 1000) * grams_per_km)


def estimate_co2_savings(distance_meters: int) -> int:
    return max(0, estimate_carbon(distance_meters, "driving") - estimate_carbon(distance_meters, "carpool"))


def score(mode: TransportMode, duration: int, cost: int, carbon: int) -> int:
    base = 100_000 - duration - cost - carbon
    bonus = 800 if mode in ("carpool", "cycling", "walking") else 0
    return max(0, round((base + bonus) / 1000))


def has_coordinates(stop: RouteStop) -> bool:
    return stop.latitude is not None and stop.longitude is not None


def normalize(value: str) -> str:
    return value.strip().lower()


def tokenize(value: str) -> list[str]:
    return [token for token in re.split(r"[^a-z0-9]+", normalize(value)) if len(token) > 2]


def estimate_address_offset(primary: str, candidate: str) -> int:
    primary_normalized = normalize(primary)
    candidate_normalized = normalize(candidate)
    if not primary_normalized or not candidate_normalized:
        return 3500
    if primary_normalized in candidate_normalized or candidate_normalized in primary_normalized:
        return 450

    primary_tokens = tokenize(primary)
    candidate_tokens = tokenize(candidate)
    overlap = len([token for token in candidate_tokens if token in primary_tokens])
    if overlap == 0:
        return 3800
    return max(650, 2600 - overlap * 700)
