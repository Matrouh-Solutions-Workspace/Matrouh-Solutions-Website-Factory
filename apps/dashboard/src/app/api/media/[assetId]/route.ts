import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { withTenantTransaction } from "@factory/database";
import { requireDashboardContext } from "@/server/auth";
import { dashboardConfig, workspaceRoot } from "@/server/config";
import { dashboardDatabase } from "@/server/database";

export const dynamic = "force-dynamic";

const privateImmutableCache = "private, max-age=31536000, immutable";
const imageTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
): Promise<Response> {
  const { assetId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) {
    return new Response("Not found", { status: 404 });
  }
  const dashboardContext = await requireDashboardContext("media.read");
  const asset = await withTenantTransaction(
    dashboardDatabase(),
    {
      organizationId: dashboardContext.organization.id,
      actorId: dashboardContext.actor.id,
      correlationId: `media-preview:${assetId}`,
    },
    (transaction) =>
      transaction.mediaAsset.findFirst({
        where: {
          id: assetId,
          organizationId: dashboardContext.organization.id,
          status: "ready",
          kind: "image",
        },
        select: { detectedContentType: true, storageKey: true },
      }),
  );
  if (!asset || !asset.detectedContentType || !imageTypes.has(asset.detectedContentType)) {
    return new Response("Not found", { status: 404 });
  }
  const filename = storageFilename(asset.storageKey);
  if (!filename) return new Response("Not found", { status: 404 });

  const providerBase = dashboardConfig.FACTORY_MEDIA_PROVIDER_URL?.replace(/\/$/, "");
  if (providerBase) {
    return proxyProviderMedia(
      `${providerBase}/factory-media/${dashboardContext.organization.id}/${encodeURIComponent(filename)}`,
      asset.detectedContentType,
    );
  }
  return readLocalMedia(
    asset.storageKey,
    dashboardContext.organization.id,
    asset.detectedContentType,
  );
}

async function proxyProviderMedia(url: string, expectedContentType: string): Promise<Response> {
  try {
    const upstream = await fetch(url, { cache: "no-store" });
    if (upstream.status === 404) return new Response("Not found", { status: 404 });
    if (!upstream.ok || !upstream.body) throw new Error(`MEDIA_PROVIDER_${upstream.status}`);
    const contentLength = Number(upstream.headers.get("content-length"));
    const contentType = upstream.headers.get("content-type")?.split(";", 1)[0]?.trim();
    if (
      contentType !== expectedContentType ||
      !Number.isSafeInteger(contentLength) ||
      contentLength < 1 ||
      contentLength > dashboardConfig.FACTORY_MAX_UPLOAD_BYTES
    ) {
      throw new Error("MEDIA_PROVIDER_RESPONSE_INVALID");
    }
    return new Response(upstream.body, {
      headers: mediaHeaders(contentType, contentLength),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        service: "dashboard",
        event: "media.preview_provider_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return new Response("Media unavailable", { status: 503 });
  }
}

async function readLocalMedia(
  storageKey: string,
  organizationId: string,
  contentType: string,
): Promise<Response> {
  try {
    const mediaRoot = resolve(workspaceRoot, "media", organizationId);
    const candidate = resolve(workspaceRoot, storageKey);
    const [actualRoot, actualFile] = await Promise.all([realpath(mediaRoot), realpath(candidate)]);
    const difference = relative(actualRoot, actualFile);
    if (difference.startsWith("..") || isAbsolute(difference)) {
      return new Response("Not found", { status: 404 });
    }
    const information = await stat(actualFile);
    if (
      !information.isFile() ||
      information.size < 1 ||
      information.size > dashboardConfig.FACTORY_MAX_UPLOAD_BYTES
    ) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(await readFile(actualFile), {
      headers: mediaHeaders(contentType, information.size),
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Not found", { status: 404 });
    }
    console.error(
      JSON.stringify({
        service: "dashboard",
        event: "media.preview_read_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return new Response("Media unavailable", { status: 503 });
  }
}

function mediaHeaders(contentType: string, contentLength: number): HeadersInit {
  return {
    "Cache-Control": privateImmutableCache,
    "Content-Length": String(contentLength),
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  };
}

function storageFilename(storageKey: string): string | null {
  const normalized = storageKey.replaceAll("\\", "/");
  const filename = normalized.split("/").at(-1);
  return filename && !filename.includes("..") ? filename : null;
}
