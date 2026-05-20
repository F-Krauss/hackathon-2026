import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser, Trip } from "@eco-carpool/shared";
import { SupabaseRestService } from "../supabase/supabase-rest.service";

type TripRow = {
  id: string;
  user_id: string;
  origin: string;
  destination: string;
  mode: Trip["mode"];
  distance_meters: number;
  duration_seconds: number;
  cost_cents: number;
  carbon_grams: number;
  co2_savings_grams: number;
  completed_at: string;
};

@Injectable()
export class TripsService {
  constructor(private readonly supabase: SupabaseRestService) {}

  async getHistory(token: string, user: AuthenticatedUser): Promise<Trip[]> {
    const rows = await this.supabase.select<TripRow>("trips", token, { user_id: user.id });
    return rows.map(mapTrip);
  }
}

export function mapTrip(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    origin: row.origin,
    destination: row.destination,
    mode: row.mode,
    distanceMeters: row.distance_meters,
    durationSeconds: row.duration_seconds,
    costCents: row.cost_cents,
    carbonGrams: row.carbon_grams,
    co2SavingsGrams: row.co2_savings_grams,
    completedAt: row.completed_at,
  };
}
