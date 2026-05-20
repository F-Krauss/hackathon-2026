import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { RoutesController } from "./routes.controller";
import { RoutesService } from "./routes.service";

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
