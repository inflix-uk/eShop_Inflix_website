import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/app/services/footerPageService";

/** Always resolve fresh CMS content; parent queries must not cache a mistaken 404. */
export const dynamic = "force-dynamic";

type PageSection = Record<string, unknown> & { type: string };

type PagePayload = {
  slug: string;
  title: string;
  sections: PageSection[];
};

function apiBase(): string {
  return API_BASE_URL.replace(/\/$/, "");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const base = apiBase();

  if (!base) {
    return NextResponse.json({ message: "Backend is not configured" }, { status: 503 });
  }

  const encodedSlug = encodeURIComponent(slug);
  const parentSlug = new URL(req.url).searchParams.get("parentSlug");
  const qs =
    parentSlug && parentSlug.trim()
      ? `?parentSlug=${encodeURIComponent(parentSlug.trim())}`
      : "";
  const url = `${base}/footer-pages/pagesBySlug/${encodedSlug}${qs}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (upstream.status === 404) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (!upstream.ok) {
      return NextResponse.json({ message: "Backend request failed" }, { status: 503 });
    }

    const json = await upstream.json();
    const page = json?.data;
    if (!json?.success || !page || page.publishStatus !== "published") {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const sections: PageSection[] = Array.isArray(page.blocks)
      ? page.blocks.map((row: Record<string, unknown>) => ({ type: "row", ...row }))
      : [];

    if (sections.length === 0) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const payload: PagePayload = {
      slug: String(page.slug ?? slug),
      title: typeof page.title === "string" ? page.title : "",
      sections,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Backend unavailable" }, { status: 503 });
  }
}
