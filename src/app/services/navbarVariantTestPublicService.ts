import { cmsServerFetchJson } from "@/app/lib/cmsServerFetch";

export type NavbarVariantTestLink = {
  id?: string;
  label?: string;
  url?: string;
  icon?: string;
  linkType?: "label" | "icon" | "icon_label";
  children?: Array<{
    id?: string;
    label?: string;
    url?: string;
  }>;
};

export type NavbarVariantTestConfig = {
  id?: string;
  variant?: string;
  label?: string;
  navbarBgColor?: string;
  classicRightSectionBgColor?: string;
  logoText?: string;
  logoUrl?: string;
  showOnStorefront?: boolean;
  /**
   * When true: non-retail variants use a sticky test bar; **retail-two-row** pins only the top
   * row (logo/search/actions) for the full page scroll via `BlogNavbarWidget` `stickyNavbar`.
   */
  stickyNavbar?: boolean;
  showSearch?: boolean;
  showButtons?: boolean; // used as "show icons" for variant test flow
  showPrimaryButton?: boolean;
  showSecondaryButton?: boolean;
  actionIcon1?: string;
  actionIcon2?: string;
  actionIcon1Url?: string;
  actionIcon2Url?: string;
  actionIcon1OpenCart?: boolean;
  actionIcon2OpenCart?: boolean;
  actionIcon1BgColor?: string;
  actionIcon1Color?: string;
  actionIcon2BgColor?: string;
  actionIcon2Color?: string;
  primaryButtonLabel?: string;
  primaryButtonUrl?: string;
  primaryButtonIcon?: string;
  primaryButtonColor?: string;
  primaryButtonTextColor?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  secondaryButtonIcon?: string;
  secondaryButtonColor?: string;
  secondaryButtonTextColor?: string;
  menuLinkTextColor?: string;
  menuLinkHoverColor?: string;
  links?: NavbarVariantTestLink[];
};

export async function getNavbarVariantTestPublicServer(): Promise<NavbarVariantTestConfig | null> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) return null;
  try {
    const json = await cmsServerFetchJson<{
      success?: boolean;
      data?: { config?: NavbarVariantTestConfig | null };
    }>(`${base}/navbar-variant-test/public`);
    if (!json?.success) return null;
    return json.data?.config || null;
  } catch {
    return null;
  }
}
