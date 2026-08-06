import { createClientAction } from "@/app/actions";
import { PendingSubmit } from "@/app/pending-submit";
import { loadClients } from "@/server/control-data";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await loadClients();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Accounts</p>
          <h1>Clients</h1>
          <p className="sub">Keep contacts and their managed websites together.</p>
        </div>
        <a className="buttonLink" href="#new-client">
          Add client
        </a>
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
                <span className="status">active</span>
              </article>
            ))}
          </div>
          {clients.length === 0 && (
            <div className="emptyState">
              <strong>No clients yet</strong>
              <p>Add the first account using the form.</p>
            </div>
          )}
        </div>
        <form action={createClientAction} className="panel createPanel" id="new-client">
          <div className="panelHead">
            <div>
              <p className="eyebrow">New account</p>
              <h2>Add a client</h2>
            </div>
          </div>
          <label>
            Client or company name
            <input name="name" required maxLength={200} />
          </label>
          <label>
            Primary contact
            <input name="contactName" maxLength={200} />
          </label>
          <div className="formSplit">
            <label>
              Email
              <input name="contactEmail" type="email" maxLength={320} />
            </label>
            <label>
              Phone
              <input name="contactPhone" type="tel" maxLength={50} />
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" rows={4} maxLength={4000} />
          </label>
          <PendingSubmit pendingLabel="Adding client…">Add client</PendingSubmit>
        </form>
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
