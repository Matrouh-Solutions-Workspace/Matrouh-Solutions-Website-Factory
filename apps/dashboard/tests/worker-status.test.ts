import { describe, expect, it } from "vitest";
import {
  WORKER_HEARTBEAT_FRESHNESS_MS,
  workerStatusFromHeartbeat,
} from "../src/server/worker-status";

const now = new Date("2026-08-07T04:30:00.000Z");

describe("worker status", () => {
  it("reports a ready worker with a fresh heartbeat as online", () => {
    expect(
      workerStatusFromHeartbeat(
        { status: "ready", heartbeatAt: new Date(now.getTime() - 10_000) },
        now,
      ).state,
    ).toBe("online");
  });

  it("reports a stale heartbeat as offline", () => {
    const status = workerStatusFromHeartbeat(
      {
        status: "ready",
        heartbeatAt: new Date(now.getTime() - WORKER_HEARTBEAT_FRESHNESS_MS - 1),
      },
      now,
    );
    expect(status.state).toBe("offline");
    expect(status.reportedStatus).toBe("ready");
  });

  it("distinguishes starting, stopping, unhealthy, and missing workers", () => {
    expect(workerStatusFromHeartbeat({ status: "stopping", heartbeatAt: now }, now).state).toBe(
      "stopping",
    );
    expect(workerStatusFromHeartbeat({ status: "starting", heartbeatAt: now }, now).state).toBe(
      "starting",
    );
    expect(workerStatusFromHeartbeat({ status: "error", heartbeatAt: now }, now).state).toBe(
      "unhealthy",
    );
    expect(workerStatusFromHeartbeat(null, now)).toEqual({
      state: "offline",
      reportedStatus: null,
      heartbeatAt: null,
    });
  });
});
