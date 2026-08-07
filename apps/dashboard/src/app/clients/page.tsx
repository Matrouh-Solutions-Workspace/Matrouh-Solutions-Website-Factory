import { loadClients } from "@/server/control-data";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const clients = await loadClients(query);
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Accounts</p>
          <h1>Clients</h1>
          <p className="sub">Client records are created by registered account owners.</p>
        </div>
      </header>
      <section className="workspaceGrid">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>Client accounts</h2>
            </div>
            <span>{clients.length} active</span>
          </div>
          <form className="websiteToolbar" method="get">
            <label>
              <span className="srOnly">Search clients</span>
              <input
                defaultValue={query}
                name="q"
                placeholder="Search name, email, phone, or domain"
                type="search"
              />
            </label>
            <button className="secondaryButton" type="submit">
              Search
            </button>
            {query && (
              <a className="textLink" href="/clients">
                Clear
              </a>
            )}
          </form>
          <div className="tableList">
            {clients.map((client) => (
              <article className="dataRow" key={client.id}>
                <div className="avatar">{initials(client.name)}</div>
                <div>
                  <strong>{client.name}</strong>
                  <p>{client.contactName || "No contact name"}</p>
                </div>
                <div>
                  <strong>
                    {client.contactEmail || client.contactPhone || "No contact details"}
                  </strong>
                  <p>
                    {client._count.websites} managed website
                    {client._count.websites === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="status active">Account client</span>
              </article>
            ))}
          </div>
          {clients.length === 0 && (
            <div className="emptyState">
              <strong>No client accounts yet</strong>
              <p>Clients appear after an account claims a website.</p>
            </div>
          )}
        </div>
        <section className="panel createPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Account ownership</p>
              <h2>Clients come from accounts</h2>
            </div>
          </div>
          <p className="formNotice">
            Create an ownerless website and send its claim link. After the recipient registers or
            signs in and claims it, their account appears here automatically.
          </p>
          <a className="buttonLink" href="/websites#create-website">
            Create ownerless website
          </a>
        </section>
      </section>
    </>
  );
}

function initials(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
