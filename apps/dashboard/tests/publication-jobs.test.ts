import { describe, expect, it } from "vitest";
import {
  canRetryPublicationJob,
  isActivePublicationJob,
} from "../src/server/publication-jobs";

describe("publication job controls", () => {
  it("blocks duplicate publishing while work is active", () => {
    expect(isActivePublicationJob("queued")).toBe(true);
    expect(isActivePublicationJob("running")).toBe(true);
    expect(isActivePublicationJob("retryable")).toBe(true);
    expect(isActivePublicationJob("succeeded")).toBe(false);
  });

  it("allows terminal failed jobs to be retried", () => {
    expect(canRetryPublicationJob("failed")).toBe(true);
    expect(canRetryPublicationJob("dead_letter")).toBe(true);
    expect(canRetryPublicationJob("queued")).toBe(false);
  });
});
