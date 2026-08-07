import { readFile, realpath, stat } from "node:fs/promises";
import { headers } from "next/headers";
import { isAbsolute, relative, resolve } from "node:path";
import { rendererConfig, workspaceRoot } from "@/server/config";
import { loadSite } from "@/server/site";

const immutableCache = "public, max-age=31536000, immutable";
const contentTypes: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const { filename } = await context.params;
  if (!isMediaFilename(filename)) return new Response("Not found", { status: 404 });
  const requestHeaders = await headers();
  const site = await loadSite(
    requestHeaders.get("x-factory-site-host") ?? requestHeaders.get("host") ?? "",
  );
  if (!site) return new Response("Not found", { status: 404 });
  const extension = filename.split(".").at(-1)?.toLowerCase();
  const contentType = extension ? contentTypes[extension] : undefined;
  if (!contentType) return new Response("Not found", { status: 404 });

  const publicBase = rendererConfig.FACTORY_MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (publicBase) {
    return Response.redirect(
      `${publicBase}/factory-media/${site.organizationId}/${encodeURIComponent(filename)}`,
      307,
    );
  }
  try {
    const mediaRoot = resolve(workspaceRoot, "media");
    const candidate = resolve(mediaRoot, site.organizationId, filename);
    const [actualRoot, actualFile] = await Promise.all([realpath(mediaRoot), realpath(candidate)]);
    const difference = relative(actualRoot, actualFile);
    if (difference.startsWith("..") || isAbsolute(difference)) {
      return new Response("Not found", { status: 404 });
    }
    const information = await stat(actualFile);
    if (
      !information.isFile() ||
      information.size < 1 ||
      information.size > rendererConfig.FACTORY_MAX_UPLOAD_BYTES
    ) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(await readFile(actualFile), {
      headers: {
        "Cache-Control": immutableCache,
        "Content-Length": String(information.size),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Not found", { status: 404 });
    }
    console.error(JSON.stringify({ service: "renderer", event: "media.read_failed", filename }));
    return new Response("Media unavailable", { status: 503 });
  }
}

function isMediaFilename(filename: string): boolean {
  return /^(?:[0-9a-f]{64}|[0-9a-f]{64}-[0-9a-f-]{36})\.(?:jpe?g|png|webp|gif|pdf)$/i.test(
    filename,
  );
}
