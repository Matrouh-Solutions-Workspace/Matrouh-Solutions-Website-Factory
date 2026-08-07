import { describe, expect, it } from "vitest";
import { subscriptionExpiredMessage, subscriptionNotice } from "../src/subscription-lifecycle";

const hours = (value: number) => value * 3_600_000;

describe("subscription expiry notices", () => {
  it("sends trial notices at 24 hours and 3 hours only", () => {
    expect(subscriptionNotice("trial", hours(48))).toBeNull();
    expect(subscriptionNotice("trial", hours(24))?.key).toBe("24h");
    expect(subscriptionNotice("trial", hours(3))?.key).toBe("3h");
  });

  it("sends monthly notices at 3 days and 24 hours", () => {
    expect(subscriptionNotice("monthly", hours(96))).toBeNull();
    expect(subscriptionNotice("monthly", hours(72))?.key).toBe("3d");
    expect(subscriptionNotice("monthly", hours(24))?.key).toBe("24h");
  });

  it("sends yearly notices at one month, 3 days, and 24 hours", () => {
    expect(subscriptionNotice("yearly", hours(24 * 31))).toBeNull();
    expect(subscriptionNotice("yearly", hours(24 * 30))?.key).toBe("30d");
    expect(subscriptionNotice("yearly", hours(72))?.key).toBe("3d");
    expect(subscriptionNotice("yearly", hours(24))?.key).toBe("24h");
  });

  it("does not send reminders after expiry", () => {
    expect(subscriptionNotice("monthly", 0)).toBeNull();
    expect(subscriptionNotice("yearly", -1)).toBeNull();
  });

  it.each(["trial", "monthly", "yearly"] as const)(
    "creates a deduplicated expiration email for the %s plan",
    (cadence) => {
      const message = subscriptionExpiredMessage({
        cadence,
        expiresAt: new Date("2026-08-07T00:00:00.000Z"),
        recipientEmail: " OWNER@Example.com ",
        websiteName: "North Coast Clinic",
      });

      expect(message).toMatchObject({
        recipientEmail: "owner@example.com",
        kind: "subscription.expired.1786060800000",
        subject: "North Coast Clinic subscription has expired",
      });
      expect(message?.bodyText).toContain("has expired");
    },
  );

  it("does not create expiration mail work when the website has no email", () => {
    expect(
      subscriptionExpiredMessage({
        cadence: "monthly",
        expiresAt: new Date("2026-08-07T00:00:00.000Z"),
        recipientEmail: null,
        websiteName: "North Coast Clinic",
      }),
    ).toBeNull();
    expect(
      subscriptionExpiredMessage({
        cadence: "yearly",
        expiresAt: new Date("2026-08-07T00:00:00.000Z"),
        recipientEmail: "   ",
        websiteName: "North Coast Clinic",
      }),
    ).toBeNull();
  });
});
