import { describe, expect, it } from "vitest";
import { canReuseActivePublication } from "../src/server/publication-toggle";

describe("publication toggle", () => {
  it("reuses the ready publication when the draft has not changed", () => {
    expect(
      canReuseActivePublication({
        activeStatus: "ready",
        activeDraftRevision: 4n,
        websiteDraftRevision: 4n,
      }),
    ).toBe(true);
  });

  it("queues a new publication after the draft changes", () => {
    expect(
      canReuseActivePublication({
        activeStatus: "ready",
        activeDraftRevision: 4n,
        websiteDraftRevision: 5n,
      }),
    ).toBe(false);
  });
});
