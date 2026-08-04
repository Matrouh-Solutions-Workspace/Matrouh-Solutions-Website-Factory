import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { renderSnapshotPage } from "@factory/template-runtime";
import { loadSite } from "@/server/site";
export async function generateMetadata({ params }: { params: Promise<{ path?: string[] }> }) {
  const host = (await headers()).get("host") ?? "";
  const site = await loadSite(host);
  if (!site) return {};
  const { path = [] } = await params;
  try {
    const rendered = renderSnapshotPage(site.template, site.snapshot, `/${path.join("/")}`);
    return { title: rendered.title, description: rendered.description };
  } catch {
    return { title: site.snapshot.website.name };
  }
}
export default async function SitePage({ params }: { params: Promise<{ path?: string[] }> }) {
  const host = (await headers()).get("host") ?? "";
  const site = await loadSite(host);
  if (!site) notFound();
  const { path = [] } = await params;
  let rendered;
  try {
    rendered = renderSnapshotPage(site.template, site.snapshot, `/${path.join("/")}`);
  } catch {
    notFound();
  }
  const colors = site.snapshot.theme.colors;
  return (
    <div
      style={
        {
          "--background": colors.background,
          "--text": colors.text,
          "--primary": colors.primary,
        } as React.CSSProperties
      }
    >
      <header className="siteHeader">
        <strong>{site.snapshot.website.name}</strong>
        <nav>
          {site.snapshot.pages.map((page) => (
            <a href={page.slug === "/" ? "/" : `/${page.slug}`} key={page.id}>
              {page.title}
            </a>
          ))}
        </nav>
      </header>
      <main>{rendered.node}</main>
      <footer>
        © {new Date().getUTCFullYear()} {site.snapshot.website.name}
      </footer>
    </div>
  );
}
