import { join } from "node:path";
import { discoverTemplates, loadTemplate } from "@factory/template-loader";
import { validateTemplate } from "@factory/template-validator";
export default async function Lab() {
  const candidates = await discoverTemplates(join(process.cwd(), "..", "..", "templates"));
  const reports = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      report: validateTemplate(await loadTemplate(candidate), {
        factoryVersion: "0.1.0",
        rendererVersion: "0.1.0",
        supportedSdkVersions: ["1.0.0"],
        contentSchemaVersions: [1],
        themeSchemaVersions: [1],
        publicationSnapshotVersions: [1],
      }),
    })),
  );
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <p style={{ color: "#0d806c", fontWeight: 700 }}>TEMPLATE LAB</p>
      <h1 style={{ fontFamily: "Georgia", fontSize: 44 }}>Contract health</h1>
      <p>Auto-discovered templates and their complete compatibility reports.</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
          gap: 16,
          marginTop: 32,
        }}
      >
        {reports.map(({ candidate, report }) => (
          <article
            key={candidate.discovery.templateId}
            style={{
              background: "white",
              border: "1px solid #dfe7e4",
              borderRadius: 14,
              padding: 22,
            }}
          >
            <h2>{candidate.discovery.templateId}</h2>
            <p>
              {candidate.discovery.templateVersion} · {report.valid ? "Ready" : "Invalid"}
            </p>
            {report.checks.map((check) => (
              <div
                key={check.code}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderTop: "1px solid #edf0ef",
                  fontSize: 13,
                }}
              >
                <span>{check.code}</span>
                <strong style={{ color: check.valid ? "#0d806c" : "#b42318" }}>
                  {check.valid ? "PASS" : "FAIL"}
                </strong>
              </div>
            ))}
          </article>
        ))}
      </div>
    </main>
  );
}
