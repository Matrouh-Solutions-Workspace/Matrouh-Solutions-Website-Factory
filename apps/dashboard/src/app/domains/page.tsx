import { domainChallengeHash, domainOwnershipChallenge } from "@factory/domains";
import {
  createDomainAction,
  createHostingDomainAction,
  releaseDomainAction,
  setDefaultHostingDomainAction,
  rotateDomainChallengeAction,
  verifyDomainAction,
} from "@/app/actions";
import { ConfirmSubmit } from "@/app/confirm-submit";
import { Icon } from "@/app/icons";
import { PendingSubmit } from "@/app/pending-submit";
import { loadDomainsWorkspace } from "@/server/control-data";
import { dashboardConfig } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const { domains, websites, hostingDomains } = await loadDomainsWorkspace();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Delivery</p>
          <h1>Domains</h1>
          <p className="sub">Route each hostname to exactly one published website.</p>
        </div>
        <a className="buttonLink" href="#connect-domain">
          Connect domain
        </a>
      </header>
      <section className="stats compactStats">
        <article>
          <p>Active</p>
          <strong>{domains.filter((item) => item.status === "active").length}</strong>
          <small>Serving traffic</small>
        </article>
        <article>
          <p>Pending</p>
          <strong>{domains.filter((item) => item.status !== "active").length}</strong>
          <small>Awaiting connection</small>
        </article>
        <article>
          <p>Local</p>
          <strong>{domains.filter((item) => item.kind === "subdomain").length}</strong>
          <small>Development hostnames</small>
        </article>
      </section>
      <section className="workspaceGrid">
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Platform hosting</p>
              <h2>Website base domains</h2>
            </div>
          </div>
          {hostingDomains.map((domain) => (
            <article className="dataRow" key={domain.id}>
              <div>
                <strong>{domain.hostnameDisplay}</strong>
                <p>
                  {domain.hostedWebsiteCount} hosted website
                  {domain.hostedWebsiteCount === 1 ? "" : "s"}
                </p>
              </div>
              {domain.isDefault ? (
                <span className="mutedBadge">Default</span>
              ) : (
                <form action={setDefaultHostingDomainAction}>
                  <input name="domainId" type="hidden" value={domain.id} />
                  <button className="inlineButton" type="submit">
                    Make default
                  </button>
                </form>
              )}
            </article>
          ))}
          <form action={createHostingDomainAction} className="inlineForm">
            <label>
              Base domain
              <input name="hostname" placeholder="clients.example.com" required maxLength={253} />
            </label>
            <PendingSubmit pendingLabel="Adding…">Add hosting domain</PendingSubmit>
          </form>
        </div>
        <div className="panel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Routing table</p>
              <h2>Hostnames</h2>
            </div>
            <span>{domains.length} mappings</span>
          </div>
          {domains.map((domain) => (
            <article className="dataRow domainRow" key={domain.id}>
              <div className="templateIcon">
                <Icon name="domains" />
              </div>
              <div>
                {domain.status === "active" ? (
                  <a
                    className="domainLink"
                    href={domainUrl(domain.hostnameDisplay)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {domain.hostnameDisplay}
                  </a>
                ) : (
                  <strong>{domain.hostnameDisplay}</strong>
                )}
                <p>{domain.website.name}</p>
                {domain.kind === "custom" && domain.status !== "active" && (
                  <div className="domainChallenge">
                    <span>Add this DNS TXT record</span>
                    <code>_factory-verification.{domain.hostnameNormalized}</code>
                    <code>{displayedChallenge(domain)}</code>
                    <small>
                      {domain.verificationAttempts[0]?.failureCode === "DNS_TXT_NOT_FOUND"
                        ? "Record not visible yet. DNS propagation can take time."
                        : domain.status === "connecting"
                          ? "Ownership verified. Certificate provisioning is in progress."
                          : "Verification runs automatically after the record becomes visible."}
                    </small>
                  </div>
                )}
              </div>
              <span className="mutedBadge">{domain.kind}</span>
              <span className={`jobStatus ${domain.status === "active" ? "succeeded" : "queued"}`}>
                {domain.status}
              </span>
              <div className="rowActions">
                {domain.kind === "custom" && domain.status !== "active" && (
                  <>
                    <form action={verifyDomainAction}>
                      <input name="domainId" type="hidden" value={domain.id} />
                      <PendingSubmit className="inlineButton" pendingLabel="Checking…">
                        Check now
                      </PendingSubmit>
                    </form>
                    <form action={rotateDomainChallengeAction}>
                      <input name="domainId" type="hidden" value={domain.id} />
                      <ConfirmSubmit
                        className="inlineButton"
                        confirmation="Rotate this DNS challenge? The current TXT value will stop working."
                        pendingLabel="Rotating…"
                      >
                        Rotate
                      </ConfirmSubmit>
                    </form>
                  </>
                )}
                <form action={releaseDomainAction}>
                  <input name="domainId" type="hidden" value={domain.id} />
                  <ConfirmSubmit
                    className="inlineButton dangerButton"
                    confirmation={`Disconnect ${domain.hostnameDisplay}? Traffic will stop immediately and the hostname will be released after provider cleanup.`}
                    pendingLabel="Disconnecting…"
                  >
                    Disconnect
                  </ConfirmSubmit>
                </form>
              </div>
            </article>
          ))}
          {domains.length === 0 && (
            <div className="emptyState">
              <strong>No domains connected</strong>
              <p>Create a local hostname for one of your websites.</p>
            </div>
          )}
        </div>
        <form action={createDomainAction} className="panel createPanel" id="connect-domain">
          <div className="panelHead">
            <div>
              <p className="eyebrow">New mapping</p>
              <h2>Connect domain</h2>
            </div>
          </div>
          <label>
            Website
            <select name="websiteId" required>
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hostname
            <span className="fieldHint">
              Enter a short name for .localhost, or a complete custom hostname.
            </span>
            <input name="hostname" placeholder="my-clinic" required maxLength={253} />
          </label>
          <p className="formNotice">
            Local hostnames activate immediately. Custom domains receive a DNS ownership challenge
            and activate only after verification and certificate provisioning.
          </p>
          <PendingSubmit pendingLabel="Connecting…">Connect domain</PendingSubmit>
        </form>
      </section>
    </>
  );
}

function domainUrl(hostname: string): string {
  return hostname.endsWith(".localhost") ? `http://${hostname}:3000` : `https://${hostname}`;
}

function displayedChallenge(domain: {
  id: string;
  verificationAttempts: readonly { id: string; challengeValueHash: string }[];
}): string {
  const secret =
    dashboardConfig.FACTORY_DOMAIN_CHALLENGE_SECRET ?? dashboardConfig.PREVIEW_SIGNING_SECRET;
  const attempt = domain.verificationAttempts[0];
  if (!attempt) return "Challenge unavailable";
  const current = domainOwnershipChallenge(attempt.id, secret);
  return domainChallengeHash(current) === attempt.challengeValueHash
    ? current
    : domainOwnershipChallenge(domain.id, secret);
}
