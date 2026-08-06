import { updateSeoDraftAction } from "@/app/actions";
import { PendingSubmit } from "@/app/pending-submit";
import { loadSeoWorkspace } from "@/server/control-data";

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const websites = await loadSeoWorkspace();
  const pages = websites.flatMap((website) => website.pages.map((page) => ({ website, page })));
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Discovery</p>
          <h1>Search & social</h1>
          <p className="sub">Control page titles, descriptions, keywords, and crawling policy.</p>
        </div>
      </header>
      <section className="stats compactStats">
        <article>
          <p>Websites</p>
          <strong>{websites.length}</strong>
          <small>Current tenant</small>
        </article>
        <article>
          <p>Pages</p>
          <strong>{pages.length}</strong>
          <small>Indexable routes</small>
        </article>
        <article>
          <p>Customized</p>
          <strong>{pages.filter(({ page }) => page.seoDrafts.length > 0).length}</strong>
          <small>Explicit SEO drafts</small>
        </article>
      </section>
      <section className="editorStack followPanel">
        {pages.map(({ website, page }) => {
          const current = asSeo(page.seoDrafts[0]?.metadataJson);
          return (
            <form action={updateSeoDraftAction} className="panel seoEditor" key={page.id}>
              <input name="websiteId" type="hidden" value={website.id} />
              <input name="pageId" type="hidden" value={page.id} />
              <input
                name="websiteDraftRevision"
                type="hidden"
                value={website.draftRevision.toString()}
              />
              <div className="panelHead">
                <div>
                  <p className="eyebrow">
                    {website.name} · {page.locale}
                  </p>
                  <h2>{page.title}</h2>
                </div>
                <span>{page.slug === "/" ? "Homepage" : `/${page.slug}`}</span>
              </div>
              <div className="seoGrid">
                <div className="editFormFields">
                  <label>
                    Search title
                    <input defaultValue={current.title} maxLength={200} name="title" />
                  </label>
                  <label>
                    Description
                    <textarea
                      defaultValue={current.description}
                      maxLength={500}
                      name="description"
                      rows={4}
                    />
                  </label>
                  <label>
                    Keywords<span className="fieldHint">Comma-separated, up to 30</span>
                    <input defaultValue={current.keywords.join(", ")} name="keywords" />
                  </label>
                  <div className="checkRow">
                    <label>
                      <input defaultChecked={current.index} name="index" type="checkbox" /> Allow
                      indexing
                    </label>
                    <label>
                      <input defaultChecked={current.follow} name="follow" type="checkbox" /> Follow
                      links
                    </label>
                  </div>
                  <PendingSubmit pendingLabel="Saving SEO…">Save SEO</PendingSubmit>
                </div>
                <div className="searchPreview">
                  <small>Search preview</small>
                  <strong>{current.title || page.title}</strong>
                  <span>https://example.com/{page.slug === "/" ? "" : page.slug}</span>
                  <p>{current.description || `${website.name} — ${page.title}`}</p>
                </div>
              </div>
            </form>
          );
        })}
        {pages.length === 0 && (
          <div className="panel emptyState">
            <strong>No editable pages</strong>
            <p>Create a website before configuring SEO.</p>
          </div>
        )}
      </section>
    </>
  );
}

function asSeo(value: unknown) {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const robots =
    record.robots && typeof record.robots === "object" && !Array.isArray(record.robots)
      ? (record.robots as Record<string, unknown>)
      : {};
  return {
    title: typeof record.title === "string" ? record.title : "",
    description: typeof record.description === "string" ? record.description : "",
    keywords: Array.isArray(record.keywords)
      ? record.keywords.filter((item): item is string => typeof item === "string")
      : [],
    index: typeof robots.index === "boolean" ? robots.index : true,
    follow: typeof robots.follow === "boolean" ? robots.follow : true,
  };
}
