import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseRestService } from "../supabase/supabase-rest.service";
import type { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseRestService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const token = getBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Falta el token bearer");
    }

    request.accessToken = token;
    request.user = await this.supabase.getUser(token);
    return true;
  }
}

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}
