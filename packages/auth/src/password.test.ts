import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./index";

describe("password authentication", () => {
  it("hashes with a salt and verifies the original password", () => {
    const first = hashPassword("A-secure-password-2026");
    const second = hashPassword("A-secure-password-2026");
    expect(first).not.toBe(second);
    expect(verifyPassword("A-secure-password-2026", first)).toBe(true);
    expect(verifyPassword("wrong-password", first)).toBe(false);
  });

  it("rejects malformed hashes", () => {
    expect(verifyPassword("anything", "not-a-hash")).toBe(false);
  });
});
