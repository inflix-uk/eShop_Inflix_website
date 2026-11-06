"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactNode } from "react";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";

const NavbarVariantTestBar = dynamic(
  () => import("@/app/components/navbar/NavbarVariantTestBar"),
  {
    ssr: false,
    loading: () => (
      <div className="h-16 w-full bg-white" aria-hidden="true" />
    ),
  }
);

/**
 * Navbar stays client-only. Page body is passed in from the server page so the
 * HTML/CSS widget is in the initial HTML for crawlers.
 */
export default function PolicyCmsPageClient({
  navbarVariantTestConfig,
  children,
}: {
  navbarVariantTestConfig: NavbarVariantTestConfig | null;
  children: ReactNode;
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
        {children}
      </div>
    </div>
  );
}
