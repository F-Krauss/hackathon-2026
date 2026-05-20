import { Controller, Get, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser, SavingsStats } from "@eco-carpool/shared";
import { AccessToken, CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { StatsService } from "./stats.service";

@Controller("stats")
@UseGuards(AuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("savings")
  getSavings(@AccessToken() token: string, @CurrentUser() user: AuthenticatedUser): Promise<SavingsStats> {
    return this.statsService.getSavings(token, user);
  }
}
