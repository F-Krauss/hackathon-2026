import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedUser } from "@eco-carpool/shared";

type Filters = Record<string, string | number | boolean | null>;

@Injectable()
export class SupabaseRestService {
  private readonly url = process.env.SUPABASE_URL;
  private readonly key = process.env.SUPABASE_PUBLISHABLE_KEY;

  async getUser(token: string): Promise<AuthenticatedUser> {
    const response = await fetch(`${this.requireUrl()}/auth/v1/user`, {
      headers: this.headers(token),
    });

    if (!response.ok) {
      throw new UnauthorizedException("Sesion de Supabase invalida");
    }

    const user = (await response.json()) as { id: string; email?: string };
    return {
      id: user.id,
      email: user.email ?? "",
    };
  }

  async select<T>(table: string, token: string, filters: Filters = {}, select = "*"): Promise<T[]> {
    const response = await fetch(this.buildUrl(table, filters, select), {
      headers: this.headers(token),
    });

    return this.parse<T[]>(response);
  }

  async insert<T>(table: string, token: string, body: unknown): Promise<T[]> {
    const response = await fetch(`${this.requireUrl()}/rest/v1/${table}`, {
      method: "POST",
      headers: this.headers(token, true),
      body: JSON.stringify(body),
    });

    return this.parse<T[]>(response);
  }

  async upsert<T>(table: string, token: string, body: unknown, onConflict = "id"): Promise<T[]> {
    const response = await fetch(`${this.requireUrl()}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        ...this.headers(token, true),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(body),
    });

    return this.parse<T[]>(response);
  }

  async update<T>(table: string, token: string, filters: Filters, body: unknown): Promise<T[]> {
    const response = await fetch(this.buildUrl(table, filters), {
      method: "PATCH",
      headers: this.headers(token, true),
      body: JSON.stringify(body),
    });

    return this.parse<T[]>(response);
  }

  private buildUrl(table: string, filters: Filters, select = "*"): string {
    const params = new URLSearchParams({ select });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined) {
        params.set(key, `eq.${value}`);
      }
    }
    return `${this.requireUrl()}/rest/v1/${table}?${params.toString()}`;
  }

  private headers(token: string, write = false): Record<string, string> {
    return {
      apikey: this.requireKey(),
      authorization: `Bearer ${token}`,
      ...(write ? { "content-type": "application/json", Prefer: "return=representation" } : {}),
    };
  }

  private async parse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const message = await response.text();
      throw new InternalServerErrorException(message || `Supabase request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private requireUrl(): string {
    if (!this.url) {
      throw new InternalServerErrorException("SUPABASE_URL no esta configurada");
    }
    return this.url;
  }

  private requireKey(): string {
    if (!this.key) {
      throw new InternalServerErrorException("SUPABASE_PUBLISHABLE_KEY no esta configurada");
    }
    return this.key;
  }
}
