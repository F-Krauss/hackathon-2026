import { Injectable } from "@nestjs/common";
import type {
  AuthenticatedUser,
  CreateRideOfferRequest,
  CreateRideRequestRequest,
  RideOffer,
  RideRequest,
} from "@eco-carpool/shared";
import { estimateMobilityCosts } from "../mobility/mobility-calculations";
import { SupabaseRestService } from "../supabase/supabase-rest.service";

type RideOfferRow = {
  id: string;
  driver_id: string;
  vehicle_id?: string | null;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  seats_available: number;
  max_passengers: number;
  price_per_seat_cents: number;
  distance_meters: number;
  estimated_gas_cost_cents: number;
  cost_per_person_cents: number;
  co2_grams: number;
  co2_savings_grams: number;
  status: RideOffer["status"];
  route_estimate_id?: string | null;
  created_at?: string;
};

type RideRequestRow = {
  id: string;
  passenger_id: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time?: string | null;
  seats_needed: number;
  preference: RideRequest["preference"];
  bike_fallback_requested?: boolean;
  status: RideRequest["status"];
  created_at?: string;
};

@Injectable()
export class RidesService {
  constructor(private readonly supabase: SupabaseRestService) {}

  async listOffers(token?: string): Promise<RideOffer[]> {
    if (!token) {
      return seedOffers();
    }

    const rows = await this.supabase.select<RideOfferRow>("ride_offers", token, { status: "open" });
    return rows.map(mapOffer);
  }

  async listRequests(token: string, user: AuthenticatedUser): Promise<RideRequest[]> {
    const rows = await this.supabase.select<RideRequestRow>("ride_requests", token, { passenger_id: user.id });
    return rows.map(mapRequest);
  }

  async createRequest(token: string, user: AuthenticatedUser, request: CreateRideRequestRequest): Promise<RideRequest> {
    const [row] = await this.supabase.insert<RideRequestRow>("ride_requests", token, {
      passenger_id: user.id,
      origin: request.origin,
      destination: request.destination,
      departure_time: request.departureTime,
      arrival_time: request.arrivalTime ?? null,
      seats_needed: request.seatsNeeded,
      preference: request.preference,
      bike_fallback_requested: request.bikeFallbackRequested ?? false,
      status: "open",
    });

    return mapRequest(row);
  }

  async createOffer(token: string, user: AuthenticatedUser, request: CreateRideOfferRequest): Promise<RideOffer> {
    const maxPassengers = Number(request.maxPassengers || request.seatsAvailable || 1);
    const costs = estimateMobilityCosts({
      origin: request.origin,
      destination: request.destination,
      distanceMeters: request.distanceMeters,
      maxPassengers,
      fuelEfficiencyKmPerLiter: request.fuelEfficiencyKmPerLiter,
      averageGasPriceCentsPerLiter: request.averageGasPriceCentsPerLiter,
    });

    const [row] = await this.supabase.insert<RideOfferRow>("ride_offers", token, {
      driver_id: user.id,
      vehicle_id: request.vehicleId ?? null,
      origin: request.origin,
      destination: request.destination,
      departure_time: request.departureTime,
      arrival_time: request.arrivalTime,
      seats_available: request.seatsAvailable,
      max_passengers: maxPassengers,
      price_per_seat_cents: request.pricePerSeatCents || costs.costPerPersonCents,
      distance_meters: costs.distanceMeters,
      estimated_gas_cost_cents: costs.estimatedGasCostCents,
      cost_per_person_cents: costs.costPerPersonCents,
      co2_grams: costs.co2Grams,
      co2_savings_grams: costs.co2SavingsGrams,
      status: "open",
    });

    return mapOffer(row);
  }
}

function mapOffer(row: RideOfferRow): RideOffer {
  return {
    id: row.id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    origin: row.origin,
    destination: row.destination,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    seatsAvailable: row.seats_available,
    maxPassengers: row.max_passengers,
    pricePerSeatCents: row.price_per_seat_cents,
    distanceMeters: row.distance_meters,
    estimatedGasCostCents: row.estimated_gas_cost_cents,
    costPerPersonCents: row.cost_per_person_cents,
    co2Grams: row.co2_grams,
    co2SavingsGrams: row.co2_savings_grams,
    status: row.status,
    routeEstimateId: row.route_estimate_id,
    createdAt: row.created_at,
  };
}

function mapRequest(row: RideRequestRow): RideRequest {
  return {
    id: row.id,
    passengerId: row.passenger_id,
    origin: row.origin,
    destination: row.destination,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    seatsNeeded: row.seats_needed,
    preference: row.preference,
    bikeFallbackRequested: row.bike_fallback_requested,
    status: row.status,
    createdAt: row.created_at,
  };
}

function seedOffers(): RideOffer[] {
  return [
    {
      id: "seed-offer-1",
      driverId: "seed-driver",
      driverName: "Maya Chen",
      origin: "Centro",
      destination: "Campus Norte",
      departureTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      arrivalTime: new Date(Date.now() + 100 * 60 * 1000).toISOString(),
      seatsAvailable: 3,
      maxPassengers: 3,
      pricePerSeatCents: 2500,
      distanceMeters: 9200,
      estimatedGasCostCents: 1840,
      costPerPersonCents: 460,
      co2Grams: 442,
      co2SavingsGrams: 1325,
      status: "open",
      createdAt: new Date().toISOString(),
    },
  ];
}
