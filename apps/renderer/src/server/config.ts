import { resolve } from "node:path";
import { loadConfig, loadWorkspaceEnvironment, type FactoryConfig } from "@factory/config";

export const workspaceRoot = resolve(process.cwd(), "../..");
loadWorkspaceEnvironment(workspaceRoot);

export const rendererConfig: FactoryConfig = loadConfig(process.env);
