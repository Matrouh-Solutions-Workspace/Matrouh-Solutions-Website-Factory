export type MediaState =
  "pending_upload" | "quarantined" | "scanning" | "processing" | "ready" | "rejected" | "deleted";
export interface BlobStore {
  createUpload(
    key: string,
    contentType: string,
    maxBytes: number,
  ): Promise<{ url: string; expiresAt: string }>;
  delete(key: string): Promise<void>;
}
export interface MediaScanner {
  scan(key: string): Promise<{ safe: boolean; detectedContentType: string }>;
}
export interface MediaTransformer {
  variants(key: string): Promise<Readonly<Record<string, string>>>;
}

export interface RemoteMediaProviderOptions {
  readonly endpoint: string;
  readonly secret: string;
}

export interface ProcessedMedia {
  readonly safe: boolean;
  readonly detectedContentType: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly variants: readonly {
    readonly key: string;
    readonly storageKey: string;
    readonly contentHash?: string;
    readonly contentType: string;
    readonly byteSize: number;
    readonly width?: number;
    readonly height?: number;
  }[];
}

export class RemoteMediaProvider {
  constructor(private readonly options: RemoteMediaProviderOptions) {
    if (!options.endpoint || Buffer.byteLength(options.secret, "utf8") < 32) {
      throw new Error("MEDIA_PROVIDER_CONFIG_INVALID");
    }
  }

  async upload(input: {
    storageKey: string;
    bytes: Uint8Array;
    contentHash: string;
    contentType: string;
  }): Promise<void> {
    await this.request("PUT", "/objects", input.bytes, {
      "x-factory-content-hash": input.contentHash,
      "x-factory-content-type": input.contentType,
      "x-factory-storage-key": input.storageKey,
    });
  }

  async process(input: {
    assetId: string;
    organizationId: string;
    storageKey: string;
    contentHash: string;
    contentType: string;
  }): Promise<ProcessedMedia> {
    const response = await this.request(
      "POST",
      "/process",
      new TextEncoder().encode(JSON.stringify(input)),
      { "content-type": "application/json" },
    );
    const value = (await response.json()) as ProcessedMedia;
    if (
      typeof value.safe !== "boolean" ||
      typeof value.detectedContentType !== "string" ||
      !Array.isArray(value.variants)
    ) {
      throw new Error("MEDIA_PROVIDER_RESPONSE_INVALID");
    }
    return value;
  }

  async delete(storageKey: string): Promise<void> {
    await this.request(
      "DELETE",
      "/objects",
      new TextEncoder().encode(JSON.stringify({ storageKey })),
      { "content-type": "application/json" },
      true,
    );
  }

  private async request(
    method: string,
    path: string,
    body: Uint8Array,
    headers: Readonly<Record<string, string>>,
    allowMissing = false,
  ): Promise<Response> {
    const timestamp = String(Date.now());
    const requestBody = Buffer.from(body);
    const digest = await crypto.subtle.digest("SHA-256", requestBody);
    const bodyHash = Buffer.from(digest).toString("hex");
    const signature = await hmac(this.options.secret, `${timestamp}.${method}.${path}.${bodyHash}`);
    const response = await fetch(new URL(path, `${this.options.endpoint.replace(/\/$/, "")}/`), {
      method,
      headers: {
        ...headers,
        "x-factory-body-hash": bodyHash,
        "x-factory-signature": signature,
        "x-factory-timestamp": timestamp,
      },
      body: requestBody,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok && !(allowMissing && response.status === 404)) {
      throw new Error(`MEDIA_PROVIDER_FAILED_${response.status}`);
    }
    return response;
  }
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Buffer.from(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
  ).toString("hex");
}
