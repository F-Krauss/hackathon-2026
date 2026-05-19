import { Injectable } from "@nestjs/common";
import type { User } from "@eco-carpool/shared";

@Injectable()
export class UsersService {
  listUsers(): User[] {
    // TODO: Add real user storage and profile requirements.
    return [];
  }
}
