import { describe, expect, it } from "vitest";
import { incrementRevision, newestRevision, serializeWebsiteSave } from "./draft-save-coordinator";

describe("draft save coordination", () => {
  it("serializes saves for the same website", async () => {
    const events: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = serializeWebsiteSave("website-a", async () => {
      events.push("first:start");
      await firstGate;
      events.push("first:end");
    });
    const second = serializeWebsiteSave("website-a", () => {
      events.push("second:start");
      events.push("second:end");
      return Promise.resolve();
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(["first:start"]);
    releaseFirst?.();
    await Promise.all([first, second]);
    expect(events).toEqual(["first:start", "first:end", "second:start", "second:end"]);
  });

  it("keeps the newest valid revision", () => {
    expect(newestRevision("8", "11")).toBe("11");
    expect(newestRevision("14", "9")).toBe("14");
    expect(newestRevision(null, "3")).toBe("3");
  });

  it("continues the queue after a failed save", async () => {
    const failed = serializeWebsiteSave("website-b", () => Promise.reject(new Error("failed")));
    const recovered = serializeWebsiteSave("website-b", () => Promise.resolve("saved"));

    await expect(failed).rejects.toThrow("failed");
    await expect(recovered).resolves.toBe("saved");
  });

  it("increments only valid positive revisions", () => {
    expect(incrementRevision("41")).toBe("42");
    expect(incrementRevision("0")).toBeNull();
    expect(incrementRevision("invalid")).toBeNull();
  });
});
