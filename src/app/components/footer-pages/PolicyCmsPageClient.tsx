"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { FooterPage } from "@/app/services/footerPageService";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";
import type { SiteWidgetVisibility } from "@/app/lib/siteWidgetVisibilityDefaults";

const NavbarVariantTestBar = dynamic(
  () => import("@/app/components/navbar/NavbarVariantTestBar"),
  {
    ssr: false,
    loading: () => (
      <div className="h-16 w-full bg-white" aria-hidden="true" />
    ),
  }
);

const FooterPageContent = dynamic(
  () => import("@/app/components/footer-pages/FooterPageContent"),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[40vh] w-full animate-pulse rounded-md bg-gray-50"
        aria-hidden="true"
      />
    ),
  }
);

export default function PolicyCmsPageClient({
  page,
  navbarVariantTestConfig,
  widgetVisibility,
}: {
  page: FooterPage;
  navbarVariantTestConfig: NavbarVariantTestConfig | null;
  widgetVisibility?: SiteWidgetVisibility;
}) {
  return (
    <div>
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </nav>
        <FooterPageContent
          page={page}
          initialWidgetVisibility={widgetVisibility}
        />
      </div>
    </div>
  );
}
