import { describe, expect, it, vi } from "vitest";
import { createWorkerLogger } from "../src/logger";

describe("worker logger", () => {
  it("emits structured JSON with the worker service field", async () => {
    const write = vi.fn();
    const logger = createWorkerLogger({ write });
    logger.info({ event: "ready", workerId: "worker-1" }, "Worker ready");

    const entry = JSON.parse(String(write.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(entry).toMatchObject({ service: "worker", event: "ready", workerId: "worker-1" });
    expect(entry.level).toBeTypeOf("number");
  });
});
