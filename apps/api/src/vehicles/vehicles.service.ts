import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser, UpsertVehicleRequest, Vehicle } from "@eco-carpool/shared";
import { SupabaseRestService } from "../supabase/supabase-rest.service";

type VehicleRow = {
  id: string;
  owner_id: string;
  label: string;
  seats: number;
  fuel_type: Vehicle["fuelType"];
  fuel_efficiency_km_per_liter: number;
  average_gas_price_cents_per_liter: number;
  created_at?: string;
};

@Injectable()
export class VehiclesService {
  constructor(private readonly supabase: SupabaseRestService) {}

  async listVehicles(token: string, user: AuthenticatedUser): Promise<Vehicle[]> {
    const rows = await this.supabase.select<VehicleRow>("vehicles", token, { owner_id: user.id });
    return rows.map(mapVehicle);
  }

  async createVehicle(token: string, user: AuthenticatedUser, request: UpsertVehicleRequest): Promise<Vehicle> {
    const [row] = await this.supabase.insert<VehicleRow>("vehicles", token, {
      owner_id: user.id,
      label: request.label,
      seats: request.seats,
      fuel_type: request.fuelType,
      fuel_efficiency_km_per_liter: request.fuelEfficiencyKmPerLiter,
      average_gas_price_cents_per_liter: request.averageGasPriceCentsPerLiter,
    });

    return mapVehicle(row);
  }
}

function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    ownerId: row.owner_id,
    label: row.label,
    seats: row.seats,
    fuelType: row.fuel_type,
    fuelEfficiencyKmPerLiter: row.fuel_efficiency_km_per_liter,
    averageGasPriceCentsPerLiter: row.average_gas_price_cents_per_liter,
    createdAt: row.created_at,
  };
}
