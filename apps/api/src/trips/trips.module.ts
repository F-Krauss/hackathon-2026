import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { TripsController } from "./trips.controller";
import { TripsService } from "./trips.service";

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
