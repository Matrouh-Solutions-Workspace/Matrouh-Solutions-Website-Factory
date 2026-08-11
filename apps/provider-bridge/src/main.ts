import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isAbsolute, relative, resolve } from "node:path";
import { spawn } from "node:child_process";
import { renderMail } from "./mail";

const port = numberSetting("FACTORY_PROVIDER_BRIDGE_PORT", 3003);
const root = resolve(
  process.env.FACTORY_PROVIDER_MEDIA_DIRECTORY ?? resolve(process.cwd(), "../../media"),
);
const mediaSecret =
  process.env.FACTORY_MEDIA_PROVIDER_SECRET ?? "local-media-provider-secret-change-me";
const mailSecret =
  process.env.FACTORY_MAIL_PROVIDER_SECRET ?? "local-mail-provider-secret-change-me";
const domainSecret =
  process.env.FACTORY_DOMAIN_PROVIDER_SECRET ?? "local-domain-provider-secret-change-me";
const maxUploadBytes = numberSetting("FACTORY_MAX_UPLOAD_BYTES", 5_000_000);
const mediaPrefix = "media/";

await mkdir(root, { recursive: true });
await access(root);

const server = createServer((request, response) => {
  void handle(request, response).catch((error: unknown) => {
    console.error(JSON.stringify({ service: "provider-bridge", error: detail(error) }));
    if (error instanceof HttpError) {
      respond(response, error.statusCode, error.message);
      return;
    }
    respond(response, 500, "Internal server error");
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ service: "provider-bridge", status: "ready", port }));
});

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/health") {
    respond(response, 200, JSON.stringify({ status: "ready" }), "application/json");
    return;
  }
  if (request.method === "GET" && url.pathname.startsWith("/factory-media/")) {
    await servePublicMedia(url.pathname, response);
    return;
  }

  const body = await requestBody(request, maxUploadBytes);
  if (url.pathname === "/mail/send" && request.method === "POST") {
    assertProviderSigned(request, body, mailSecret);
    await sendMail(JSON.parse(body.toString("utf8")) as MailRequest);
    respond(response, 202, JSON.stringify({ accepted: true }), "application/json");
    return;
  }
  if (url.pathname === "/domains/connect") {
    assertProviderSigned(request, body, domainSecret);
    if (request.method === "POST") {
      const result = connectDomain(JSON.parse(body.toString("utf8")) as DomainConnectRequest);
      respond(response, 200, JSON.stringify(result), "application/json");
      return;
    }
    if (request.method === "DELETE") {
      validateDomainDisconnect(JSON.parse(body.toString("utf8")) as DomainDisconnectRequest);
      respond(response, 204);
      return;
    }
  }
  if (url.pathname === "/objects" && request.method === "PUT") {
    assertSigned(request, body, mediaSecret, request.method, url.pathname);
    const key = request.headers["x-factory-storage-key"];
    const contentHash = request.headers["x-factory-content-hash"];
    const contentType = request.headers["x-factory-content-type"];
    if (
      typeof key !== "string" ||
      typeof contentHash !== "string" ||
      typeof contentType !== "string"
    ) {
      throw new HttpError(400, "MEDIA_HEADERS_INVALID");
    }
    await storeMedia(key, body, contentHash, contentType);
    respond(response, 201, JSON.stringify({ stored: true }), "application/json");
    return;
  }
  if (url.pathname === "/process" && request.method === "POST") {
    assertSigned(request, body, mediaSecret, request.method, url.pathname);
    const result = await processMedia(JSON.parse(body.toString("utf8")) as ProcessRequest);
    respond(response, 200, JSON.stringify(result), "application/json");
    return;
  }
  if (url.pathname === "/objects" && request.method === "DELETE") {
    assertSigned(request, body, mediaSecret, request.method, url.pathname);
    const input = JSON.parse(body.toString("utf8")) as { storageKey?: unknown };
    if (typeof input.storageKey !== "string") throw new HttpError(400, "MEDIA_KEY_INVALID");
    await unlink(mediaPath(input.storageKey)).catch((error: unknown) => {
      if (code(error) !== "ENOENT") throw error;
    });
    respond(response, 204);
    return;
  }
  respond(response, 404, "Not found");
}

async function storeMedia(
  key: string,
  body: Buffer,
  hash: string,
  contentType: string,
): Promise<void> {
  const target = mediaPath(key);
  if (body.byteLength < 1 || body.byteLength > maxUploadBytes || !/^[0-9a-f]{64}$/.test(hash)) {
    throw new HttpError(400, "MEDIA_UPLOAD_INVALID");
  }
  if (
    createHash("sha256").update(body).digest("hex") !== hash ||
    !detectedType(body, contentType)
  ) {
    throw new HttpError(415, "MEDIA_SIGNATURE_INVALID");
  }
  await mkdir(resolve(target, ".."), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.upload`;
  await writeFile(temporary, body, { flag: "wx", mode: 0o640 });
  try {
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    if (code(error) !== "EEXIST") throw error;
  }
}

async function processMedia(input: ProcessRequest): Promise<ProcessedMedia> {
  if (
    !validOrganization(input.organizationId) ||
    !validMediaKey(input.storageKey, input.organizationId)
  ) {
    throw new HttpError(400, "MEDIA_PROCESS_REQUEST_INVALID");
  }
  const body = await readFile(mediaPath(input.storageKey));
  const contentType = detectedType(body, input.contentType);
  const hashMatches = createHash("sha256").update(body).digest("hex") === input.contentHash;
  if (!contentType || !hashMatches) {
    return {
      safe: false,
      detectedContentType: contentType ?? "application/octet-stream",
      metadata: { scanner: "local-signature-and-hash", processedAt: new Date().toISOString() },
      variants: [],
    };
  }
  return {
    safe: true,
    detectedContentType: contentType,
    metadata: { scanner: "local-signature-and-hash", processedAt: new Date().toISOString() },
    variants: [
      {
        key: "original",
        storageKey: input.storageKey,
        contentHash: input.contentHash,
        contentType,
        byteSize: body.byteLength,
      },
    ],
  };
}

async function servePublicMedia(pathname: string, response: ServerResponse): Promise<void> {
  const parts = pathname.split("/").filter(Boolean);
  const organizationId = parts[1];
  const filename = parts[2];
  if (parts.length !== 3 || !organizationId || !filename || !validOrganization(organizationId)) {
    respond(response, 404, "Not found");
    return;
  }
  const storageKey = `${mediaPrefix}${organizationId}/${filename}`;
  if (!validMediaKey(storageKey, organizationId)) {
    respond(response, 404, "Not found");
    return;
  }
  try {
    const file = mediaPath(storageKey);
    const info = await stat(file);
    const extension = filename.split(".").at(-1)?.toLowerCase() ?? "";
    const contentType = contentTypeFor(extension);
    if (!info.isFile() || !contentType || info.size < 1 || info.size > maxUploadBytes) {
      respond(response, 404, "Not found");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": info.size,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });
    createReadStream(file).pipe(response);
  } catch (error) {
    if (code(error) === "ENOENT") respond(response, 404, "Not found");
    else throw error;
  }
}

async function sendMail(input: MailRequest): Promise<void> {
  if (!isMail(input)) throw new HttpError(400, "MAIL_REQUEST_INVALID");
  const raw = renderMail(input);
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn("msmtp", ["--read-envelope-from", "--", input.to], {
      stdio: ["pipe", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.once("error", reject);
    child.once("exit", (exitCode) =>
      exitCode === 0
        ? resolvePromise()
        : reject(new Error(`SMTP_DELIVERY_FAILED_${exitCode}:${stderr.slice(0, 500)}`)),
    );
    child.stdin.end(raw);
  });
}

function assertSigned(
  request: IncomingMessage,
  body: Buffer,
  secret: string,
  method: string,
  pathname: string,
): void {
  const timestamp = request.headers["x-factory-timestamp"];
  const signature = request.headers["x-factory-signature"];
  const bodyHash = request.headers["x-factory-body-hash"];
  if (
    typeof timestamp !== "string" ||
    typeof signature !== "string" ||
    typeof bodyHash !== "string"
  ) {
    throw new HttpError(401, "SIGNATURE_MISSING");
  }
  if (!/^\d{10,16}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000) {
    throw new HttpError(401, "SIGNATURE_EXPIRED");
  }
  const actualHash = createHash("sha256").update(body).digest("hex");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${method}.${pathname}.${actualHash}`)
    .digest("hex");
  if (actualHash !== bodyHash || !safeEqual(expected, signature))
    throw new HttpError(401, "SIGNATURE_INVALID");
}

function assertProviderSigned(request: IncomingMessage, body: Buffer, secret: string): void {
  const timestamp = request.headers["x-factory-timestamp"];
  const signature = request.headers["x-factory-signature"];
  if (typeof timestamp !== "string" || typeof signature !== "string") {
    throw new HttpError(401, "SIGNATURE_MISSING");
  }
  if (!/^\d{10,16}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000) {
    throw new HttpError(401, "SIGNATURE_EXPIRED");
  }
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body.toString("utf8")}`)
    .digest("hex");
  if (!safeEqual(expected, signature)) throw new HttpError(401, "SIGNATURE_INVALID");
}

function connectDomain(input: DomainConnectRequest): DomainConnectResult {
  if (
    !validDomainId(input.domainId) ||
    !validHostname(input.hostname) ||
    input.idempotencyKey !== input.domainId
  ) {
    throw new HttpError(400, "DOMAIN_REQUEST_INVALID");
  }
  return { providerKey: "caddy", bindingId: input.domainId, status: "active" };
}

function validateDomainDisconnect(input: DomainDisconnectRequest): void {
  if (
    !validDomainId(input.domainId) ||
    !validHostname(input.hostname) ||
    input.idempotencyKey !== `release:${input.domainId}`
  ) {
    throw new HttpError(400, "DOMAIN_REQUEST_INVALID");
  }
}

function mediaPath(storageKey: string): string {
  if (!storageKey.startsWith(mediaPrefix)) throw new HttpError(400, "MEDIA_KEY_INVALID");
  const target = resolve(root, storageKey);
  const difference = relative(root, target);
  if (!difference || difference.startsWith("..") || isAbsolute(difference))
    throw new HttpError(400, "MEDIA_KEY_INVALID");
  return target;
}

function validMediaKey(storageKey: string, organizationId: string): boolean {
  return new RegExp(
    `^media/${organizationId}/[0-9a-f]{64}-[0-9a-f-]{36}\\.(jpe?g|png|webp|gif|pdf)$`,
    "i",
  ).test(storageKey);
}

function validOrganization(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDomainId(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function validHostname(value: string): boolean {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value);
}

function detectedType(bytes: Buffer, declared: string): string | null {
  const matches =
    (declared === "image/jpeg" && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (declared === "image/png" &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (declared === "image/gif" &&
      (bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
        bytes.subarray(0, 6).toString("ascii") === "GIF89a")) ||
    (declared === "image/webp" &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP") ||
    (declared === "application/pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-");
  return matches ? declared : null;
}

function contentTypeFor(extension: string): string | null {
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      pdf: "application/pdf",
    }[extension] ?? null
  );
}

async function requestBody(request: IncomingMessage, maximum: number): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > maximum) throw new HttpError(413, "REQUEST_TOO_LARGE");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

function respond(
  response: ServerResponse,
  status: number,
  body = "",
  contentType = "text/plain; charset=utf-8",
): void {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function numberSetting(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name}_INVALID`);
  return value;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.byteLength === b.byteLength && timingSafeEqual(a, b);
}

function code(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
}

function detail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMail(value: MailRequest): boolean {
  return [value.messageId, value.from, value.to, value.subject, value.text].every(
    (part) => typeof part === "string" && part.length > 0 && part.length < 10_000,
  );
}

interface ProcessRequest {
  readonly assetId: string;
  readonly organizationId: string;
  readonly storageKey: string;
  readonly contentHash: string;
  readonly contentType: string;
}

interface ProcessedMedia {
  readonly safe: boolean;
  readonly detectedContentType: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly variants: readonly {
    readonly key: string;
    readonly storageKey: string;
    readonly contentHash: string;
    readonly contentType: string;
    readonly byteSize: number;
  }[];
}

interface MailRequest {
  readonly messageId: string;
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

interface DomainConnectRequest {
  readonly domainId: string;
  readonly hostname: string;
  readonly idempotencyKey: string;
}

interface DomainDisconnectRequest {
  readonly domainId: string;
  readonly hostname: string;
  readonly idempotencyKey: string;
  readonly bindings: readonly {
    readonly providerKey: string;
    readonly providerBindingId: string;
  }[];
}

interface DomainConnectResult {
  readonly providerKey: string;
  readonly bindingId: string;
  readonly status: "active";
}

class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
