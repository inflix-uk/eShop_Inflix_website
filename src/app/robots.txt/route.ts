import { NextResponse } from "next/server";

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

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) {
    return new NextResponse(DEFAULT_ROBOTS_TXT, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const res = await fetch(`${base}/robots-settings/public`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return new NextResponse(DEFAULT_ROBOTS_TXT, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const json = await res.json();
    const content =
      typeof json?.data?.content === "string" && json.data.content.trim()
        ? json.data.content
        : DEFAULT_ROBOTS_TXT;

    return new NextResponse(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new NextResponse(DEFAULT_ROBOTS_TXT, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
