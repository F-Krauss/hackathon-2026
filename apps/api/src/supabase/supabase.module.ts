import { Module } from "@nestjs/common";
import { SupabaseRestService } from "./supabase-rest.service";

@Module({
  providers: [SupabaseRestService],
  exports: [SupabaseRestService],
})
export class SupabaseModule {}
