/**
 * CSS is shipped by the renderer and can support a patch release line without
 * duplicating every template selector. The release version remains available
 * separately on the root element for debugging and telemetry.
 */
export function templateStyleVersion(templateId: string, version: string): string {
  if (templateId === "com.matrouh.clinic" && version === "2.0.1") {
    return "2.0.0";
  }
  if (templateId === "com.matrouh.doctor" && version === "2.2.0") {
    return "2.1.0";
  }
  if (templateId === "com.matrouh.engineer" && version === "2.0.2") {
    return "2.0.1";
  }
  if (templateId === "com.matrouh.creative" && version.startsWith("1.0.")) {
    return "1.0.0";
  }
  return version;
}
