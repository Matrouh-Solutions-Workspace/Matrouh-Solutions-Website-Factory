import { notFound } from "next/navigation";
import { loadClientAccount } from "@/server/control-data";

export const dynamic = "force-dynamic";

export default async function ClientAccountPage() {
  const { clients, actor, organization } = await loadClientAccount();
  if (clients.length === 0) notFound();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Client dashboard</p>
          <h1>Welcome, {actor.displayName}</h1>
          <p className="sub">
            Your websites and subscription information with {organization.name}.
          </p>
        </div>
      </header>
      {clients.map((client) => (
        <section className="panel" key={client.id}>
          <div className="panelHead">
            <div>
              <p className="eyebrow">Account</p>
              <h2>{client.name}</h2>
            </div>
            <span>{client.websites.length} websites</span>
          </div>
          <div className="tableList">
            {client.websites.map((website) => (
              <article className="dataRow" key={website.id}>
                <div>
                  <strong>{website.name}</strong>
                  <p>{website.domains[0]?.hostnameNormalized ?? "Domain pending"}</p>
                </div>
                <div>
                  <strong>{planLabel(website.subscription?.cadence)}</strong>
                  <p>
                    {website.subscription
                      ? `Expires ${website.subscription.expiresAt.toLocaleDateString()}`
                      : "Contact support for billing"}
                  </p>
                </div>
                <div>
                  <strong>Website: {website.status}</strong>
                  <p>Plan: {website.subscription?.status ?? "not configured"}</p>
                </div>
              </article>
            ))}
          </div>
          {client.websites.length === 0 && (
            <div className="emptyState">
              <strong>No websites assigned</strong>
              <p>Contact support if you expected a website here.</p>
            </div>
          )}
        </section>
      ))}
    </>
  );
}

function planLabel(cadence: "trial" | "monthly" | "yearly" | undefined): string {
  if (cadence === "trial") return "Trial";
  if (cadence === "monthly") return "Monthly plan";
  if (cadence === "yearly") return "Yearly plan";
  return "No active plan";
}
