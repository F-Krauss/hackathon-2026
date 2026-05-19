export type HealthStatus = "ok" | "degraded";

export interface HealthResponse {
  service: string;
  status: HealthStatus;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export type RideStatus = "draft" | "open" | "matched" | "cancelled";

export interface Ride {
  id: string;
  driverName: string;
  origin: string;
  destination: string;
  departureTime: string;
  seatsAvailable: number;
  status: RideStatus;
  estimatedCo2SavingsGrams?: number;
}

export interface CreateRideRequest {
  driverName: string;
  origin: string;
  destination: string;
  departureTime: string;
  seatsAvailable: number;
}

export interface Carpool {
  id: string;
  rideId: string;
  passengerIds: string[];
  status: "forming" | "confirmed" | "completed";
}

export interface RouteEstimateRequest {
  origin: string;
  destination: string;
  waypoints?: string[];
}

export interface RouteEstimate {
  origin: string;
  destination: string;
  distanceMeters: number;
  durationSeconds: number;
  estimatedCo2SavingsGrams: number;
  provider: "mock" | "google-maps";
  polyline?: string;
}
