import { Injectable } from "@nestjs/common";
import type { Carpool } from "@eco-carpool/shared";

@Injectable()
export class CarpoolsService {
  listCarpools(): Carpool[] {
    // TODO: Add matching and carpool lifecycle requirements.
    return [];
  }
}
