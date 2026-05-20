import type { AuthenticatedUser } from "@eco-carpool/shared";

export interface AuthenticatedRequest {
  accessToken: string;
  user: AuthenticatedUser;
}
