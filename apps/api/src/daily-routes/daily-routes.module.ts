import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { DailyRoutesController } from "./daily-routes.controller";
import { DailyRoutesService } from "./daily-routes.service";

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [DailyRoutesController],
  providers: [DailyRoutesService],
  exports: [DailyRoutesService],
})
export class DailyRoutesModule {}
