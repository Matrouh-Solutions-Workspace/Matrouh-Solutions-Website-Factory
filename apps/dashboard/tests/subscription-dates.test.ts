import { describe, expect, it } from "vitest";
import { defaultSubscriptionExpiry } from "../src/server/subscription-dates";

describe("default subscription expiry", () => {
  const start = new Date("2026-08-07T12:30:00.000Z");

  it("uses 24 hours for a trial", () => {
    expect(defaultSubscriptionExpiry("trial", start).toISOString()).toBe(
      "2026-08-08T12:30:00.000Z",
    );
  });

  it("uses one calendar month for monthly billing", () => {
    expect(defaultSubscriptionExpiry("monthly", start).toISOString()).toBe(
      "2026-09-07T12:30:00.000Z",
    );
  });

  it("uses one calendar year for yearly billing", () => {
    expect(defaultSubscriptionExpiry("yearly", start).toISOString()).toBe(
      "2027-08-07T12:30:00.000Z",
    );
  });
});
