export type PluginId = string & { readonly __brand: "PluginId" };
export interface PluginManifest {
  id: PluginId;
  version: string;
  sdkVersion: string;
  minimumFactoryVersion: string;
  capabilities: readonly string[];
  subscriptions: readonly { eventType: string; eventVersion: number }[];
}
export interface PluginContext {
  organizationId: string;
  websiteId?: string;
  correlationId: string;
}
export interface Plugin {
  manifest: PluginManifest;
  handle(event: Readonly<Record<string, unknown>>, context: PluginContext): Promise<void>;
}
