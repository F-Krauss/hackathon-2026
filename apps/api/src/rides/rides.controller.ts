import { Body, Controller, Get, Post } from "@nestjs/common";
import type { CreateRideRequest, Ride } from "@eco-carpool/shared";
import { RidesService } from "./rides.service";

@Controller("rides")
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Get()
  listRides(): Ride[] {
    return this.ridesService.listRides();
  }

  @Post()
  createRide(@Body() body: CreateRideRequest): Ride {
    return this.ridesService.createRide(body);
  }
}
