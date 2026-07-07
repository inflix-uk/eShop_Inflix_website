"use client";

import { useState } from "react";
import BlogNavbarWidget from "@/app/(routes)/blogs/new/[slug]/BlogNavbarWidget";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";
import { SITE_ANNOUNCEMENT_TOP_OFFSET } from "@/app/components/AnnouncementBar";
import { parseStickyNavbarFlag } from "@/app/lib/parseStickyNavbarFlag";
import NavbarCart from "@/app/components/navbar/NavbarCart";
import { mapNavbarVariantConfigToWidgetContent } from "@/app/components/navbar/navbarVariantContent";

interface NavbarBusinessVariantBarProps {
  config: NavbarVariantTestConfig;
  serverBootstrapLogo?: { logoUrl: string | null; logoAlt?: string } | null;
}

/** Storefront Business navbar — full-bleed layout; colors come from BlogNavbarWidget only. */
export default function NavbarBusinessVariantBar({
  config,
  serverBootstrapLogo,
}: NavbarBusinessVariantBarProps) {
  const [openCart, setOpenCart] = useState(false);
  const [, setCartItemCount] = useState(0);
  const sticky = parseStickyNavbarFlag(config.stickyNavbar);

  return (
    <section
      className={
        sticky
          ? "navbar-business-variant-scope z-[90] w-full bg-white sticky shadow-sm"
          : "navbar-business-variant-scope relative z-[90] w-full bg-white"
      }
      style={sticky ? { top: SITE_ANNOUNCEMENT_TOP_OFFSET } : undefined}
      aria-label="Business navbar"
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
            .navbar-business-variant-scope :global(img[alt*="logo"]) {
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
