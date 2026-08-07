import { describe, expect, it } from "vitest";
import { renewalResumeStatus } from "../src/server/subscriptions";

describe("subscription renewal", () => {
  it("restores a site that expiry automatically interrupted", () => {
    expect(renewalResumeStatus("published")).toBe("published");
    expect(renewalResumeStatus("draft")).toBe("draft");
    expect(renewalResumeStatus("unpublished")).toBe("unpublished");
  });

  it("preserves a deliberate staff disable", () => {
    expect(renewalResumeStatus("disabled")).toBe("disabled");
  });

  it("never restores an archived status", () => {
    expect(renewalResumeStatus("archived")).toBe("unpublished");
    expect(renewalResumeStatus(null)).toBe("unpublished");
  });
});
