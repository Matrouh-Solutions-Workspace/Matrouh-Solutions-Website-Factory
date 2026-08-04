import type { PortableTemplateManifest, TemplateId, TemplateVersion } from "@factory/template-sdk";
import type { ValidationReport } from "@factory/template-validator";
export type TemplateLifecycle =
  "discovered" | "validating" | "ready" | "deprecated" | "retired" | "quarantined";
export interface TemplateVersionRecord {
  id: string;
  templateId: TemplateId;
  version: TemplateVersion;
  artifactHash: string;
  lifecycle: TemplateLifecycle;
  manifest: PortableTemplateManifest;
  report: ValidationReport;
}
export interface TemplateRegistry {
  install(record: TemplateVersionRecord): Promise<void>;
  get(templateId: TemplateId, version: TemplateVersion): Promise<TemplateVersionRecord | null>;
  list(): Promise<readonly TemplateVersionRecord[]>;
  transition(id: string, to: TemplateLifecycle): Promise<void>;
}
