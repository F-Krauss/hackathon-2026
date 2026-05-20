import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser, UpsertVehicleRequest, Vehicle } from "@eco-carpool/shared";
import { AccessToken, CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { VehiclesService } from "./vehicles.service";

@Controller("vehicles")
@UseGuards(AuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  listVehicles(@AccessToken() token: string, @CurrentUser() user: AuthenticatedUser): Promise<Vehicle[]> {
    return this.vehiclesService.listVehicles(token, user);
  }

  @Post()
  createVehicle(
    @AccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertVehicleRequest,
  ): Promise<Vehicle> {
    return this.vehiclesService.createVehicle(token, user, body);
  }
}
