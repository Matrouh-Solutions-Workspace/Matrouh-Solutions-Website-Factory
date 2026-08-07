import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { rendererConfig, workspaceRoot } from "@/server/config";

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
  context: { params: Promise<{ organizationId: string; filename: string }> },
): Promise<Response> {
  const { organizationId, filename } = await context.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      organizationId,
    ) ||
    !/^(?:[0-9a-f]{64}|[0-9a-f]{64}-[0-9a-f-]{36})\.(?:jpe?g|png|webp|gif|pdf)$/i.test(filename)
  ) {
    return new Response("Not found", { status: 404 });
  }

  const extension = filename.split(".").at(-1)?.toLowerCase();
  const contentType = extension ? contentTypes[extension] : undefined;
  if (!contentType) return new Response("Not found", { status: 404 });

  try {
    const mediaRoot = resolve(workspaceRoot, "media");
    const candidate = resolve(mediaRoot, organizationId, filename);
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
    console.error(
      JSON.stringify({
        service: "renderer",
        event: "media.read_failed",
        organizationId,
        filename,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return new Response("Media unavailable", { status: 503 });
  }
}
