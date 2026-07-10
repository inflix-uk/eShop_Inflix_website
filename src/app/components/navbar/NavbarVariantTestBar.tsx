"use client";



import { useState } from "react";

import BlogNavbarWidget from "@/app/(routes)/blogs/new/[slug]/BlogNavbarWidget";

import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";

import { SITE_ANNOUNCEMENT_TOP_OFFSET } from "@/app/components/AnnouncementBar";

import { parseStickyNavbarFlag } from "@/app/lib/parseStickyNavbarFlag";

import NavbarCart from "@/app/components/navbar/NavbarCart";

import NavbarBusinessVariantBar from "@/app/components/navbar/NavbarBusinessVariantBar";
import NavbarBusiness2VariantBar from "@/app/components/navbar/NavbarBusiness2VariantBar";

import { mapNavbarVariantConfigToWidgetContent } from "@/app/components/navbar/navbarVariantContent";

interface NavbarVariantTestBarProps {

  config: NavbarVariantTestConfig | null;

  /** Same SSR logo as main `Nav` bootstrap when Product Central omits `logoUrl`. */

  serverBootstrapLogo?: { logoUrl: string | null; logoAlt?: string } | null;

  /** Admin draft preview — always render even when `showOnStorefront` is off. */

  forcePreview?: boolean;

}



export default function NavbarVariantTestBar({

  config,

  serverBootstrapLogo,

  forcePreview = false,

}: NavbarVariantTestBarProps) {

  const cfg = config;

  const [openCart, setOpenCart] = useState(false);

  const [, setCartItemCount] = useState(0);



  if (!cfg || (!forcePreview && cfg.showOnStorefront === false)) return null;



  if (cfg.variant === "business") {
    return (
      <NavbarBusinessVariantBar config={cfg} serverBootstrapLogo={serverBootstrapLogo} />
    );
  }

  if (cfg.variant === "business-2") {
    return (
      <NavbarBusiness2VariantBar config={cfg} serverBootstrapLogo={serverBootstrapLogo} />
    );
  }



  const linkTextColor = String(cfg.menuLinkTextColor || "#334155");

  const linkHoverColor = String(cfg.menuLinkHoverColor || "#0f172a");



  const variantsWithTopNudge = new Set([

    "modern",

    "minimalist",

    "dark-sidebar",

    "developer",

    "bold-left",

  ]);

  const topNudgeClass =

    cfg.variant && variantsWithTopNudge.has(cfg.variant) ? "pt-2" : "pt-0";



  const containerClassName =

    cfg.variant === "retail-two-row" ||

    cfg.variant === "wing-split" ||

    cfg.variant === "pill-black" ||

    cfg.variant === "bold-left"

      ? "w-full px-0 pt-0 pb-0"

      : cfg.id === "classic"

      ? "px-10 py-0"

      : `w-full px-4 pb-3 ${topNudgeClass} sm:px-6 lg:px-8`;



  const isRetailTwoRow = cfg.variant === "retail-two-row";

  const isFullBleedVariant =

    isRetailTwoRow ||

    cfg.variant === "wing-split" ||

    cfg.variant === "pill-black" ||

    cfg.variant === "bold-left";

  const widthShellClass = isFullBleedVariant ? "w-full" : "mx-auto w-full max-w-6xl";



  const sticky = parseStickyNavbarFlag(cfg.stickyNavbar);

  const outerSticky = sticky && !isRetailTwoRow;

  /** Below AnnouncementBar (z-[60]); retail pins its own fixed top row inside. */

  const outerZClass = isRetailTwoRow

    ? "navbar-variant-test-scope relative z-[50] w-full bg-white"

    : "navbar-variant-test-scope relative z-[90] w-full bg-white";



  return (

    <section

      className={

        outerSticky

          ? cfg.variant === "bold-left"

            ? `${outerZClass} sticky shadow-none md:shadow-sm`

            : `${outerZClass} sticky shadow-sm`

          : outerZClass

      }

      style={outerSticky ? { top: SITE_ANNOUNCEMENT_TOP_OFFSET } : undefined}

      aria-label="Saved navbar variant test"

    >

      <div className={widthShellClass}>

        <div className={containerClassName}>

          <div className="[&_img[alt*='logo']]:max-h-20 [&_img[alt*='logo']]:min-h-12 [&_img[alt*='logo']]:w-auto [&_img[alt*='logo']]:h-auto">

            <BlogNavbarWidget

              content={mapNavbarVariantConfigToWidgetContent(cfg, {

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

          .navbar-variant-test-scope :global(img[alt*="logo"]) {

            max-height: 5rem;

            min-height: 3rem;

            width: auto !important;

            height: auto !important;

            object-fit: contain;

          }

          @media (max-width: 767px) {

            .navbar-variant-test-scope :global(nav.nav-mobile-dark-drawer a[data-nav-link="1"]) {

              color: #e2e8f0 !important;

            }

            .navbar-variant-test-scope :global(nav.nav-mobile-dark-drawer a[data-nav-link="1"]:hover) {

              color: #ffffff !important;

            }

            .navbar-variant-test-scope :global(nav:not(.nav-mobile-dark-drawer) a[data-nav-link="1"]) {

              color: #0a0a0a !important;

            }

            .navbar-variant-test-scope :global(nav:not(.nav-mobile-dark-drawer) a[data-nav-link="1"]:hover) {

              color: #171717 !important;

            }

          }

          @media (min-width: 768px) {

            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]) {

              color: ${linkTextColor} !important;

            }

            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]:hover) {

              color: ${linkHoverColor} !important;

            }

            .navbar-variant-test-scope :global(nav a[data-nav-link="1"] span) {

              color: inherit !important;

            }

            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]:hover span) {

              color: inherit !important;

            }

            .navbar-variant-test-scope :global(nav a[data-nav-link="1"] svg),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"] i),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"] [data-nav-link-icon]),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"] [data-nav-link-icon] i),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"] [data-nav-flyout-label]),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"] span[data-nav-flyout-label]) {

              color: ${linkTextColor} !important;

            }

            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]:hover svg),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]:hover i),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]:hover [data-nav-link-icon]),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]:hover [data-nav-link-icon] i),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]:hover [data-nav-flyout-label]),
            .navbar-variant-test-scope :global(nav a[data-nav-link="1"]:hover span[data-nav-flyout-label]) {

              color: ${linkHoverColor} !important;

            }

          }

          `}</style>

        </div>

      </div>

    </section>

  );

}

