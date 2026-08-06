import { resolve } from "node:path";
import { loadConfig, loadWorkspaceEnvironment, type FactoryConfig } from "@factory/config";

export const workspaceRoot = resolve(process.cwd(), "../..");
loadWorkspaceEnvironment(workspaceRoot);

export const workerConfig: FactoryConfig = loadConfig(process.env);
