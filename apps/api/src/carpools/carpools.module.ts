import { Module } from "@nestjs/common";
import { CarpoolsService } from "./carpools.service";

@Module({
  providers: [CarpoolsService],
  exports: [CarpoolsService],
})
export class CarpoolsModule {}
