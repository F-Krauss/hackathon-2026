import { Body, Controller, Get, Headers, Post, UseGuards } from "@nestjs/common";
import type {
  AuthenticatedUser,
  CreateRideOfferRequest,
  CreateRideRequestRequest,
  RideOffer,
  RideRequest,
} from "@eco-carpool/shared";
import { AccessToken, CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { RidesService } from "./rides.service";

@Controller("rides")
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Get("offers")
  listOffers(@Headers("authorization") authorization?: string): Promise<RideOffer[]> {
    return this.ridesService.listOffers(readBearerToken(authorization));
  }

  @Post("offers")
  @UseGuards(AuthGuard)
  createOffer(
    @AccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRideOfferRequest,
  ): Promise<RideOffer> {
    return this.ridesService.createOffer(token, user, body);
  }

  @Get("requests")
  @UseGuards(AuthGuard)
  listRequests(@AccessToken() token: string, @CurrentUser() user: AuthenticatedUser): Promise<RideRequest[]> {
    return this.ridesService.listRequests(token, user);
  }

  @Post("requests")
  @UseGuards(AuthGuard)
  createRequest(
    @AccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateRideRequestRequest,
  ): Promise<RideRequest> {
    return this.ridesService.createRequest(token, user, body);
  }
}

function readBearerToken(authorization: string | undefined): string | undefined {
  const [scheme, token] = authorization?.split(" ") ?? [];
  return scheme?.toLowerCase() === "bearer" ? token : undefined;
}
