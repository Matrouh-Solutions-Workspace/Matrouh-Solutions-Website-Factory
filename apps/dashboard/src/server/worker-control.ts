import { closeSync, openSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

export interface WorkerLaunchSpec {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

export function localWorkerLaunchSpec(
  workspaceRoot: string,
  nodeExecutable = process.execPath,
): WorkerLaunchSpec {
  const workerDirectory = resolve(workspaceRoot, "apps", "worker");
  return {
    command: nodeExecutable,
    args: ["--import", "tsx", resolve(workerDirectory, "src", "main.ts")],
    cwd: workerDirectory,
  };
}

export async function startLocalWorker(workspaceRoot: string): Promise<number> {
  const spec = localWorkerLaunchSpec(workspaceRoot);
  const output = openSync(resolve(workspaceRoot, ".worker-restart.log"), "a");
  const errors = openSync(resolve(workspaceRoot, ".worker-restart-error.log"), "a");
  try {
    const child = spawn(spec.command, [...spec.args], {
      cwd: spec.cwd,
      detached: true,
      env: process.env,
      stdio: ["ignore", output, errors],
      windowsHide: true,
    });
    await new Promise<void>((resolveStarted, rejectStarted) => {
      child.once("spawn", resolveStarted);
      child.once("error", rejectStarted);
    });
    child.unref();
    if (!child.pid) throw new Error("WORKER_START_FAILED");
    return child.pid;
  } finally {
    closeSync(output);
    closeSync(errors);
  }
}

export function processIsRunning(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function heartbeatProcessId(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const pid = (metadata as Record<string, unknown>).pid;
  return typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0 ? pid : null;
}
