import { Injectable } from "@nestjs/common";
import type { CreateRideRequest, Ride } from "@eco-carpool/shared";
import { randomUUID } from "node:crypto";

@Injectable()
export class RidesService {
  private readonly rides: Ride[] = [
    {
      id: "ride-seed-1",
      driverName: "Maya Chen",
      origin: "Downtown",
      destination: "North Campus",
      departureTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      seatsAvailable: 3,
      status: "open",
      estimatedCo2SavingsGrams: 1800,
    },
  ];

  listRides(): Ride[] {
    return this.rides;
  }

  createRide(request: CreateRideRequest): Ride {
    // TODO: Replace this in-memory placeholder with persistence after requirements are defined.
    const ride: Ride = {
      id: randomUUID(),
      ...request,
      status: "draft",
    };

    this.rides.push(ride);
    return ride;
  }
}
