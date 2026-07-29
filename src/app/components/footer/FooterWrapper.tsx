"use client";

import dynamic from "next/dynamic";
import type { FooterSettings } from "./footerTypes";

const Footer = dynamic(() => import("@/app/components/footer/footer"), {
  ssr: false,
  loading: () => null,
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
