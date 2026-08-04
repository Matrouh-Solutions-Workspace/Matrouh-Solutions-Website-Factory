import type { Plugin, PluginContext } from "@factory/plugin-sdk";
export async function deliverPluginEvent(
  plugin: Plugin,
  event: Readonly<Record<string, unknown>>,
  context: PluginContext,
  timeoutMs = 2000,
): Promise<void> {
  await Promise.race([
    plugin.handle(event, context),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("PLUGIN_TIMEOUT")), timeoutMs),
    ),
  ]);
}
