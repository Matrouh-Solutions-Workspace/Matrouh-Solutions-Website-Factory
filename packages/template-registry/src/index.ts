import type { PortableTemplateManifest, TemplateId, TemplateVersion } from "@factory/template-sdk";
import type { ValidationReport } from "@factory/template-validator";

export type TemplateLifecycle =
  "discovered" | "validating" | "ready" | "deprecated" | "retired" | "quarantined";

export interface TemplateVersionRecord {
  readonly id: string;
  readonly templateId: TemplateId;
  readonly version: TemplateVersion;
  readonly artifactHash: string;
  readonly lifecycle: TemplateLifecycle;
  readonly manifest: PortableTemplateManifest;
  readonly report: ValidationReport;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export interface TemplateRegistryRepository {
  insert(record: TemplateVersionRecord): Promise<void>;
  updateLifecycle(
    id: string,
    expected: TemplateLifecycle,
    next: TemplateLifecycle,
  ): Promise<boolean>;
  get(templateId: TemplateId, version: TemplateVersion): Promise<TemplateVersionRecord | null>;
  getById(id: string): Promise<TemplateVersionRecord | null>;
  list(): Promise<readonly TemplateVersionRecord[]>;
  publicationReferenceCount(id: string): Promise<number>;
}

export interface TemplateRegistryEventSink {
  emit(event: {
    readonly type: "TemplateInstalled" | "TemplateLifecycleChanged";
    readonly templateVersionId: string;
    readonly from?: TemplateLifecycle;
    readonly to: TemplateLifecycle;
  }): Promise<void>;
}

const transitions: Readonly<Record<TemplateLifecycle, readonly TemplateLifecycle[]>> = {
  discovered: ["validating", "quarantined"],
  validating: ["ready", "quarantined"],
  ready: ["deprecated", "quarantined"],
  deprecated: ["ready", "retired", "quarantined"],
  retired: [],
  quarantined: ["validating", "retired"],
};

export class TemplateRegistryService {
  constructor(
    private readonly repository: TemplateRegistryRepository,
    private readonly events?: TemplateRegistryEventSink,
  ) {}

  async install(record: TemplateVersionRecord): Promise<void> {
    assertRecord(record);
    const existing = await this.repository.get(record.templateId, record.version);
    if (existing) {
      if (existing.artifactHash !== record.artifactHash) {
        throw new TemplateRegistryError(
          "TEMPLATE_VERSION_IMMUTABLE",
          "A released version cannot change artifact bytes",
        );
      }
      throw new TemplateRegistryError(
        "TEMPLATE_VERSION_EXISTS",
        "Template version is already installed",
      );
    }
    if (record.lifecycle !== "discovered" && record.lifecycle !== "quarantined") {
      throw new TemplateRegistryError(
        "TEMPLATE_INSTALL_STATE_INVALID",
        "Install must begin in discovered or quarantined state",
      );
    }
    await this.repository.insert(record);
    await this.events?.emit({
      type: "TemplateInstalled",
      templateVersionId: record.id,
      to: record.lifecycle,
    });
  }

  async transition(id: string, next: TemplateLifecycle): Promise<void> {
    const current = await this.repository.getById(id);
    if (!current)
      throw new TemplateRegistryError("TEMPLATE_NOT_FOUND", "Template version was not found");
    if (!transitions[current.lifecycle].includes(next)) {
      throw new TemplateRegistryError(
        "TEMPLATE_TRANSITION_INVALID",
        `${current.lifecycle} cannot transition to ${next}`,
      );
    }
    if (next === "ready" && !current.report.valid) {
      throw new TemplateRegistryError(
        "TEMPLATE_VALIDATION_FAILED",
        "Invalid templates cannot become ready",
      );
    }
    if (next === "retired" && (await this.repository.publicationReferenceCount(id)) > 0) {
      throw new TemplateRegistryError(
        "TEMPLATE_STILL_REFERENCED",
        "Published snapshots still reference this version",
      );
    }
    const changed = await this.repository.updateLifecycle(id, current.lifecycle, next);
    if (!changed)
      throw new TemplateRegistryError(
        "TEMPLATE_CONCURRENT_UPDATE",
        "Template lifecycle changed concurrently",
      );
    await this.events?.emit({
      type: "TemplateLifecycleChanged",
      templateVersionId: id,
      from: current.lifecycle,
      to: next,
    });
  }

  get(templateId: TemplateId, version: TemplateVersion) {
    return this.repository.get(templateId, version);
  }
  list() {
    return this.repository.list();
  }
}

export class TemplateRegistryError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TemplateRegistryError";
  }
}

function assertRecord(record: TemplateVersionRecord): void {
  if (!/^[0-9a-f]{64}$/.test(record.artifactHash)) {
    throw new TemplateRegistryError(
      "TEMPLATE_ARTIFACT_HASH_INVALID",
      "Artifact hash must be SHA-256",
    );
  }
  if (
    record.manifest.manifest.id !== record.templateId ||
    record.manifest.manifest.version !== record.version
  ) {
    throw new TemplateRegistryError(
      "TEMPLATE_MANIFEST_IDENTITY_MISMATCH",
      "Manifest identity does not match registry identity",
    );
  }
  if (record.report.artifactHash !== null && record.report.artifactHash !== record.artifactHash) {
    throw new TemplateRegistryError(
      "TEMPLATE_REPORT_HASH_MISMATCH",
      "Validation report refers to another artifact",
    );
  }
}
