import { saveWebsiteSubscriptionAction } from "@/app/actions";
import { PendingSubmit } from "@/app/pending-submit";
import { loadBillingWorkspace } from "@/server/control-data";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const { websites, clients } = await loadBillingWorkspace(query);
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Subscriptions</p>
          <h1>Billing</h1>
          <p className="sub">
            Set each client’s plan and expiry. Expired sites are disabled by the worker.
          </p>
        </div>
      </header>
      <section className="panel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Website billing</p>
            <h2>Subscriptions</h2>
          </div>
          <span>{websites.length} websites</span>
        </div>
        <form className="websiteToolbar" method="get">
          <label>
            <span className="srOnly">Search subscriptions</span>
            <input
              defaultValue={query}
              name="q"
              placeholder="Search client, website, or subdomain"
              type="search"
            />
          </label>
          <button className="secondaryButton" type="submit">
            Search
          </button>
          {query && (
            <a className="textLink" href="/billing">
              Clear
            </a>
          )}
        </form>
        <div className="tableList">
          {websites.map((website) => {
            const subscription = website.subscription;
            return (
              <form action={saveWebsiteSubscriptionAction} className="dataRow" key={website.id}>
                <input name="websiteId" type="hidden" value={website.id} />
                <div>
                  <strong>{website.name}</strong>
                  <p>
                    {website.domains[0]?.hostnameNormalized ?? "No domain"} · {website.status} ·{" "}
                    {subscription?.status ?? "no subscription"}
                  </p>
                </div>
                <label>
                  Client
                  <select defaultValue={website.clientId ?? ""} name="clientId">
                    <option value="">No client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Plan
                  <select defaultValue={subscription?.cadence ?? "monthly"} name="cadence">
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
                <label>
                  Expiry (UTC)
                  <input
                    defaultValue={subscription ? dateTimeValue(subscription.expiresAt) : ""}
                    name="expiresAt"
                    required
                    step="1"
                    type="datetime-local"
                  />
                </label>
                <PendingSubmit className="inlineButton" pendingLabel="Saving…">
                  Save
                </PendingSubmit>
              </form>
            );
          })}
        </div>
        {websites.length === 0 && (
          <div className="emptyState">
            <strong>No websites yet</strong>
            <p>Create a website before assigning billing.</p>
          </div>
        )}
      </section>
    </>
  );
}

function dateTimeValue(value: Date): string {
  return value.toISOString().slice(0, 19);
}
