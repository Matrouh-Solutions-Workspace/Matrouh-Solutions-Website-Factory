import { MonitoringAutoRefresh } from "@/app/monitoring/monitoring-auto-refresh";
import { loadMonitoringOverview, type MonitoringState } from "@/server/monitoring";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const monitoring = await loadMonitoringOverview();
  const operational = monitoring.systems.filter((system) => system.state === "operational").length;
  const attention = monitoring.systems.filter((system) =>
    ["degraded", "offline"].includes(system.state),
  ).length;

  return (
    <>
      <MonitoringAutoRefresh />
      <header>
        <div>
          <p className="eyebrow">Operations</p>
          <h1>System monitoring</h1>
          <p className="sub">
            Live readiness, worker heartbeats, background queues, and delivery health for the
            Website Factory.
          </p>
        </div>
        <a className="buttonLink" href="/monitoring">
          Refresh now
        </a>
      </header>
      <section className="stats compactStats monitoringStats">
        <article>
          <p>Systems</p>
          <strong>{monitoring.systems.length}</strong>
          <small>Tracked components</small>
        </article>
        <article>
          <p>Operational</p>
          <strong>{operational}</strong>
          <small>Ready now</small>
        </article>
        <article>
          <p>Needs attention</p>
          <strong>{attention}</strong>
          <small>Degraded or offline</small>
        </article>
        <article>
          <p>Last check</p>
          <strong>{timeOnly(monitoring.checkedAt)}</strong>
          <small>Refreshes every 15 seconds</small>
        </article>
      </section>
      <section aria-label="Monitored systems" className="monitoringGrid">
        {monitoring.systems.map((system) => (
          <article className={`panel monitoringCard monitoringCard--${system.state}`} key={system.id}>
            <div className="monitoringCardHead">
              <div>
                <p className="eyebrow">{system.description}</p>
                <h2>{system.name}</h2>
              </div>
              <span className={`monitoringState monitoringState--${system.state}`}>
                <i />
                {stateLabel(system.state)}
              </span>
            </div>
            <strong className="monitoringStatus">{system.status}</strong>
            <p className="monitoringDetail">{system.detail}</p>
            {system.metrics.length > 0 && (
              <dl className="monitoringMetrics">
                {system.metrics.map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <small className="monitoringChecked">Checked {relativeDate(system.checkedAt)}</small>
          </article>
        ))}
      </section>
    </>
  );
}

function stateLabel(state: MonitoringState): string {
  if (state === "operational") return "Operational";
  if (state === "degraded") return "Degraded";
  if (state === "offline") return "Offline";
  return "Information";
}

function timeOnly(value: Date): string {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(value);
}

function relativeDate(value: Date): string {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const seconds = Math.round((value.getTime() - Date.now()) / 1_000);
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  return formatter.format(Math.round(seconds / 60), "minute");
}
