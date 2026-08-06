import { resolve } from "node:path";
import { loadConfig, loadWorkspaceEnvironment, type FactoryConfig } from "@factory/config";

const workspaceRoot = resolve(process.cwd(), "../..");
loadWorkspaceEnvironment(workspaceRoot);

export const dashboardConfig: FactoryConfig = loadConfig(process.env);
export { workspaceRoot };
