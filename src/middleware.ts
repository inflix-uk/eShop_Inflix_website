import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDisabledMarketingSlug } from "@/app/lib/disabledMarketingRoutes";
import { normalizeSitePathname } from "@/lib/siteTrailingSlash";
import { getSuperadminControlsPublic } from "@/app/lib/superadminControlsPublic";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Ignore Next internals, API routes, and static assets/files.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Align with getCanonical / next.config trailingSlash: lowercase + trailing slash policy
  const normalized = normalizeSitePathname(pathname);

  if (normalized !== pathname) {
    url.pathname = normalized;
    return NextResponse.redirect(url, 301);
  }

  const slug = pathname.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  const controls = await getSuperadminControlsPublic();
  const dynamicDisabledBySuperadmin =
    controls.routeBlockingEnabled === false &&
    controls.disabledMarketingRoutes.includes(slug);

  if (isDisabledMarketingSlug(pathname) || dynamicDisabledBySuperadmin) {
    return NextResponse.rewrite(
      new URL("/__disabled-marketing-route", request.url)
    );
  }

  // Legacy /subcategory routes are retired — show 404 instead of redirect.
  if (pathname === "/subcategory" || pathname.startsWith("/subcategory/")) {
    return NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply middleware broadly, excluding Next internals/API/static files.
    "/((?!api|_next|.*\\..*).*)",
  ],
};
