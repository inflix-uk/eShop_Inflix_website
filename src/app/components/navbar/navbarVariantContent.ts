import type { NavbarWidgetContent } from "@/app/(routes)/blogs/new/[slug]/BlogNavbarWidget";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";
import { parseStickyNavbarFlag } from "@/app/lib/parseStickyNavbarFlag";
import { DEFAULT_LOGO_ALT } from "@/lib/storeIdentity";

export function mapNavbarVariantConfigToWidgetContent(
  cfg: NavbarVariantTestConfig,
  options?: {
    serverBootstrapLogo?: { logoUrl: string | null; logoAlt?: string } | null;
    onOpenCart?: () => void;
  }
): NavbarWidgetContent {
  const effectiveLogoUrl =
    String(cfg.logoUrl || "").trim() ||
    String(options?.serverBootstrapLogo?.logoUrl || "").trim();
  const effectiveLogoText =
    String(cfg.logoText || "").trim() ||
    String(options?.serverBootstrapLogo?.logoAlt || "").trim() ||
    DEFAULT_LOGO_ALT;

  return {
    layout: (cfg.id as "classic" | "centered" | "split" | "minimal") || "classic",
    variant: (cfg.variant as NavbarWidgetContent["variant"]) || "modern",
    logoUrl: effectiveLogoUrl || undefined,
    logoText: effectiveLogoText,
    navbarBgColor: cfg.navbarBgColor,
    classicRightSectionBgColor: cfg.classicRightSectionBgColor,
    links: Array.isArray(cfg.links)
      ? cfg.links.map((l) => {
          const lt = String(l.linkType || "label").toLowerCase().replace(/-/g, "_");
          const linkType =
            lt === "icon" ? "icon" : lt === "icon_label" ? "icon_label" : "label";
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
    stickyNavbar: parseStickyNavbarFlag(cfg.stickyNavbar),
    onOpenCart: options?.onOpenCart,
  };
}
