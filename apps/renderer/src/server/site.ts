import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";
import { parseSnapshot, type PublicationSnapshot } from "@factory/publication-contract";
import { discoverTemplates, loadTemplate } from "@factory/template-loader";
function artifactsRoot() {
  return process.env.FACTORY_ARTIFACT_DIRECTORY ?? join(process.cwd(), "..", "..", "artifacts");
}
export const loadSite = cache(
  async (
    hostname: string,
  ): Promise<{
    snapshot: PublicationSnapshot;
    template: Awaited<ReturnType<typeof loadTemplate>>;
  } | null> => {
    const normalized = hostname.toLowerCase().split(":")[0] ?? hostname;
    try {
      const mapping = JSON.parse(
        await readFile(join(artifactsRoot(), "domains.json"), "utf8"),
      ) as Record<string, string>;
      const publicationId = mapping[normalized];
      if (!publicationId) return null;
      const snapshot = parseSnapshot(
        JSON.parse(await readFile(join(artifactsRoot(), `${publicationId}.json`), "utf8")),
      );
      const candidates = await discoverTemplates(join(process.cwd(), "..", "..", "templates"));
      const candidate = candidates.find(
        (item) =>
          item.discovery.templateId === snapshot.template.id &&
          item.discovery.templateVersion === snapshot.template.version,
      );
      if (!candidate) return null;
      return { snapshot, template: await loadTemplate(candidate) };
    } catch {
      return null;
    }
  },
);
