"use client";

import { useEffect, useState } from "react";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";

export default function SlugRouteHeader() {
  const [navbarVariantTestConfig, setNavbarVariantTestConfig] =
    useState<NavbarVariantTestConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadNavbarVariantConfig = async () => {
      const base = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
      if (!base) return;
      try {
        const res = await fetch(`${base}/navbar-variant-test/public`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setNavbarVariantTestConfig(json?.data?.config || null);
        }
      } catch {
        if (!cancelled) setNavbarVariantTestConfig(null);
      }
    };
    void loadNavbarVariantConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <NavbarVariantTestBar config={navbarVariantTestConfig} />
  );
}
