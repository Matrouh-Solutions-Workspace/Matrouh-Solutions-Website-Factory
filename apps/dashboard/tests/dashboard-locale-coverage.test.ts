import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  dashboardArabicCopy,
  translateDashboardArabicText,
} from "../src/app/dashboard-locale-bridge";

const appRoot = resolve(process.cwd(), "src/app");
const ignoredLiteralText = new Set([
  "dist/index.js (ES module)",
  "generated/matrouh.template.manifest.json",
  "matrouh.template.json",
  "PDF",
  // Brand names are intentionally invariant across dashboard locales.
  "Matrouh",
  "Matrouh Solutions",
  // Domain names and email addresses are technical examples, not UI copy.
  "clients.example.com",
  "my-clinic",
  "name@example.com",
  "north-coast-clinic",
]);

async function tsxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return tsxFiles(path);
      return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
    }),
  );
  return nested.flat();
}

function visibleLiterals(source: string): string[] {
  return [...source.matchAll(/>([A-Za-z][^<{]{1,120})</g)]
    .map((match) => match[1].trim().replaceAll("&apos;", "'"))
    .filter((value) => value && !value.startsWith("{") && !ignoredLiteralText.has(value));
}

function accessibleAttributeLiterals(source: string): string[] {
  return [...source.matchAll(/(?:placeholder|aria-label|title)="([A-Za-z][^"]{1,120})"/g)]
    .map((match) => match[1].trim())
    .filter((value) => !ignoredLiteralText.has(value));
}

describe("dashboard Arabic copy coverage", () => {
  it("keeps Matrouh brand names invariant", () => {
    expect(dashboardArabicCopy.Matrouh).toBeUndefined();
    expect(dashboardArabicCopy["Matrouh Solutions"]).toBeUndefined();
  });

  it("translates generated draft-editor UI without changing website content", () => {
    expect(translateDashboardArabicText("Publish job: succeeded")).toBe("مهمة النشر: نجح");
    expect(translateDashboardArabicText("Publish job: ")).toBe("مهمة النشر: ");
    expect(translateDashboardArabicText("Attempt 1/5")).toBe("محاولة 1/5");
    expect(translateDashboardArabicText("Attempt ")).toBe("محاولة ");
    expect(translateDashboardArabicText("3 sections")).toBe("3 أقسام");
    expect(translateDashboardArabicText(" sections")).toBe(" أقسام");
    expect(translateDashboardArabicText("Item ")).toBe("العنصر ");
    expect(translateDashboardArabicText("Remove")).toBe("إزالة");
    expect(translateDashboardArabicText("| revision")).toBe("| مراجعة");
    expect(translateDashboardArabicText("Patient stories controls")).toBe(
      "عناصر التحكم في قصص المرضى",
    );
    expect(translateDashboardArabicText("Move item 2 down")).toBe("نقل العنصر 2 لأسفل");
    expect(translateDashboardArabicText("Matrouh Solutions")).toBe("Matrouh Solutions");
  });

  it("covers every static visible English dashboard label", async () => {
    const files = await tsxFiles(appRoot);
    const literals = (
      await Promise.all(
        files.map(async (file) => {
          const source = await readFile(file, "utf8");
          return [...visibleLiterals(source), ...accessibleAttributeLiterals(source)];
        }),
      )
    ).flat();
    const missing = [...new Set(literals)].filter((value) => !dashboardArabicCopy[value]).sort();

    expect(missing).toEqual([]);
  });

  it("renders localized navigation-node labels as one locale-aware value", async () => {
    const editorPage = await readFile(resolve(appRoot, "websites", "[id]", "page.tsx"), "utf8");

    expect(editorPage).toContain(
      "navigationNodeLabel(node.kind, navigationLocales.length, locale)",
    );
    expect(editorPage).toContain('page: "تسميات الصفحة"');
    expect(editorPage).toContain("labels[kind.toLowerCase()]");
    expect(editorPage).not.toContain("{node.kind} label{navigationLocales.length");
  });
});
