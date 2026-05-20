import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser, Carpool, CarpoolMatch } from "@eco-carpool/shared";
import { AccessToken, CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { CarpoolsService } from "./carpools.service";

@Controller("carpools")
@UseGuards(AuthGuard)
export class CarpoolsController {
  constructor(private readonly carpoolsService: CarpoolsService) {}

  @Post("match")
  suggestMatches(
    @AccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { requestId?: string },
  ): Promise<CarpoolMatch[]> {
    return this.carpoolsService.suggestMatches(token, user, body.requestId);
  }

  @Post(":id/accept")
  acceptMatch(
    @AccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") offerId: string,
    @Body() body: { requestId: string },
  ): Promise<Carpool> {
    return this.carpoolsService.acceptMatch(token, user, offerId, body.requestId);
  }
}
