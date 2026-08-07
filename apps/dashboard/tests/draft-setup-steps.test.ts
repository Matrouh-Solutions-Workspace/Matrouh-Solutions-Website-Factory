import { describe, expect, it } from "vitest";
import { draftSetupStep } from "../src/app/draft-setup-steps";

describe("draft setup steps", () => {
  it("accepts known steps and defaults unknown values to identity", () => {
    expect(draftSetupStep("content")).toBe("content");
    expect(draftSetupStep("review")).toBe("review");
    expect(draftSetupStep("unknown")).toBe("identity");
    expect(draftSetupStep(undefined)).toBe("identity");
  });
});
