import { describe, expect, it } from "vitest";
import { directPostgresUrl } from "./index";

describe("directPostgresUrl", () => {
  it("keeps an ordinary PostgreSQL URL unchanged", () => {
    const url = "postgresql://factory:factory@localhost:5432/factory";
    expect(directPostgresUrl(url)).toBe(url);
  });

  it("extracts the direct URL supplied by local Prisma Dev", () => {
    const direct = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";
    const apiKey = Buffer.from(JSON.stringify({ databaseUrl: direct })).toString("base64url");
    expect(directPostgresUrl(`prisma+postgres://localhost:51213/?api_key=${apiKey}`)).toBe(direct);
  });

  it("rejects a proxy URL without an embedded direct connection", () => {
    expect(() => directPostgresUrl("prisma+postgres://localhost:51213/")).toThrow(
      "PRISMA_PG_REQUIRES_DIRECT_DATABASE_URL",
    );
  });
});
