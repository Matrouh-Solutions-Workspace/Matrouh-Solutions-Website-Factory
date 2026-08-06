import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const { buildPortableManifest } = await import(
  pathToFileURL(join(scriptDirectory, "..", "..", "packages", "template-sdk", "dist", "index.js"))
    .href
);

const templateRoot = process.cwd();
const entry = join(templateRoot, "dist", "index.js");
const imported = await import(pathToFileURL(entry).href);
if (!imported.template) throw new Error("TEMPLATE_EXPORT_MISSING");
const outputDirectory = join(templateRoot, "generated");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  join(outputDirectory, "matrouh.template.manifest.json"),
  `${JSON.stringify(buildPortableManifest(imported.template), null, 2)}\n`,
  { flag: "w" },
);
