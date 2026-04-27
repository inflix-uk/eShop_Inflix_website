import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PageSection = Record<string, unknown> & { type: string };

type PagePayload = {
  slug: string;
  title: string;
  sections: PageSection[];
};

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const base = apiBase();

  if (!base) {
    return NextResponse.json({ message: "Backend is not configured" }, { status: 503 });
  }

  const encodedSlug = encodeURIComponent(slug);
  const url = `${base}/footer-pages/pagesBySlug/${encodedSlug}`;

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
