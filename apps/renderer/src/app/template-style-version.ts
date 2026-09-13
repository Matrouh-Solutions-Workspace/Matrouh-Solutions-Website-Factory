/**
 * CSS is shipped by the renderer and can support a patch release line without
 * duplicating every template selector. The release version remains available
 * separately on the root element for debugging and telemetry.
 */
export function templateStyleVersion(templateId: string, version: string): string {
  if (templateId === "com.matrouh.creative" && version.startsWith("1.0.")) {
    return "1.0.0";
  }
  return version;
}
