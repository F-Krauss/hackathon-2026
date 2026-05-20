import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser, Profile, UpsertProfileRequest } from "@eco-carpool/shared";
import { SupabaseRestService } from "../supabase/supabase-rest.service";

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  has_vehicle?: boolean;
  has_bike?: boolean;
  selfie_verification_status?: Profile["selfieVerificationStatus"];
  default_preference: Profile["defaultPreference"];
  created_at?: string;
  updated_at?: string;
};

@Injectable()
export class ProfilesService {
  constructor(private readonly supabase: SupabaseRestService) {}

  async getProfile(token: string, user: AuthenticatedUser): Promise<Profile> {
    const [row] = await this.supabase.select<ProfileRow>("profiles", token, { id: user.id });
    if (row) {
      return mapProfile(row);
    }

    const [created] = await this.supabase.upsert<ProfileRow>("profiles", token, {
      id: user.id,
      full_name: user.email.split("@")[0],
      username: user.email.split("@")[0],
      has_vehicle: false,
      has_bike: false,
      selfie_verification_status: "not_started",
      default_preference: "balanced",
    });

    return mapProfile(created);
  }

  async updateProfile(token: string, user: AuthenticatedUser, request: UpsertProfileRequest): Promise<Profile> {
    const [row] = await this.supabase.upsert<ProfileRow>("profiles", token, {
      id: user.id,
      full_name: request.fullName,
      username: request.username ?? null,
      phone: request.phone ?? null,
      has_vehicle: request.hasVehicle ?? false,
      has_bike: request.hasBike ?? false,
      default_preference: request.defaultPreference,
      updated_at: new Date().toISOString(),
    });

    return mapProfile(row);
  }
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    hasVehicle: row.has_vehicle ?? false,
    hasBike: row.has_bike ?? false,
    selfieVerificationStatus: row.selfie_verification_status ?? "not_started",
    defaultPreference: row.default_preference,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
