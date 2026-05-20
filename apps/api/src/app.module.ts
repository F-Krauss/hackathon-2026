import { Module } from "@nestjs/common";
import { CarpoolsModule } from "./carpools/carpools.module";
import { DailyRoutesModule } from "./daily-routes/daily-routes.module";
import { HealthModule } from "./health/health.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { RidesModule } from "./rides/rides.module";
import { RoutesModule } from "./routes/routes.module";
import { StatsModule } from "./stats/stats.module";
import { RewardsModule } from "./rewards/rewards.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { TripsModule } from "./trips/trips.module";
import { UsersModule } from "./users/users.module";
import { VehiclesModule } from "./vehicles/vehicles.module";

@Module({
  imports: [
    SupabaseModule,
    HealthModule,
    ProfilesModule,
    RidesModule,
    UsersModule,
    CarpoolsModule,
    DailyRoutesModule,
    RoutesModule,
    TripsModule,
    StatsModule,
    RewardsModule,
    VehiclesModule,
  ],
})
export class AppModule {}
