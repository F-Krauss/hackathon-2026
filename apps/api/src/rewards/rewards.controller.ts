import { Controller, Get, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser, Reward } from "@eco-carpool/shared";
import { AccessToken, CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { RewardsService } from "./rewards.service";

@Controller("rewards")
@UseGuards(AuthGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  getRewards(@AccessToken() token: string, @CurrentUser() user: AuthenticatedUser): Promise<Reward[]> {
    return this.rewardsService.getRewards(token, user);
  }
}
