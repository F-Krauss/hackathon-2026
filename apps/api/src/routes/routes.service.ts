import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { RouteEstimate, RouteEstimateRequest } from "@eco-carpool/shared";

@Injectable()
export class RoutesService {
  private readonly routeServiceUrl = process.env.ROUTES_SERVICE_URL ?? "http://localhost:8001";

  async estimateRoute(request: RouteEstimateRequest): Promise<RouteEstimate> {
    const response = await fetch(`${this.routeServiceUrl}/estimate-route`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    }).catch((error: unknown) => {
      throw new ServiceUnavailableException({
        message: "Route service is unavailable",
        cause: error instanceof Error ? error.message : "Unknown route service error",
      });
    });

    if (!response.ok) {
      throw new ServiceUnavailableException({
        message: "Route service returned an error",
        statusCode: response.status,
      });
    }

    return (await response.json()) as RouteEstimate;
  }
}
