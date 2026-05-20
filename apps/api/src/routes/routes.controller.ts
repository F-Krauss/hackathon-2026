import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import type { OptimizedRoute, OptimizeRouteRequest, RouteComparisonResponse, RouteEstimateRequest } from "@eco-carpool/shared";
import { AccessToken } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { RoutesService } from "./routes.service";

@Controller("routes")
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post("compare")
  @UseGuards(AuthGuard)
  compareRoutes(@AccessToken() token: string, @Body() body: RouteEstimateRequest): Promise<RouteComparisonResponse> {
    return this.routesService.compareRoutes(token, body);
  }

  @Post("optimize")
  @UseGuards(AuthGuard)
  optimizeRoute(@AccessToken() token: string, @Body() body: OptimizeRouteRequest): Promise<OptimizedRoute> {
    return this.routesService.optimizeRoute(token, body);
  }
}
