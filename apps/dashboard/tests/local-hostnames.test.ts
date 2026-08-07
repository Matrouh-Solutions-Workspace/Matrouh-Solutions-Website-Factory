import { describe, expect, it } from "vitest";
import { isHostnameConflict, localHostname } from "../src/server/local-hostnames";

describe("local hostnames", () => {
  it("uses the requested slug without a generated suffix", () => {
    expect(localHostname("North Coast Clinic")).toBe("north-coast-clinic.localhost");
    expect(localHostname("north-coast-clinic.localhost")).toBe(
      "north-coast-clinic.localhost",
    );
  });

  it("rejects input that cannot form a hostname", () => {
    expect(localHostname("!!!")).toBeNull();
    expect(localHostname("---")).toBeNull();
  });

  it("recognizes a database hostname uniqueness conflict", () => {
    expect(
      isHostnameConflict({
        code: "P2002",
        meta: { constraint: "domains_hostname_active_key" },
      }),
    ).toBe(true);
    expect(isHostnameConflict({ code: "P2003", meta: { constraint: "hostname" } })).toBe(false);
  });
});
