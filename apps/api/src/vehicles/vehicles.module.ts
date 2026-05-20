import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
