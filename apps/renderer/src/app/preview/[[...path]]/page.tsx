import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { instantiateTemplateRuntime } from "@factory/template-runtime";
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
  return (
    <div
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
          <img alt="" className="siteBrandMark" src="/matrouh-logo.png" />
          <strong>{site.snapshot.website.name}</strong>
        </a>
      </header>
      <main>{rendered.node}</main>
    </div>
  );
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
