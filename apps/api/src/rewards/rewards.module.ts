import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { RewardsController } from "./rewards.controller";
import { RewardsService } from "./rewards.service";

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [RewardsController],
  providers: [RewardsService],
})
export class RewardsModule {}
