import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { RidesController } from "./rides.controller";
import { RidesService } from "./rides.service";

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
