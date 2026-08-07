export const WORKER_HEARTBEAT_FRESHNESS_MS = 45_000;

export type WorkerState = "online" | "starting" | "stopping" | "unhealthy" | "offline";

export interface WorkerStatus {
  readonly state: WorkerState;
  readonly reportedStatus: string | null;
  readonly heartbeatAt: Date | null;
}

export function workerStatusFromHeartbeat(
  heartbeat: { readonly status: string; readonly heartbeatAt: Date } | null,
  now = new Date(),
): WorkerStatus {
  if (!heartbeat) return { state: "offline", reportedStatus: null, heartbeatAt: null };

  const fresh = now.getTime() - heartbeat.heartbeatAt.getTime() <= WORKER_HEARTBEAT_FRESHNESS_MS;
  if (!fresh) {
    return {
      state: "offline",
      reportedStatus: heartbeat.status,
      heartbeatAt: heartbeat.heartbeatAt,
    };
  }

  const state =
    heartbeat.status === "ready"
      ? "online"
      : heartbeat.status === "starting"
        ? "starting"
        : heartbeat.status === "stopping"
          ? "stopping"
          : "unhealthy";
  return { state, reportedStatus: heartbeat.status, heartbeatAt: heartbeat.heartbeatAt };
}
