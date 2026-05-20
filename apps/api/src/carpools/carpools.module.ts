import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SupabaseModule } from "../supabase/supabase.module";
import { CarpoolsController } from "./carpools.controller";
import { CarpoolsService } from "./carpools.service";

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [CarpoolsController],
  providers: [CarpoolsService],
  exports: [CarpoolsService],
})
export class CarpoolsModule {}
