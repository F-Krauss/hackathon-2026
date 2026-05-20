export type HealthStatus = "ok" | "degraded";

export interface HealthResponse {
  service: string;
  status: HealthStatus;
  timestamp: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  phone: string | null;
  hasVehicle: boolean;
  hasBike: boolean;
  selfieVerificationStatus: "not_started" | "pending" | "verified";
  defaultPreference: RoutePreference;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertProfileRequest {
  fullName: string;
  username?: string;
  phone?: string;
  hasVehicle?: boolean;
  hasBike?: boolean;
  defaultPreference: RoutePreference;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  label: string;
  seats: number;
  fuelType: "gasoline" | "hybrid" | "electric";
  fuelEfficiencyKmPerLiter: number;
  averageGasPriceCentsPerLiter: number;
  createdAt?: string;
}

export interface UpsertVehicleRequest {
  label: string;
  seats: number;
  fuelType: Vehicle["fuelType"];
  fuelEfficiencyKmPerLiter: number;
  averageGasPriceCentsPerLiter: number;
}

export type RoutePreference = "fastest" | "cheapest" | "greenest" | "balanced";
export type TransportMode = "driving" | "transit" | "walking" | "cycling" | "carpool";

export type RideStatus = "draft" | "open" | "matched" | "cancelled";

export interface RideOffer {
  id: string;
  driverId: string;
  driverName?: string;
  vehicleId?: string | null;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  seatsAvailable: number;
  maxPassengers: number;
  pricePerSeatCents?: number;
  distanceMeters: number;
  estimatedGasCostCents: number;
  costPerPersonCents: number;
  co2Grams: number;
  co2SavingsGrams: number;
  status: RideStatus;
  routeEstimateId?: string | null;
  createdAt?: string;
}

export interface CreateRideOfferRequest {
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  seatsAvailable: number;
  maxPassengers: number;
  pricePerSeatCents: number;
  vehicleId?: string;
  distanceMeters?: number;
  fuelEfficiencyKmPerLiter?: number;
  averageGasPriceCentsPerLiter?: number;
}

export interface RideRequest {
  id: string;
  passengerId: string;
  passengerName?: string;
  origin: string;
  destination: string;
  bikeFallbackRequested?: boolean;
  departureTime: string;
  arrivalTime?: string | null;
  seatsNeeded: number;
  preference: RoutePreference;
  status: "open" | "matched" | "cancelled";
  createdAt?: string;
}

export interface CreateRideRequestRequest {
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime?: string;
  seatsNeeded: number;
  preference: RoutePreference;
  bikeFallbackRequested?: boolean;
}

export interface CarpoolMatch {
  offerId: string;
  requestId: string;
  score: number;
  pickupOffsetMeters: number;
  dropoffOffsetMeters: number;
  sharedDistanceMeters: number;
  estimatedSavingsCents: number;
  estimatedCo2SavingsGrams: number;
  requiresDriverConfirmation: boolean;
  reason: string;
}

export interface DailyRoute {
  id: string;
  driverId: string;
  vehicleId?: string | null;
  label: string;
  origin: string;
  destination: string;
  daysOfWeek: number[];
  departureTime: string;
  arrivalTime: string;
  maxPassengers: number;
  distanceMeters: number;
  estimatedGasCostCents: number;
  costPerPersonCents: number;
  co2Grams: number;
  co2SavingsGrams: number;
  status: "active" | "paused";
  createdAt?: string;
}

export interface CreateDailyRouteRequest {
  label: string;
  origin: string;
  destination: string;
  daysOfWeek: number[];
  departureTime: string;
  arrivalTime: string;
  maxPassengers: number;
  vehicleId?: string;
  distanceMeters?: number;
  fuelEfficiencyKmPerLiter?: number;
  averageGasPriceCentsPerLiter?: number;
}

export interface DailyRouteSubscription {
  id: string;
  routeId: string;
  passengerId: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: "pending" | "accepted" | "rejected";
  pickupOffsetMeters: number;
  dropoffOffsetMeters: number;
  estimatedCostShareCents: number;
  estimatedCo2SavingsGrams: number;
  createdAt?: string;
}

export interface CreateDailyRouteSubscriptionRequest {
  pickupAddress: string;
  dropoffAddress: string;
}

export interface Carpool {
  id: string;
  offerId: string;
  requestId: string;
  driverId: string;
  passengerId: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  createdAt?: string;
}

export interface RouteEstimateRequest {
  origin: string;
  destination: string;
  waypoints?: RouteStop[];
  preference?: RoutePreference;
  modes?: TransportMode[];
}

export interface RouteStop {
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface RouteOption {
  id: string;
  mode: TransportMode;
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  costCents: number;
  carbonGrams: number;
  co2SavingsGrams: number;
  score: number;
  provider: "mock" | "google-route-optimization";
  polyline?: string | null;
  explanation: string;
}

export interface RouteComparisonResponse {
  preference: RoutePreference;
  origin: string;
  destination: string;
  recommendedOptionId: string;
  options: RouteOption[];
}

export interface OptimizeRouteRequest {
  origin: RouteStop;
  destination: RouteStop;
  stops: RouteStop[];
  preference: RoutePreference;
}

export interface OptimizedRoute {
  orderedStops: RouteStop[];
  distanceMeters: number;
  durationSeconds: number;
  carbonGrams: number;
  provider: "mock" | "google-route-optimization";
  polyline?: string | null;
}

export interface Trip {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  distanceMeters: number;
  durationSeconds: number;
  costCents: number;
  carbonGrams: number;
  co2SavingsGrams: number;
  completedAt: string;
}

export interface SavingsStats {
  tripsCompleted: number;
  totalDistanceMeters: number;
  totalCo2SavingsGrams: number;
  totalMoneySavingsCents: number;
  carpoolTrips: number;
}

export interface Reward {
  id: string;
  userId: string;
  label: string;
  points: number;
  reason: string;
  earnedAt: string;
}
