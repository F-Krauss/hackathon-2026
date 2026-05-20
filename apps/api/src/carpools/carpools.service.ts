import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser, Carpool, CarpoolMatch, OptimizedRoute, RideOffer, RideRequest } from "@eco-carpool/shared";
import { estimateAddressOffsetMeters } from "../mobility/mobility-calculations";
import { SupabaseRestService } from "../supabase/supabase-rest.service";

type CarpoolRow = {
  id: string;
  offer_id: string;
  request_id: string;
  driver_id: string;
  passenger_id: string;
  status: Carpool["status"];
  created_at?: string;
};

@Injectable()
export class CarpoolsService {
  private readonly agentServiceUrl = process.env.AGENT_SERVICE_URL ?? "http://localhost:8001";

  constructor(private readonly supabase: SupabaseRestService) {}

  async suggestMatches(token: string, user: AuthenticatedUser, requestId?: string): Promise<CarpoolMatch[]> {
    const offers = await this.supabase.select<DbRideOffer>("ride_offers", token, { status: "open" });
    const requests = requestId
      ? await this.supabase.select<DbRideRequest>("ride_requests", token, { id: requestId })
      : await this.supabase.select<DbRideRequest>("ride_requests", token, { passenger_id: user.id, status: "open" });

    const response = await fetch(`${this.agentServiceUrl}/matches/suggest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offers, requests }),
    });

    if (!response.ok) {
      return fallbackMatches(offers.map(mapDbOffer), requests.map(mapDbRequest));
    }

    return (await response.json()) as CarpoolMatch[];
  }

  async acceptMatch(token: string, user: AuthenticatedUser, offerId: string, requestId: string): Promise<Carpool> {
    const [offer] = await this.supabase.select<DbRideOffer>("ride_offers", token, { id: offerId });
    const [request] = await this.supabase.select<DbRideRequest>("ride_requests", token, { id: requestId });
    if (offer.driver_id !== user.id) {
      throw new ForbiddenException("Solo el conductor puede confirmar y modificar esta ruta compartida");
    }

    const [row] = await this.supabase.insert<CarpoolRow>("carpools", token, {
      offer_id: offerId,
      request_id: requestId,
      driver_id: offer.driver_id,
      passenger_id: request.passenger_id,
      status: "accepted",
    });

    await this.supabase.update("ride_requests", token, { id: request.id }, { status: "matched" });
    await this.supabase.update("ride_offers", token, { id: offer.id }, { status: "matched" });
    await this.optimizeAcceptedRoute(token, offer, request);

    return mapCarpool(row);
  }

  private async optimizeAcceptedRoute(token: string, offer: DbRideOffer, request: DbRideRequest): Promise<void> {
    const response = await fetch(`${this.agentServiceUrl}/routes/optimize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin: { label: "Origen del conductor", address: offer.origin },
        destination: { label: "Destino del conductor", address: offer.destination },
        stops: [
          { label: "Recogida del pasajero", address: request.origin },
          { label: "Bajada del pasajero", address: request.destination },
        ],
        preference: request.preference ?? "balanced",
      }),
    }).catch(() => null);

    if (!response?.ok) {
      return;
    }

    const optimized = (await response.json()) as OptimizedRoute;
    const [estimate] = await this.supabase
      .insert<{ id: string }>("route_estimates", token, {
        origin: offer.origin,
        destination: offer.destination,
        preference: request.preference ?? "balanced",
        recommended_option_id: "accepted-carpool",
        options: [optimized],
      })
      .catch(() => []);

    if (estimate?.id) {
      await this.supabase.update("ride_offers", token, { id: offer.id }, { route_estimate_id: estimate.id }).catch(() => undefined);
    }
  }
}

type DbRideOffer = RideOffer & {
  driver_id: string;
  vehicle_id?: string | null;
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
};

type DbRideRequest = RideRequest & {
  passenger_id: string;
  departure_time: string;
  arrival_time?: string | null;
  seats_needed: number;
  bike_fallback_requested?: boolean;
};

function mapDbOffer(row: DbRideOffer): RideOffer {
  return {
    id: row.id,
    driverId: row.driverId ?? row.driver_id,
    vehicleId: row.vehicleId ?? row.vehicle_id,
    origin: row.origin,
    destination: row.destination,
    departureTime: row.departureTime ?? row.departure_time,
    arrivalTime: row.arrivalTime ?? row.arrival_time,
    seatsAvailable: row.seatsAvailable ?? row.seats_available,
    maxPassengers: row.maxPassengers ?? row.max_passengers,
    pricePerSeatCents: row.pricePerSeatCents ?? row.price_per_seat_cents,
    distanceMeters: row.distanceMeters ?? row.distance_meters,
    estimatedGasCostCents: row.estimatedGasCostCents ?? row.estimated_gas_cost_cents,
    costPerPersonCents: row.costPerPersonCents ?? row.cost_per_person_cents,
    co2Grams: row.co2Grams ?? row.co2_grams,
    co2SavingsGrams: row.co2SavingsGrams ?? row.co2_savings_grams,
    status: row.status,
  };
}

function mapDbRequest(row: DbRideRequest): RideRequest {
  return {
    id: row.id,
    passengerId: row.passengerId ?? row.passenger_id,
    origin: row.origin,
    destination: row.destination,
    departureTime: row.departureTime ?? row.departure_time,
    arrivalTime: row.arrivalTime ?? row.arrival_time,
    seatsNeeded: row.seatsNeeded ?? row.seats_needed,
    preference: row.preference,
    bikeFallbackRequested: row.bikeFallbackRequested ?? row.bike_fallback_requested,
    status: row.status,
  };
}

function mapCarpool(row: CarpoolRow): Carpool {
  return {
    id: row.id,
    offerId: row.offer_id,
    requestId: row.request_id,
    driverId: row.driver_id,
    passengerId: row.passenger_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function fallbackMatches(offers: RideOffer[], requests: RideRequest[]): CarpoolMatch[] {
  return offers.flatMap((offer) =>
    requests.flatMap((request): CarpoolMatch[] => {
      const pickupOffset = estimateAddressOffsetMeters(offer.origin, request.origin);
      const dropoffOffset = estimateAddressOffsetMeters(offer.destination, request.destination);
      if (pickupOffset > 2_500 || dropoffOffset > 2_500) {
        return [];
      }

      return [
        {
          offerId: offer.id,
          requestId: request.id,
          score: Math.max(60, 100 - Math.round((pickupOffset + dropoffOffset) / 100)),
          pickupOffsetMeters: pickupOffset,
          dropoffOffsetMeters: dropoffOffset,
          sharedDistanceMeters: offer.distanceMeters || 7400,
          estimatedSavingsCents: Math.max(offer.costPerPersonCents || offer.pricePerSeatCents || 0, 0),
          estimatedCo2SavingsGrams: offer.co2SavingsGrams || 1800,
          requiresDriverConfirmation: true,
          reason: "Recogida y destino cercanos; se requiere confirmacion del conductor antes de ajustar la ruta.",
        },
      ];
    }),
  );
}
