import { constants } from "node:fs";
import { access, mkdir, readFile, realpath, stat, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  canonicalize,
  parseSnapshot,
  snapshotHash,
  type PublicationSnapshot,
} from "@factory/publication-contract";
import type { JsonValue } from "@factory/template-sdk";

export type PublishState = "queued" | "compiling" | "validating" | "ready" | "failed";
export interface PublicationArtifactStore {
  ready(): Promise<void>;
  putImmutable(
    id: string,
    snapshot: PublicationSnapshot,
  ): Promise<{ uri: string; hash: string; byteSize: number }>;
  get(uri: string): Promise<PublicationSnapshot>;
  deleteOrphan(uri: string): Promise<void>;
}
export interface PublicationActivator {
  activate(websiteId: string, publicationId: string): Promise<void>;
  rollback(websiteId: string, publicationId: string): Promise<void>;
}
export interface PublishStatus {
  readonly id: string;
  readonly state: PublishState;
  readonly diagnostics: readonly { code: string; path: string; message: string }[];
}

export interface PublicationCommandContext {
  readonly organizationId: string;
  readonly actorId: string;
  readonly correlationId: string;
}

export interface RequestPublicationCommand {
  readonly websiteId: string;
}

export interface PublicationRequestResult {
  readonly jobId: string;
  readonly created: boolean;
  readonly draftRevision: string;
}

export interface PublicationCommandRepository {
  requestPublication(
    context: PublicationCommandContext,
    command: RequestPublicationCommand,
  ): Promise<PublicationRequestResult | null>;
}

export async function requestPublication(
  repository: PublicationCommandRepository,
  context: PublicationCommandContext,
  command: RequestPublicationCommand,
): Promise<PublicationRequestResult | null> {
  if (!context.organizationId || !context.actorId || !context.correlationId) {
    throw new ArtifactStoreError("PUBLICATION_CONTEXT_INVALID");
  }
  if (!/^[0-9a-f-]{36}$/i.test(command.websiteId)) {
    throw new ArtifactStoreError("PUBLICATION_WEBSITE_ID_INVALID");
  }
  return repository.requestPublication(context, command);
}

export class LocalPublicationArtifactStore implements PublicationArtifactStore {
  readonly root: string;
  constructor(
    root: string,
    private readonly maximumBytes = 2_000_000,
  ) {
    this.root = resolve(root);
  }

  async ready(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await access(this.root, constants.R_OK | constants.W_OK);
  }

  async putImmutable(id: string, snapshot: PublicationSnapshot) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new ArtifactStoreError("ARTIFACT_ID_INVALID");
    await mkdir(this.root, { recursive: true });
    const target = join(this.root, `${id}.json`);
    const content = canonicalize(snapshot as unknown as JsonValue);
    const size = Buffer.byteLength(content);
    if (size > this.maximumBytes) throw new ArtifactStoreError("ARTIFACT_TOO_LARGE");
    let exists = true;
    try {
      await access(target, constants.F_OK);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      exists = false;
    }
    if (exists) {
      let existing: PublicationSnapshot;
      try {
        existing = await this.get(target);
      } catch (error) {
        throw new ArtifactStoreError("ARTIFACT_EXISTING_INVALID", { cause: error });
      }
      if (snapshotHash(existing) !== snapshotHash(snapshot))
        throw new ArtifactStoreError("ARTIFACT_IMMUTABILITY_VIOLATION");
      return { uri: target, hash: snapshotHash(snapshot), byteSize: size };
    }
    await writeFile(target, content, { encoding: "utf8", flag: "wx" });
    return { uri: target, hash: snapshotHash(snapshot), byteSize: size };
  }

  async get(uri: string): Promise<PublicationSnapshot> {
    const candidate = resolve(isAbsolute(uri) ? uri : join(this.root, uri));
    const [root, actual] = await Promise.all([realpath(this.root), realpath(candidate)]);
    const difference = relative(root, actual);
    if (difference.startsWith("..") || isAbsolute(difference))
      throw new ArtifactStoreError("ARTIFACT_PATH_ESCAPE");
    const information = await stat(actual);
    if (!information.isFile() || information.size > this.maximumBytes)
      throw new ArtifactStoreError("ARTIFACT_SIZE_INVALID");
    return parseSnapshot(JSON.parse(await readFile(actual, "utf8")) as unknown);
  }

  async deleteOrphan(uri: string): Promise<void> {
    const candidate = resolve(isAbsolute(uri) ? uri : join(this.root, uri));
    let root: string;
    try {
      root = await realpath(this.root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    const difference = relative(root, candidate);
    if (difference.startsWith("..") || isAbsolute(difference)) {
      throw new ArtifactStoreError("ARTIFACT_PATH_ESCAPE");
    }
    try {
      const actual = await realpath(candidate);
      const actualDifference = relative(root, actual);
      if (actualDifference.startsWith("..") || isAbsolute(actualDifference)) {
        throw new ArtifactStoreError("ARTIFACT_PATH_ESCAPE");
      }
      const information = await stat(actual);
      if (!information.isFile()) throw new ArtifactStoreError("ARTIFACT_NOT_FILE");
      await unlink(actual);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

export interface S3PublicationArtifactStoreOptions {
  readonly bucket: string;
  readonly region: string;
  readonly endpoint?: string;
  readonly prefix?: string;
  readonly forcePathStyle?: boolean;
  readonly maximumBytes?: number;
}

export interface PublicationArtifactStoreConfiguration {
  readonly driver: "local" | "s3";
  readonly localDirectory: string;
  readonly s3Bucket: string | undefined;
  readonly s3Region: string;
  readonly s3Endpoint: string | undefined;
  readonly s3Prefix: string | undefined;
  readonly s3ForcePathStyle: boolean;
}

export function createPublicationArtifactStore(
  configuration: PublicationArtifactStoreConfiguration,
): PublicationArtifactStore {
  if (configuration.driver === "local") {
    return new LocalPublicationArtifactStore(configuration.localDirectory);
  }
  if (!configuration.s3Bucket) throw new ArtifactStoreError("ARTIFACT_BUCKET_REQUIRED");
  return new S3PublicationArtifactStore({
    bucket: configuration.s3Bucket,
    region: configuration.s3Region,
    ...(configuration.s3Endpoint ? { endpoint: configuration.s3Endpoint } : {}),
    ...(configuration.s3Prefix ? { prefix: configuration.s3Prefix } : {}),
    forcePathStyle: configuration.s3ForcePathStyle,
  });
}

export class S3PublicationArtifactStore implements PublicationArtifactStore {
  private readonly client: S3Client;
  private readonly prefix: string;
  private readonly maximumBytes: number;

  constructor(private readonly options: S3PublicationArtifactStoreOptions) {
    if (!options.bucket) throw new ArtifactStoreError("ARTIFACT_BUCKET_REQUIRED");
    this.prefix = (options.prefix ?? "factory").replace(/^\/+|\/+$/g, "");
    this.maximumBytes = options.maximumBytes ?? 2_000_000;
    this.client = new S3Client({
      region: options.region,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      forcePathStyle: options.forcePathStyle ?? false,
    });
  }

  async ready(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.options.bucket }));
  }

  async putImmutable(id: string, snapshot: PublicationSnapshot) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new ArtifactStoreError("ARTIFACT_ID_INVALID");
    const content = canonicalize(snapshot as unknown as JsonValue);
    const byteSize = Buffer.byteLength(content);
    if (byteSize > this.maximumBytes) throw new ArtifactStoreError("ARTIFACT_TOO_LARGE");
    const key = this.key(id);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.options.bucket,
          Key: key,
          Body: content,
          ContentType: "application/json",
          CacheControl: "private, max-age=31536000, immutable",
          IfNoneMatch: "*",
          Metadata: { contentHash: snapshotHash(snapshot) },
          ServerSideEncryption: "AES256",
        }),
      );
    } catch (error) {
      if (!isPreconditionFailure(error)) throw error;
      const existing = await this.get(this.uri(key));
      if (snapshotHash(existing) !== snapshotHash(snapshot)) {
        throw new ArtifactStoreError("ARTIFACT_IMMUTABILITY_VIOLATION");
      }
    }
    return { uri: this.uri(key), hash: snapshotHash(snapshot), byteSize };
  }

  async get(uri: string): Promise<PublicationSnapshot> {
    const key = this.parseUri(uri);
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.options.bucket, Key: key }),
    );
    if (!response.Body) throw new ArtifactStoreError("ARTIFACT_MISSING");
    if (response.ContentLength !== undefined && response.ContentLength > this.maximumBytes) {
      throw new ArtifactStoreError("ARTIFACT_SIZE_INVALID");
    }
    const raw = await response.Body.transformToString("utf-8");
    if (Buffer.byteLength(raw) > this.maximumBytes)
      throw new ArtifactStoreError("ARTIFACT_SIZE_INVALID");
    return parseSnapshot(JSON.parse(raw) as unknown);
  }

  async deleteOrphan(uri: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: this.parseUri(uri) }),
    );
  }

  private key(id: string): string {
    return `${this.prefix ? `${this.prefix}/` : ""}publications/${id}.json`;
  }

  private uri(key: string): string {
    return `s3://${this.options.bucket}/${key}`;
  }

  private parseUri(uri: string): string {
    const prefix = `s3://${this.options.bucket}/`;
    if (!uri.startsWith(prefix)) throw new ArtifactStoreError("ARTIFACT_URI_INVALID");
    const key = uri.slice(prefix.length);
    const requiredPrefix = `${this.prefix ? `${this.prefix}/` : ""}publications/`;
    if (!key.startsWith(requiredPrefix) || key.includes("..") || key.includes("\\")) {
      throw new ArtifactStoreError("ARTIFACT_PATH_ESCAPE");
    }
    return key;
  }
}

function isPreconditionFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return value.name === "PreconditionFailed" || value.$metadata?.httpStatusCode === 412;
}

export class ArtifactStoreError extends Error {
  constructor(
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "ArtifactStoreError";
  }
}
