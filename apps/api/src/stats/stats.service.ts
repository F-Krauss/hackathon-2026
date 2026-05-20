import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser, SavingsStats } from "@eco-carpool/shared";
import { TripsService } from "../trips/trips.service";

@Injectable()
export class StatsService {
  constructor(private readonly tripsService: TripsService) {}

  async getSavings(token: string, user: AuthenticatedUser): Promise<SavingsStats> {
    const trips = await this.tripsService.getHistory(token, user);

    return {
      tripsCompleted: trips.length,
      totalDistanceMeters: trips.reduce((sum, trip) => sum + trip.distanceMeters, 0),
      totalCo2SavingsGrams: trips.reduce((sum, trip) => sum + trip.co2SavingsGrams, 0),
      totalMoneySavingsCents: trips.reduce((sum, trip) => sum + Math.max(0, 650 - trip.costCents), 0),
      carpoolTrips: trips.filter((trip) => trip.mode === "carpool").length,
    };
  }
}
