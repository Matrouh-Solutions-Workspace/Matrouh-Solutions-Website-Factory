import { describe, expect, it } from "vitest";
import { heartbeatProcessId, localWorkerLaunchSpec } from "../src/server/worker-control";

describe("worker control", () => {
  it("launches the worker directly through the workspace tsx runtime", () => {
    const spec = localWorkerLaunchSpec("C:\\factory", "C:\\node.exe");
    expect(spec.command).toBe("C:\\node.exe");
    expect(spec.args.slice(0, 2)).toEqual(["--import", "tsx"]);
    expect(spec.args[2]).toMatch(/apps[\\/]worker[\\/]src[\\/]main\.ts$/);
    expect(spec.cwd).toMatch(/apps[\\/]worker$/);
  });

  it("accepts only a valid PID from heartbeat metadata", () => {
    expect(heartbeatProcessId({ pid: 1234 })).toBe(1234);
    expect(heartbeatProcessId({ pid: "1234" })).toBeNull();
    expect(heartbeatProcessId({ pid: -1 })).toBeNull();
    expect(heartbeatProcessId(null)).toBeNull();
  });
});
