import { updateOrganizationAction } from "@/app/actions";
import { PendingSubmit } from "@/app/pending-submit";
import { loadOrganizationSettings } from "@/server/control-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { organization, memberships, auditEvents, actor, roleKeys } =
    await loadOrganizationSettings();
  if (!organization) return null;
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Control panel</p>
          <h1>Organization settings</h1>
          <p className="sub">Identity, locale, plan, and access context.</p>
        </div>
      </header>
      <section className="workspaceGrid settingsWorkspace">
        <form action={updateOrganizationAction} className="panel createPanel">
          <div className="panelHead">
            <div>
              <p className="eyebrow">Organization</p>
              <h2>General details</h2>
            </div>
            <span>revision {organization.revision.toString()}</span>
          </div>
          <input name="expectedRevision" type="hidden" value={organization.revision.toString()} />
          <label>
            Organization name
            <input defaultValue={organization.name} maxLength={200} name="name" required />
          </label>
          <label>
            Default locale
            <span className="fieldHint">BCP 47 language tag, for example en or ar-EG.</span>
            <input
              defaultValue={organization.defaultLocale}
              maxLength={35}
              name="defaultLocale"
              required
            />
          </label>
          <label>
            Workspace slug
            <input defaultValue={organization.slug} disabled />
          </label>
          <PendingSubmit pendingLabel="Saving settings…">Save organization</PendingSubmit>
        </form>
        <div className="sideStack">
          <section className="panel">
            <div className="panelHead">
              <div>
                <p className="eyebrow">Workspace</p>
                <h2>Plan & status</h2>
              </div>
              <span className="status">{organization.status}</span>
            </div>
            <dl className="definitionList">
              <div>
                <dt>Plan</dt>
                <dd>{organization.planKey}</dd>
              </div>
              <div>
                <dt>Active members</dt>
                <dd>{memberships}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDate(organization.updatedAt)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <div className="panelHead">
              <div>
                <p className="eyebrow">Current session</p>
                <h2>{actor.displayName}</h2>
              </div>
            </div>
            <dl className="definitionList">
              <div>
                <dt>Email</dt>
                <dd>{actor.email}</dd>
              </div>
              <div>
                <dt>Roles</dt>
                <dd>{roleKeys.join(", ") || "member"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>
      <section className="panel followPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Governance</p>
            <h2>Audit trail</h2>
          </div>
          <a className="buttonLink secondaryButton" href="/api/organization/export">
            Export organization data
          </a>
        </div>
        {auditEvents.map((event) => (
          <div className="publicationRow" key={event.id}>
            <div>
              <strong>{event.action}</strong>
              <p>
                {event.resourceType} {event.resourceId ? `· ${event.resourceId}` : ""}
              </p>
            </div>
            <div className="publicationActions">
              <small>{event.actorType}</small>
              <time dateTime={event.occurredAt.toISOString()}>{formatDate(event.occurredAt)}</time>
            </div>
          </div>
        ))}
        {auditEvents.length === 0 && <p className="empty">No audit activity recorded yet.</p>}
      </section>
    </>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(value);
}
