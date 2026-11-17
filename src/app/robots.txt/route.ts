import { NextResponse } from "next/server";
import { resolveApiBase } from "@/app/lib/backendAvailability";

const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /search
Disallow: /checkout
Disallow: /admin/
Disallow: /login
Disallow: /cgi-bin
Disallow: /revieworder
Disallow: /register
Disallow: /account
Disallow: /reset-password/
Disallow: /log-out
Disallow: /Support/Your-payments
Disallow: /customer/
`;

/** Always read fresh robots content from the API (admin saves must show on live site). */
export const dynamic = "force-dynamic";

function robotsResponse(body: string, source: "api" | "default" | "error") {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        source === "api"
          ? "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
          : "public, max-age=60, s-maxage=60",
      "X-Robots-Source": source,
    },
  });
}

export async function GET() {
  const base = resolveApiBase();
  if (!base) {
    console.error(
      "[robots.txt] Missing API base. Set NEXT_PUBLIC_API_URL (build + runtime), or API_URL / BACKEND_URL on the storefront host."
    );
    return robotsResponse(DEFAULT_ROBOTS_TXT, "default");
  }

  try {
    const res = await fetch(`${base}/robots-settings/public`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        "[robots.txt] API error:",
        res.status,
        res.statusText,
        detail.slice(0, 200),
        "url:",
        `${base}/robots-settings/public`
      );
      return robotsResponse(DEFAULT_ROBOTS_TXT, "error");
    }

    const json = await res.json();
    const raw = json?.data?.content;
    const content =
      typeof raw === "string" && raw.length > 0 ? raw : DEFAULT_ROBOTS_TXT;

    return robotsResponse(content, "api");
  } catch (error) {
    console.error("[robots.txt] Fetch failed:", error);
    return robotsResponse(DEFAULT_ROBOTS_TXT, "error");
  }
}
