import { NextResponse } from "next/server";
import { normalizeApiOriginForFetch } from "@/app/lib/cmsApiBase";

const TIMEOUT_MS = 10000;

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const trimmed = String(token || "").trim();
  if (!trimmed) {
    return NextResponse.json(
      { success: false, message: "Preview token is required" },
      { status: 400 }
    );
  }

  const base = normalizeApiOriginForFetch(process.env.NEXT_PUBLIC_API_URL || "");
  if (!base) {
    return NextResponse.json(
      { success: false, message: "API URL is not configured" },
      { status: 503 }
    );
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `${base}/navbar-variant-test/preview/${encodeURIComponent(trimmed)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    const text = await res.text().catch(() => "");
    let json: unknown = {};
    if (text.trim()) {
      try {
        json = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid preview response from API" },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(json, { status: res.status });
  } catch (err: unknown) {
    const name = err && typeof err === "object" && "name" in err ? String(err.name) : "";
    const message =
      name === "AbortError"
        ? "Preview request timed out"
        : "Could not load preview. Is the API running on port 4000?";
    return NextResponse.json({ success: false, message }, { status: 504 });
  } finally {
    clearTimeout(id);
  }
}
