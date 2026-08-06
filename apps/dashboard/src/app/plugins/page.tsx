import { requireDashboardContext } from "@/server/auth";
import { Icon } from "@/app/icons";

export const dynamic = "force-dynamic";

export default async function PluginsPage() {
  await requireDashboardContext();
  return (
    <>
      <header>
        <div>
          <p className="eyebrow">Extension boundary</p>
          <h1>Plugins</h1>
          <p className="sub">Capability-scoped integrations that react to platform events.</p>
        </div>
      </header>
      <section className="panel followPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">Deferred by architecture</p>
            <h2>Plugin pilot</h2>
          </div>
        </div>
        <div className="pluginHero">
          <span className="pluginMark">
            <Icon name="plugins" />
          </span>
          <div>
            <strong>Extensions are safely paused</strong>
            <p>
              The core contracts are ready, while installations stay unavailable until a Doctor or
              Clinic use case is approved.
            </p>
          </div>
          <span className="mutedBadge">Not enabled</span>
        </div>
        <div className="detailGrid">
          <article>
            <strong>Available now</strong>
            <p>
              Capability contracts, configuration schemas, event boundaries, and runtime package
              foundations.
            </p>
          </article>
          <article>
            <strong>Before activation</strong>
            <p>
              Artifact signing, provenance checks, failure isolation, secret adapters, and usage
              metering.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
