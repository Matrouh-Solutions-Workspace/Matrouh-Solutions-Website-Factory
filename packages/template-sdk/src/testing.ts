import type { JsonValue, TemplateDefinition, ThemeTokens } from "./index";

export interface TemplateContractFixture {
  readonly name: string;
  readonly kind: "minimal" | "complete" | "localized" | "invalid";
  readonly locale: string;
  readonly website: JsonValue;
  readonly theme: ThemeTokens;
  readonly pages: readonly {
    readonly pageTypeId: string;
    readonly title: string;
    readonly slug: string;
    readonly sections: readonly {
      readonly sectionTypeId: string;
      readonly content: JsonValue;
    }[];
  }[];
  readonly expectedDiagnosticCodes?: readonly string[];
}

export interface TemplateContractAdapterResult {
  readonly valid: boolean;
  readonly diagnosticCodes: readonly string[];
  readonly artifactHash?: string;
  readonly renderedHtml?: string;
}

export interface TemplateContractAdapter {
  evaluate(
    template: TemplateDefinition,
    fixture: TemplateContractFixture,
  ): Promise<TemplateContractAdapterResult>;
}

export function defineTemplateFixture<T extends TemplateContractFixture>(fixture: T): Readonly<T> {
  if (!fixture.name.trim() || !fixture.locale.trim() || fixture.pages.length < 1) {
    throw new Error("SDK_FIXTURE_INVALID");
  }
  assertJson(fixture.website);
  for (const page of fixture.pages) {
    if (!page.pageTypeId || !page.title || !page.slug.startsWith("/")) {
      throw new Error("SDK_FIXTURE_INVALID");
    }
    page.sections.forEach((section) => assertJson(section.content));
  }
  return Object.freeze(fixture);
}

export async function evaluateTemplateFixtures(
  adapter: TemplateContractAdapter,
  template: TemplateDefinition,
  fixtures: readonly TemplateContractFixture[],
): Promise<readonly TemplateContractAdapterResult[]> {
  const names = new Set<string>();
  for (const fixture of fixtures) {
    if (names.has(fixture.name)) throw new Error("SDK_FIXTURE_NAME_DUPLICATE");
    names.add(fixture.name);
  }
  return Promise.all(fixtures.map((fixture) => adapter.evaluate(template, fixture)));
}

function assertJson(value: unknown): asserts value is JsonValue {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error();
    JSON.parse(serialized);
  } catch {
    throw new Error("SDK_FIXTURE_JSON_INVALID");
  }
}
