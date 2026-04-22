import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDisabledMarketingSlug } from "@/app/lib/disabledMarketingRoutes";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isDisabledMarketingSlug(pathname)) {
    return NextResponse.rewrite(
      new URL("/__disabled-marketing-route", request.url)
    );
  }

  // Enforce lowercase URLs for /categories/ routes
  if (pathname.startsWith("/categories/")) {
    const lowercased = pathname.toLowerCase();
    if (pathname !== lowercased) {
      const url = request.nextUrl.clone();
      url.pathname = lowercased;
      return NextResponse.redirect(url, 301);
    }
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
          url.pathname = `/categories/${parentCategory.toLowerCase()}/${subcategorySlug.toLowerCase()}`;
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
    "/subcategory/:path*",
    "/categories/:path*",
    "/subscribe-newsletter",
    "/subscribe-newsletter/:path*",
    "/why-buying-a-refurbished-iphone-is-a-good-idea",
    "/why-buying-a-refurbished-iphone-is-a-good-idea/:path*",
    "/buy-now-pay-later",
    "/buy-now-pay-later/:path*",
    "/customer-reviews",
    "/customer-reviews/:path*",
    "/recycle-mobile-phone",
    "/recycle-mobile-phone/:path*",
    "/Sustainability",
    "/Sustainability/:path*",
    "/sustainability",
    "/sustainability/:path*",
    "/18-months-warranty",
    "/18-months-warranty/:path*",
    "/faqs",
    "/faqs/:path*",
    "/about-zextons",
    "/about-zextons/:path*",
    "/deals-and-discounts",
    "/deals-and-discounts/:path*",
  ],
};
