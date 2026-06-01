import { NextResponse } from "next/server";
import { slimBlogForCard } from "@/app/lib/slimBlogForCard";

/** Backend merges legacy Blog + published NewBlog (not /latest/old, which is old collection only). */
function upstreamLatestBlogsUrl(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  return `${base}/get/blog/latest`;
}

const TIMEOUT_MS = 7000;

export async function GET(req: Request) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(upstreamLatestBlogsUrl(), {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { status: res.status, message: "Upstream error", body: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    const raw = Array.isArray(data?.data) ? data.data : [];
    const limit = Math.min(12, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 8));
    const slim = raw
      .slice(0, limit)
      .map((row: Record<string, unknown>) => slimBlogForCard(row));

    return NextResponse.json(
      {
        status: data?.status ?? 200,
        data: slim,
        message: data?.message ?? "",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "Request timed out" : err?.message || "Unknown error";
    return NextResponse.json({ status: 504, message }, { status: 504 });
  } finally {
    clearTimeout(id);
  }
}
