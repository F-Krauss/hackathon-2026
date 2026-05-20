import { Controller, Get, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser, Trip } from "@eco-carpool/shared";
import { AccessToken, CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { TripsService } from "./trips.service";

@Controller("trips")
@UseGuards(AuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get("history")
  getHistory(@AccessToken() token: string, @CurrentUser() user: AuthenticatedUser): Promise<Trip[]> {
    return this.tripsService.getHistory(token, user);
  }
}
