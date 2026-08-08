import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PublicationSnapshot } from "@factory/publication-contract";
import { instantiateTemplateRuntime } from "@factory/template-runtime";
import { AppearanceToggle } from "@/app/appearance-toggle";
import { textDirection } from "@/server/locale-navigation";
import { loadPreviewSite } from "@/server/site";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface PreviewProperties {
  readonly params: Promise<{ readonly path?: string[] }>;
  readonly searchParams: Promise<{ readonly token?: string }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PreviewProperties): Promise<Metadata> {
  const site = await loadPreviewSite((await searchParams).token);
  if (!site) return { robots: { index: false, follow: false } };
  const { path = [] } = await params;
  try {
    const rendered = runtime(site).render(`/${path.join("/")}`);
    return {
      title: `Preview: ${rendered.title}`,
      icons: site.branding.faviconUrl ? { icon: site.branding.faviconUrl } : undefined,
      ...(rendered.description === undefined ? {} : { description: rendered.description }),
      robots: { index: false, follow: false, noarchive: true, noimageindex: true },
    };
  } catch {
    return { title: "Preview", robots: { index: false, follow: false } };
  }
}

export default async function PreviewPage({ params, searchParams }: PreviewProperties) {
  const site = await loadPreviewSite((await searchParams).token);
  if (!site) notFound();
  const { path = [] } = await params;
  let rendered;
  try {
    rendered = runtime(site).render(`/${path.join("/")}`);
  } catch {
    notFound();
  }
  const appearance = websiteSetting(site.snapshot, "colorMode") === "dark" ? "dark" : "light";
  const logoId = websiteSetting(site.snapshot, "logoMediaId");
  const logoUrl =
    typeof logoId === "string"
      ? site.snapshot.media.find((item) => item.id === logoId)?.url
      : undefined;
  return (
    <div
      className="siteRoot"
      data-color-scheme={appearance}
      data-template-artifact-id={site.snapshot.template.id}
      data-template-id={premiumTemplateId(
        site.snapshot.template.id,
        site.snapshot.template.version,
      )}
      data-template-version={site.snapshot.template.version}
      dir={textDirection(rendered.locale)}
      lang={rendered.locale}
      style={
        {
          "--background": site.snapshot.theme.colors.background,
          "--text": site.snapshot.theme.colors.text,
          "--primary": site.snapshot.theme.colors.primary,
        } as React.CSSProperties
      }
    >
      <aside className="previewBanner">Private preview · expires automatically</aside>
      <header className="siteHeader">
        <a className="siteBrand" href="/">
          <img
            alt=""
            className="siteBrandMark"
            src={logoUrl ?? site.branding.faviconUrl ?? "/matrouh-logo.png"}
          />
          <strong>{site.snapshot.website.name}</strong>
        </a>
        <AppearanceToggle
          initialAppearance={appearance}
          locale={rendered.locale}
          storageKey={`factory:appearance:preview:${site.organizationId}:${site.snapshot.website.name}`}
        />
      </header>
      <main>{rendered.node}</main>
    </div>
  );
}

function premiumTemplateId(templateId: string, version: string): string | undefined {
  const premiumVersions: Readonly<Record<string, string>> = {
    "com.matrouh.engineer": "2.0.0",
    "com.matrouh.doctor": "2.0.0",
    "com.matrouh.clinic": "2.0.0",
  };
  return premiumVersions[templateId] === version ? templateId : undefined;
}

function websiteSetting(snapshot: PublicationSnapshot, key: string): unknown {
  const settings = snapshot.website.settings;
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)[key]
    : undefined;
}

function runtime(site: NonNullable<Awaited<ReturnType<typeof loadPreviewSite>>>) {
  return instantiateTemplateRuntime(
    {
      definition: site.template,
      artifactHash: site.artifact.artifactHash,
      manifestHash: site.artifact.manifest.manifestHash,
    },
    site.snapshot,
  );
}
