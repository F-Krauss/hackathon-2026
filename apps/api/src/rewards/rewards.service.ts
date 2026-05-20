import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser, Reward } from "@eco-carpool/shared";
import { SupabaseRestService } from "../supabase/supabase-rest.service";

type RewardRow = {
  id: string;
  user_id: string;
  label: string;
  points: number;
  reason: string;
  earned_at: string;
};

@Injectable()
export class RewardsService {
  constructor(private readonly supabase: SupabaseRestService) {}

  async getRewards(token: string, user: AuthenticatedUser): Promise<Reward[]> {
    const rows = await this.supabase.select<RewardRow>("rewards", token, { user_id: user.id });
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      label: row.label,
      points: row.points,
      reason: row.reason,
      earnedAt: row.earned_at,
    }));
  }
}
