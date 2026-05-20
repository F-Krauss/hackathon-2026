import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { TripsModule } from "../trips/trips.module";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
  imports: [AuthModule, SupabaseModule, TripsModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
