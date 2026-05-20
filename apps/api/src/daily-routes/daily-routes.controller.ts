import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type {
  AuthenticatedUser,
  CreateDailyRouteRequest,
  CreateDailyRouteSubscriptionRequest,
  DailyRoute,
  DailyRouteSubscription,
} from "@eco-carpool/shared";
import { AccessToken, CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { DailyRoutesService } from "./daily-routes.service";

@Controller("daily-routes")
@UseGuards(AuthGuard)
export class DailyRoutesController {
  constructor(private readonly dailyRoutesService: DailyRoutesService) {}

  @Get()
  listRoutes(@AccessToken() token: string): Promise<DailyRoute[]> {
    return this.dailyRoutesService.listRoutes(token);
  }

  @Post()
  createRoute(
    @AccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateDailyRouteRequest,
  ): Promise<DailyRoute> {
    return this.dailyRoutesService.createRoute(token, user, body);
  }

  @Get(":id/subscriptions")
  listSubscriptions(@AccessToken() token: string, @Param("id") routeId: string): Promise<DailyRouteSubscription[]> {
    return this.dailyRoutesService.listSubscriptions(token, routeId);
  }

  @Post(":id/subscribe")
  subscribe(
    @AccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") routeId: string,
    @Body() body: CreateDailyRouteSubscriptionRequest,
  ): Promise<DailyRouteSubscription> {
    return this.dailyRoutesService.subscribe(token, user, routeId, body);
  }
}
