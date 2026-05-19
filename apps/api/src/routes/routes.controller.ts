import { Body, Controller, Post } from "@nestjs/common";
import type { RouteEstimate, RouteEstimateRequest } from "@eco-carpool/shared";
import { RoutesService } from "./routes.service";

@Controller("routes")
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post("estimate")
  estimateRoute(@Body() body: RouteEstimateRequest): Promise<RouteEstimate> {
    return this.routesService.estimateRoute(body);
  }
}
