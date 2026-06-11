"use client";

import dynamic from "next/dynamic";
import type { FooterSettings } from "./footerTypes";

const Footer = dynamic(() => import("@/app/components/footer/footer"), {
  ssr: false,
  loading: () => (
    <footer className="bg-gray-100 py-12 mt-8" aria-hidden>
      <div className="max-w-7xl mx-auto px-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </footer>
  ),
});

type Props = {
  initialFooterSettings: FooterSettings | null;
  siteHostIsLocal: boolean;
  copyrightYear: number;
};

export default function FooterWrapper({
  initialFooterSettings,
  siteHostIsLocal,
  copyrightYear,
}: Props) {
  return (
    <Footer
      initialFooterSettings={initialFooterSettings ?? undefined}
      siteHostIsLocal={siteHostIsLocal}
      copyrightYear={copyrightYear}
    />
  );
}
