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
  const containerClassName =
    cfg.variant === "retail-two-row"
      ? "w-full px-0 pb-3 pt-0"
      : cfg.id === "classic"
      ? "px-10 pb-10 pt-0"
      : "w-full px-4 pb-3 pt-0 sm:px-6 lg:px-8";

  return (
    <section
      className="navbar-variant-test-scope relative z-40 border-b border-primary/20 bg-primary/5"
      aria-label="Saved navbar variant test"
    >
      <div className={containerClassName}>
        <div className="[&_img[alt*='logo']]:max-h-10 [&_img[alt*='logo']]:w-auto">
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
                ? cfg.links.map((l) => ({
                    id: l.id,
                    label: l.label,
                    url: l.url,
                    icon: l.icon,
                    linkType: l.linkType === "icon" ? "icon" : "label",
                    children: Array.isArray(l.children)
                      ? l.children.map((child) => ({
                          id: child.id,
                          label: child.label,
                          url: child.url,
                        }))
                      : [],
                  }))
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
            max-height: 40px;
            width: auto;
          }
          .navbar-variant-test-scope :global(nav a) {
            color: ${linkTextColor} !important;
          }
          .navbar-variant-test-scope :global(nav a:hover) {
            color: ${linkHoverColor} !important;
          }
        `}</style>
      </div>
    </section>
  );
}
