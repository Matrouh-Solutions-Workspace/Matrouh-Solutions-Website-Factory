import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadConfig, loadWorkspaceEnvironment, type FactoryConfig } from "@factory/config";

/**
 * Next can be launched either from `apps/renderer` or from the repository root
 * through Turborepo. Resolve the workspace from both locations so local template
 * artifacts always come from this checkout.
 */
function resolveWorkspaceRoot(): string {
  const candidates = [process.cwd(), resolve(process.cwd(), "../..")];
  return (
    candidates.find((candidate) => existsSync(join(candidate, "pnpm-workspace.yaml"))) ??
    process.cwd()
  );
}

export const workspaceRoot = resolveWorkspaceRoot();
loadWorkspaceEnvironment(workspaceRoot);

export const rendererConfig: FactoryConfig = loadConfig(process.env);
