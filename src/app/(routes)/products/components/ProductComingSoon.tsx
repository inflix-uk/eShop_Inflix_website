"use client";

import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import BreadCrumb from "@/app/components/common/Breadcrumb";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";

type ProductComingSoonProps = {
  productName: string;
  navbarVariantTestConfig?: NavbarVariantTestConfig | null;
};

export default function ProductComingSoon({
  productName,
  navbarVariantTestConfig = null,
}: ProductComingSoonProps) {
  const breadcrumb = [
    { name: "Products", link: "/categories", current: false },
    { name: productName || "Coming Soon", link: "#", current: true },
  ];

  return (
    <>
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      <BreadCrumb breadcrumb={breadcrumb} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-gray-500">
            Coming Soon
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {productName || "This product"}
          </h1>
          <p className="mt-4 text-base text-gray-600">
            This product is not available yet. Please check back soon.
          </p>
        </div>
      </main>
    </>
  );
}
