import { Injectable } from "@nestjs/common";
import type { Profile } from "@eco-carpool/shared";

@Injectable()
export class UsersService {
  listUsers(): Profile[] {
    // TODO: Add real user storage and profile requirements.
    return [];
  }
}
