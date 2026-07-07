"use client";

import { useState } from "react";
import BlogNavbarWidget from "@/app/(routes)/blogs/new/[slug]/BlogNavbarWidget";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";
import { SITE_ANNOUNCEMENT_TOP_OFFSET } from "@/app/components/AnnouncementBar";
import { parseStickyNavbarFlag } from "@/app/lib/parseStickyNavbarFlag";
import NavbarCart from "@/app/components/navbar/NavbarCart";
import { mapNavbarVariantConfigToWidgetContent } from "@/app/components/navbar/navbarVariantContent";

interface NavbarBusiness2VariantBarProps {
  config: NavbarVariantTestConfig;
  serverBootstrapLogo?: { logoUrl: string | null; logoAlt?: string } | null;
}

/** Storefront Business-2 navbar — full-bleed bar color from admin `navbarBgColor`. */
export default function NavbarBusiness2VariantBar({
  config,
  serverBootstrapLogo,
}: NavbarBusiness2VariantBarProps) {
  const [openCart, setOpenCart] = useState(false);
  const [, setCartItemCount] = useState(0);
  const sticky = parseStickyNavbarFlag(config.stickyNavbar);
  const barColor = String(config.navbarBgColor || "").trim() || "#000000";
  const barBgStyle = { backgroundColor: barColor };

  return (
    <section
      className={
        sticky
          ? "navbar-business-2-variant-scope z-[90] w-full sticky shadow-sm"
          : "navbar-business-2-variant-scope relative z-[90] w-full"
      }
      style={{
        ...barBgStyle,
        ...(sticky ? { top: SITE_ANNOUNCEMENT_TOP_OFFSET } : {}),
      }}
      aria-label="Business-2 navbar"
    >
      <div className="w-full">
        <div className="w-full px-0 pt-0 pb-0">
          <div className="[&_img[alt*='logo']]:max-h-20 [&_img[alt*='logo']]:min-h-12 [&_img[alt*='logo']]:w-auto [&_img[alt*='logo']]:h-auto">
            <BlogNavbarWidget
              content={mapNavbarVariantConfigToWidgetContent(config, {
                serverBootstrapLogo,
                onOpenCart: () => setOpenCart(true),
              })}
            />
          </div>
          <NavbarCart
            openCart={openCart}
            setOpenCart={setOpenCart}
            setCartItemCount={setCartItemCount}
          />
          <style jsx>{`
            .navbar-business-2-variant-scope :global(img[alt*="logo"]) {
              max-height: 5rem;
              min-height: 3rem;
              width: auto !important;
              height: auto !important;
              object-fit: contain;
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}
