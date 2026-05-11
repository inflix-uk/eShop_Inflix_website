"use client";

import { useState } from "react";
import BlogNavbarWidget, {
  type NavbarWidgetContent,
} from "@/app/(routes)/blogs/new/[slug]/BlogNavbarWidget";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";
import NavbarCart from "@/app/components/navbar/NavbarCart";

interface NavbarVariantTestBarProps {
  config: NavbarVariantTestConfig | null;
}

export default function NavbarVariantTestBar({ config }: NavbarVariantTestBarProps) {
  const cfg = config;
  const [openCart, setOpenCart] = useState(false);
  const [, setCartItemCount] = useState(0);
  if (!cfg || cfg.showOnStorefront === false) return null;
  const linkTextColor = String(cfg.menuLinkTextColor || "#334155");
  const linkHoverColor = String(cfg.menuLinkHoverColor || "#0f172a");

  const variantsWithTopNudge = new Set([
    "modern",
    "minimalist",
    "dark-sidebar",
    "developer",
    "bold-left",
    "business",
  ]);
  const topNudgeClass =
    cfg.variant && variantsWithTopNudge.has(cfg.variant) ? "pt-2" : "pt-0";

  const containerClassName =
    cfg.variant === "retail-two-row"
      ? "w-full px-0 pb-3 pt-0"
      : cfg.id === "classic"
      ? `px-10 pb-10 ${topNudgeClass}`
      : `w-full px-4 pb-3 ${topNudgeClass} sm:px-6 lg:px-8`;

  const isRetailTwoRow = cfg.variant === "retail-two-row";
  const widthShellClass = isRetailTwoRow ? "w-full" : "mx-auto w-full max-w-6xl";

  const sticky = cfg.stickyNavbar === true;
  /** Retail top row uses `fixed` inside `BlogNavbarWidget`; avoid a second outer sticky wrapper. */
  const outerSticky = sticky && !isRetailTwoRow;

  return (
    <section
      className={
        outerSticky
          ? "navbar-variant-test-scope sticky top-0 z-50 w-full bg-white shadow-sm"
          : "navbar-variant-test-scope relative z-40 w-full bg-white"
      }
      aria-label="Saved navbar variant test"
    >
      <div className={widthShellClass}>
        <div className={containerClassName}>
          <div className="[&_img[alt*='logo']]:max-h-16 [&_img[alt*='logo']]:min-h-12 [&_img[alt*='logo']]:w-auto [&_img[alt*='logo']]:h-auto">
            <BlogNavbarWidget
              content={{
                layout: (cfg.id as "classic" | "centered" | "split" | "minimal") || "classic",
                variant:
                  (cfg.variant as
                    | "modern"
                    | "minimalist"
                    | "dark-sidebar"
                    | "developer"
                    | "bold-left"
                    | "business"
                    | "retail-two-row") || "modern",
                logoUrl: cfg.logoUrl,
                logoText: cfg.logoText,
                navbarBgColor: cfg.navbarBgColor,
                classicRightSectionBgColor: cfg.classicRightSectionBgColor,
                links: Array.isArray(cfg.links)
                  ? cfg.links.map((l) => {
                      const lt = String(l.linkType || "label").toLowerCase().replace(/-/g, "_");
                      const linkType =
                        lt === "icon"
                          ? "icon"
                          : lt === "icon_label"
                            ? "icon_label"
                            : "label";
                      return {
                      id: l.id,
                      label: l.label,
                      url: l.url,
                      icon: l.icon,
                      linkType,
                      children: Array.isArray(l.children)
                        ? l.children.map((child) => ({
                            id: child.id,
                            label: child.label,
                            url: child.url,
                          }))
                        : [],
                    };
                    })
                  : [],
                showSearch: cfg.showSearch,
                showButtons: cfg.showButtons,
                showPrimaryButton: cfg.showPrimaryButton,
                showSecondaryButton: cfg.showSecondaryButton,
                actionIcon1: cfg.actionIcon1,
                actionIcon2: cfg.actionIcon2,
                actionIcon1Url: cfg.actionIcon1Url,
                actionIcon2Url: cfg.actionIcon2Url,
                actionIcon1OpenCart: cfg.actionIcon1OpenCart,
                actionIcon2OpenCart: cfg.actionIcon2OpenCart,
                actionIcon1BgColor: cfg.actionIcon1BgColor,
                actionIcon1Color: cfg.actionIcon1Color,
                actionIcon2BgColor: cfg.actionIcon2BgColor,
                actionIcon2Color: cfg.actionIcon2Color,
                primaryButtonLabel: cfg.primaryButtonLabel,
                primaryButtonUrl: cfg.primaryButtonUrl,
                primaryButtonIcon: cfg.primaryButtonIcon,
                primaryButtonColor: cfg.primaryButtonColor,
                primaryButtonTextColor: cfg.primaryButtonTextColor,
                secondaryButtonLabel: cfg.secondaryButtonLabel,
                secondaryButtonUrl: cfg.secondaryButtonUrl,
                secondaryButtonIcon: cfg.secondaryButtonIcon,
                secondaryButtonColor: cfg.secondaryButtonColor,
                secondaryButtonTextColor: cfg.secondaryButtonTextColor,
                menuLinkTextColor: cfg.menuLinkTextColor,
                menuLinkHoverColor: cfg.menuLinkHoverColor,
                stickyNavbar: cfg.stickyNavbar === true,
                onOpenCart: () => setOpenCart(true),
              } as NavbarWidgetContent}
            />
          </div>
          <NavbarCart
            openCart={openCart}
            setOpenCart={setOpenCart}
            setCartItemCount={setCartItemCount}
          />
          <style jsx>{`
          .navbar-variant-test-scope :global(img[alt*="logo"]) {
            max-height: 4rem;
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
          }
          `}</style>
        </div>
      </div>
    </section>
  );
}
