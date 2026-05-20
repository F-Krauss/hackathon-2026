import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser, Profile, UpsertProfileRequest } from "@eco-carpool/shared";
import { AccessToken, CurrentUser } from "../auth/current-user.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { ProfilesService } from "./profiles.service";

@Controller("profile")
@UseGuards(AuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  getProfile(@AccessToken() token: string, @CurrentUser() user: AuthenticatedUser): Promise<Profile> {
    return this.profilesService.getProfile(token, user);
  }

  @Put()
  updateProfile(
    @AccessToken() token: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertProfileRequest,
  ): Promise<Profile> {
    return this.profilesService.updateProfile(token, user, body);
  }
}
