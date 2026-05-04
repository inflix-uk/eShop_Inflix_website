import { NextResponse } from "next/server";

const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const UPSTREAM_URL = `${base}/get/category/for/navbar`;
const TIMEOUT_MS = 7000;

/** Short ISR — avoids `force-dynamic` + `no-store`, which block bfcache on navigations. */
export const revalidate = 30;

export async function GET() {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    if (!base) {
      return NextResponse.json(
        { message: "Backend is not configured", data: [] },
        { status: 503 }
      );
    }

    const res = await fetch(UPSTREAM_URL, {
      next: { revalidate: 30 },
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { message: "Upstream error", status: res.status, body: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    // Ensure shape matches client expectation: { data: [...] }
    return NextResponse.json(
      { data: data?.data ?? data },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "Request timed out" : err?.message || "Unknown error";
    return NextResponse.json({ message }, { status: 504 });
  } finally {
    clearTimeout(id);
  }
}
