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

  // Redirect old /subcategory/ URLs to new /categories/ structure
  if (pathname.startsWith("/subcategory/")) {
    const subcategorySlug = pathname.replace("/subcategory/", "");

    if (!subcategorySlug) return NextResponse.next();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/subcategory/somedetails/${encodeURIComponent(subcategorySlug)}`,
        { next: { revalidate: 60 } }
      );

      if (res.ok) {
        const data = await res.json();
        const parentCategory = data.subcategoryDetails?.parentCategorySlug
          || data.subcategoryDetails?.parentCategory;

        if (parentCategory) {
          const url = request.nextUrl.clone();
          const base = `/categories/${parentCategory.toLowerCase()}/${subcategorySlug.toLowerCase()}`;
          url.pathname = normalizeSitePathname(base);
          return NextResponse.redirect(url, 301);
        }
      }
    } catch (error) {
      console.error("Middleware redirect error:", error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply middleware broadly, excluding Next internals/API/static files.
    "/((?!api|_next|.*\\..*).*)",
  ],
};
