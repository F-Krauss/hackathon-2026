import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AuthenticatedUser,
  CreateDailyRouteRequest,
  CreateDailyRouteSubscriptionRequest,
  DailyRoute,
  DailyRouteSubscription,
} from "@eco-carpool/shared";
import { estimateAddressOffsetMeters, estimateMobilityCosts } from "../mobility/mobility-calculations";
import { SupabaseRestService } from "../supabase/supabase-rest.service";

const MAX_ROUTE_JOIN_OFFSET_METERS = 2_500;

type DailyRouteRow = {
  id: string;
  driver_id: string;
  vehicle_id?: string | null;
  label: string;
  origin: string;
  destination: string;
  days_of_week: number[];
  departure_time: string;
  arrival_time: string;
  max_passengers: number;
  distance_meters: number;
  estimated_gas_cost_cents: number;
  cost_per_person_cents: number;
  co2_grams: number;
  co2_savings_grams: number;
  status: DailyRoute["status"];
  created_at?: string;
};

type DailyRouteSubscriptionRow = {
  id: string;
  route_id: string;
  passenger_id: string;
  pickup_address: string;
  dropoff_address: string;
  status: DailyRouteSubscription["status"];
  pickup_offset_meters: number;
  dropoff_offset_meters: number;
  estimated_cost_share_cents: number;
  estimated_co2_savings_grams: number;
  created_at?: string;
};

@Injectable()
export class DailyRoutesService {
  constructor(private readonly supabase: SupabaseRestService) {}

  async listRoutes(token: string): Promise<DailyRoute[]> {
    const rows = await this.supabase.select<DailyRouteRow>("daily_routes", token, { status: "active" });
    return rows.map(mapDailyRoute);
  }

  async listSubscriptions(token: string, routeId: string): Promise<DailyRouteSubscription[]> {
    const rows = await this.supabase.select<DailyRouteSubscriptionRow>("daily_route_subscriptions", token, {
      route_id: routeId,
    });
    return rows.map(mapSubscription);
  }

  async createRoute(token: string, user: AuthenticatedUser, request: CreateDailyRouteRequest): Promise<DailyRoute> {
    const maxPassengers = Math.max(1, Number(request.maxPassengers || 1));
    const costs = estimateMobilityCosts({
      origin: request.origin,
      destination: request.destination,
      distanceMeters: request.distanceMeters,
      maxPassengers,
      fuelEfficiencyKmPerLiter: request.fuelEfficiencyKmPerLiter,
      averageGasPriceCentsPerLiter: request.averageGasPriceCentsPerLiter,
    });

    const [row] = await this.supabase.insert<DailyRouteRow>("daily_routes", token, {
      driver_id: user.id,
      vehicle_id: request.vehicleId ?? null,
      label: request.label,
      origin: request.origin,
      destination: request.destination,
      days_of_week: request.daysOfWeek,
      departure_time: request.departureTime,
      arrival_time: request.arrivalTime,
      max_passengers: maxPassengers,
      distance_meters: costs.distanceMeters,
      estimated_gas_cost_cents: costs.estimatedGasCostCents,
      cost_per_person_cents: costs.costPerPersonCents,
      co2_grams: costs.co2Grams,
      co2_savings_grams: costs.co2SavingsGrams,
      status: "active",
    });

    return mapDailyRoute(row);
  }

  async subscribe(
    token: string,
    user: AuthenticatedUser,
    routeId: string,
    request: CreateDailyRouteSubscriptionRequest,
  ): Promise<DailyRouteSubscription> {
    const [route] = await this.supabase.select<DailyRouteRow>("daily_routes", token, { id: routeId });
    if (!route) {
      throw new NotFoundException("Ruta diaria no encontrada");
    }

    const pickupOffset = estimateAddressOffsetMeters(route.origin, request.pickupAddress);
    const dropoffOffset = estimateAddressOffsetMeters(route.destination, request.dropoffAddress);
    if (pickupOffset > MAX_ROUTE_JOIN_OFFSET_METERS || dropoffOffset > MAX_ROUTE_JOIN_OFFSET_METERS) {
      throw new BadRequestException("La recogida o el destino no estan lo bastante cerca de esta ruta compartida");
    }

    const [row] = await this.supabase.insert<DailyRouteSubscriptionRow>("daily_route_subscriptions", token, {
      route_id: routeId,
      passenger_id: user.id,
      pickup_address: request.pickupAddress,
      dropoff_address: request.dropoffAddress,
      status: "pending",
      pickup_offset_meters: pickupOffset,
      dropoff_offset_meters: dropoffOffset,
      estimated_cost_share_cents: route.cost_per_person_cents,
      estimated_co2_savings_grams: route.co2_savings_grams,
    });

    return mapSubscription(row);
  }
}

function mapDailyRoute(row: DailyRouteRow): DailyRoute {
  return {
    id: row.id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    label: row.label,
    origin: row.origin,
    destination: row.destination,
    daysOfWeek: row.days_of_week,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    maxPassengers: row.max_passengers,
    distanceMeters: row.distance_meters,
    estimatedGasCostCents: row.estimated_gas_cost_cents,
    costPerPersonCents: row.cost_per_person_cents,
    co2Grams: row.co2_grams,
    co2SavingsGrams: row.co2_savings_grams,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapSubscription(row: DailyRouteSubscriptionRow): DailyRouteSubscription {
  return {
    id: row.id,
    routeId: row.route_id,
    passengerId: row.passenger_id,
    pickupAddress: row.pickup_address,
    dropoffAddress: row.dropoff_address,
    status: row.status,
    pickupOffsetMeters: row.pickup_offset_meters,
    dropoffOffsetMeters: row.dropoff_offset_meters,
    estimatedCostShareCents: row.estimated_cost_share_cents,
    estimatedCo2SavingsGrams: row.estimated_co2_savings_grams,
    createdAt: row.created_at,
  };
}
