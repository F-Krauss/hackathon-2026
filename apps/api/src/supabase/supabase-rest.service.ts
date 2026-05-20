import { randomUUID } from "node:crypto";
import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedUser } from "@eco-carpool/shared";

type Filters = Record<string, string | number | boolean | null>;
type DbRow = Record<string, unknown>;

const fallbackTables = new Map<string, DbRow[]>();

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

    return this.parse<T[]>(response, () => this.selectFallback(table, filters) as T[]);
  }

  async insert<T>(table: string, token: string, body: unknown): Promise<T[]> {
    const response = await fetch(`${this.requireUrl()}/rest/v1/${table}`, {
      method: "POST",
      headers: this.headers(token, true),
      body: JSON.stringify(body),
    });

    return this.parse<T[]>(response, () => this.insertFallback(table, body) as T[]);
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

    return this.parse<T[]>(response, () => this.upsertFallback(table, body, onConflict) as T[]);
  }

  async update<T>(table: string, token: string, filters: Filters, body: unknown): Promise<T[]> {
    const response = await fetch(this.buildUrl(table, filters), {
      method: "PATCH",
      headers: this.headers(token, true),
      body: JSON.stringify(body),
    });

    return this.parse<T[]>(response, () => this.updateFallback(table, filters, body) as T[]);
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

  private async parse<T>(response: Response, fallback: () => T): Promise<T> {
    if (!response.ok) {
      const message = await response.text();
      if (this.isMissingSchema(message, response.status)) {
        return fallback();
      }
      throw new InternalServerErrorException(message || `Supabase request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private selectFallback(table: string, filters: Filters): DbRow[] {
    return this.table(table).filter((row) =>
      Object.entries(filters).every(([key, value]) => value === null || value === undefined || String(row[key]) === String(value)),
    );
  }

  private insertFallback(table: string, body: unknown): DbRow[] {
    const rows = this.normalizeRows(body).map((row) => this.withDefaults(row));
    this.table(table).push(...rows);
    return rows;
  }

  private upsertFallback(table: string, body: unknown, onConflict: string): DbRow[] {
    const rows = this.normalizeRows(body).map((row) => this.withDefaults(row));
    const tableRows = this.table(table);

    return rows.map((row) => {
      const index = tableRows.findIndex((existing) => String(existing[onConflict]) === String(row[onConflict]));
      if (index >= 0) {
        tableRows[index] = { ...tableRows[index], ...row, updated_at: new Date().toISOString() };
        return tableRows[index];
      }

      tableRows.push(row);
      return row;
    });
  }

  private updateFallback(table: string, filters: Filters, body: unknown): DbRow[] {
    const patch = this.normalizeRows(body)[0] ?? {};
    const tableRows = this.table(table);
    const updated: DbRow[] = [];

    for (const [index, row] of tableRows.entries()) {
      const matches = Object.entries(filters).every(([key, value]) => value === null || value === undefined || String(row[key]) === String(value));
      if (matches) {
        tableRows[index] = { ...row, ...patch, updated_at: new Date().toISOString() };
        updated.push(tableRows[index]);
      }
    }

    return updated;
  }

  private normalizeRows(body: unknown): DbRow[] {
    if (Array.isArray(body)) {
      return body.filter((row): row is DbRow => Boolean(row) && typeof row === "object").map((row) => ({ ...row }));
    }

    if (body && typeof body === "object") {
      return [{ ...(body as DbRow) }];
    }

    return [];
  }

  private withDefaults(row: DbRow): DbRow {
    const now = new Date().toISOString();
    return {
      id: row.id ?? randomUUID(),
      created_at: row.created_at ?? now,
      ...row,
    };
  }

  private table(name: string): DbRow[] {
    const rows = fallbackTables.get(name);
    if (rows) {
      return rows;
    }

    const nextRows: DbRow[] = [];
    fallbackTables.set(name, nextRows);
    return nextRows;
  }

  private isMissingSchema(message: string, status: number): boolean {
    return status === 404 || message.includes("PGRST205") || message.includes("Could not find the table");
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
