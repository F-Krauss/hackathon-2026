import { Module } from "@nestjs/common";
import { CarpoolsModule } from "./carpools/carpools.module";
import { HealthModule } from "./health/health.module";
import { RidesModule } from "./rides/rides.module";
import { RoutesModule } from "./routes/routes.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [HealthModule, RidesModule, UsersModule, CarpoolsModule, RoutesModule],
})
export class AppModule {}
