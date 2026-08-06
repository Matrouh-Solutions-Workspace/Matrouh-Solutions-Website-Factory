import { checkRendererReadiness } from "@/server/site";

export async function GET() {
  try {
    await checkRendererReadiness();
    return Response.json({ status: "ready", service: "renderer" });
  } catch {
    return Response.json({ status: "not_ready", service: "renderer" }, { status: 503 });
  }
}
