import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { OptimizedRoute, OptimizeRouteRequest, RouteComparisonResponse, RouteEstimateRequest } from "@eco-carpool/shared";
import { SupabaseRestService } from "../supabase/supabase-rest.service";

@Injectable()
export class RoutesService {
  private readonly agentServiceUrl = process.env.AGENT_SERVICE_URL ?? "http://localhost:8001";

  constructor(private readonly supabase: SupabaseRestService) {}

  async compareRoutes(token: string, request: RouteEstimateRequest): Promise<RouteComparisonResponse> {
    const comparison = await this.postToAgent<RouteComparisonResponse>("/routes/compare", request);

    await this.supabase
      .insert("route_estimates", token, {
        origin: comparison.origin,
        destination: comparison.destination,
        preference: comparison.preference,
        recommended_option_id: comparison.recommendedOptionId,
        options: comparison.options,
      })
      .catch(() => undefined);

    return comparison;
  }

  async optimizeRoute(_token: string, request: OptimizeRouteRequest): Promise<OptimizedRoute> {
    return this.postToAgent<OptimizedRoute>("/routes/optimize", request);
  }

  private async postToAgent<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.agentServiceUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }).catch((error: unknown) => {
      throw new ServiceUnavailableException({
        message: "El servicio de agente no esta disponible",
        cause: error instanceof Error ? error.message : "Error desconocido del servicio de agente",
      });
    });

    if (!response.ok) {
      throw new ServiceUnavailableException({
        message: "El servicio de agente devolvio un error",
        statusCode: response.status,
      });
    }

    return (await response.json()) as T;
  }
}
