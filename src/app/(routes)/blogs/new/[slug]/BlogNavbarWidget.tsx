"use client";
import {
  FiMenu,
  FiX,
  FiChevronDown,
  FiSearch,
} from "react-icons/fi";
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaTiktok,
  FaWhatsapp,
  FaPinterest,
} from "react-icons/fa";
import { GiFlame } from "react-icons/gi";
import {
  createNavbarIconSlot,
  DEFAULT_NAVBAR_FLATICON,
  NavbarIcon,
  useFlaticonStylesheets,
} from "@/app/lib/navbarFlaticonIcon";
import { resolveCmsApiBase } from "@/app/lib/cmsApiBase";
import { getLogoUrl } from "@/app/services/logoService";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import NavbarSearch from "@/app/components/navbar/NavbarSearch";
import { SITE_ANNOUNCEMENT_TOP_OFFSET } from "@/app/components/AnnouncementBar";
import { parseStickyNavbarFlag } from "@/app/lib/parseStickyNavbarFlag";
import { useAuth } from "@/app/context/Auth";
import Link from "next/link";
import type { IconType } from "react-icons";



type NavbarLinkItem = {
  id?: string;
  label?: string;
  url?: string;
  icon?: string;
  /** `icon_label` shows Flaticon code from `icon` plus visible `label` text. */
  linkType?: "label" | "icon" | "icon_label";
  children?: Array<{
    id?: string;
    label?: string;
    url?: string;
  }>;
};

export type NavbarWidgetContent = {
  layout?: "classic" | "centered" | "split" | "minimal";
  variant?:
    | "modern"
    | "minimalist"
    | "dark-sidebar"
    | "developer"
    | "bold-left"
    | "business"
    | "business-2"
    | "retail-two-row"
    | "wing-split"
    | "pill-black";
  logoUrl?: string;
  logoText?: string;
  links?: NavbarLinkItem[];
  showSearch?: boolean;
  showButtons?: boolean; // variant flow uses this as "show icons"
  showPrimaryButton?: boolean;
  showSecondaryButton?: boolean;
  actionIcon1?: string;
  actionIcon2?: string;
  actionIcon1Url?: string;
  actionIcon2Url?: string;
  actionIcon1OpenCart?: boolean;
  actionIcon2OpenCart?: boolean;
  onOpenCart?: () => void;
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
  navbarBgColor?: string;
  classicRightSectionBgColor?: string;
  /** Retail two-row only: when true, logo/search/actions row stays pinned to viewport (admin “Sticky navbar”). */
  stickyNavbar?: boolean;
};

/** Social / brand icons still resolved via react-icons when saved by code name. */
const NAVBAR_REACT_ICON_MAP: Record<string, IconType> = {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaTiktok,
  FaWhatsapp,
  FaPinterest,
  GiFlame,
};

function resolveHref(raw?: string): string {
  const value = String(raw || "").trim();
  if (!value) return "#";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
}

const CUSTOMER_DASHBOARD_HREF = "/customer/dashboard";

/**
 * Second action slot is normally account/profile. When logged in, ignore admin CMS URL
 * and send users to the storefront customer dashboard.
 */
function resolveActionIcon2UrlForSession(
  content: NavbarWidgetContent | undefined,
  isLoggedIn: boolean
): string | undefined {
  if (!content) return undefined;
  if (content.actionIcon2OpenCart === true) {
    return content.actionIcon2Url;
  }
  if (isLoggedIn) {
    return CUSTOMER_DASHBOARD_HREF;
  }
  return content.actionIcon2Url || "/login";
}

function LogoHomeLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/"
      prefetch={false}
      aria-label="Home"
      className={
        className ??
        "inline-flex shrink-0 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      }
    >
      {children}
    </Link>
  );
}

/** Logo image dimensions — wide logos (e.g. 330×140) need taller display + wider slot. */
const NAV_LOGO_IMG_CLASS =
  "h-12 w-auto max-w-full object-contain object-left sm:h-14 md:h-16 md:max-h-[4.5rem] md:w-full md:object-left lg:max-h-[5rem]";
/** Width cap on small screens; desktop column fits ~330×140 assets at ~2.35:1. */
const NAV_LOGO_WRAPPER_CLASS =
  "flex min-w-0 max-w-[52%] items-center gap-2.5 md:w-[24%] md:min-w-[180px] md:max-w-[280px] lg:max-w-[320px] md:shrink-0";
const NAV_LOGO_LINK_INNER_CLASS =
  "inline-flex w-full min-w-0 items-center justify-start rounded-md";
/** Centered logo inside a round slot (NavbarWingSplit) — no `object-left` / `md:w-full` clipping. */
const NAV_LOGO_LINK_CIRCLE_CLASS =
  "inline-flex h-full w-full min-w-0 max-h-full max-w-full items-center justify-center rounded-md p-0.5 sm:p-1";
const NAV_LOGO_IMG_CIRCLE_CLASS =
  "mx-auto block h-auto w-auto max-h-full max-w-full object-contain object-center";
const NAV_LOGO_PLACEHOLDER_CIRCLE_CLASS =
  "mx-auto aspect-square h-full max-h-full w-auto max-w-full shrink-0 rounded-full bg-transparent";

const NAVBAR_WIDGET_PUBLIC_LOGO_SESSION_KEY = "navbarWidgetPublicLogoUrl";

function extractPublicLogoPathFromJson(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const key of ["logoUrl", "url", "image", "src"] as const) {
      const v = d[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  for (const key of ["logoUrl", "url"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function getNavbarLogoApiBase(): string {
  return resolveCmsApiBase();
}

function buildNavbarPublicLogoFetchUrls(apiBase: string): string[] {
  const base = apiBase.replace(/\/+$/, "");
  const unique: string[] = [];
  const add = (u: string) => {
    const t = u.trim();
    if (!t || unique.includes(t)) return;
    unique.push(t);
  };
  if (base) {
    add(`${base}/get/logo/public`);
    add(`${base}/api/get/logo/public`);
    add(`${base}/admin/logo`);
    add(`${base}/api/admin/logo`);
    add(`${base}/get/logo`);
    add(`${base}/api/get/logo`);
    return unique;
  }
  const sameOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin.replace(/\/+$/, "")
      : "";
  if (sameOrigin) {
    add(`${sameOrigin}/get/logo/public`);
    add(`${sameOrigin}/api/get/logo/public`);
    add(`${sameOrigin}/admin/logo`);
    add(`${sameOrigin}/api/admin/logo`);
  }
  return unique;
}

function NavbarWidgetLogo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const url = String(src || "").trim();
  const imgRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!url) {
      setVisible(false);
      return;
    }
    if (img?.complete && img.naturalWidth > 0) {
      setVisible(true);
      return;
    }
    setVisible(false);
  }, [url]);

  if (!url) return null;
  return (
    <img
      ref={imgRef}
      src={url}
      alt={alt}
      className={`${className ?? ""} ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ transition: "opacity 120ms ease-out" }}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      onLoad={() => setVisible(true)}
    />
  );
}

/** Reserved logo slot — static (no pulse) to avoid visible flash before image paints. */
const NAV_LOGO_PLACEHOLDER_CLASS =
  "block h-12 w-[min(100%,10rem)] max-w-[160px] shrink-0 rounded-md bg-transparent sm:h-14 md:h-16 md:max-h-[4.5rem] lg:max-h-[5rem]";

function NavbarLogoHomeSlot({
  logoUrl,
  logoText,
  layout = "default",
}: {
  logoUrl: string;
  logoText: string;
  /** `circle` — logo scales to fit inside a circular frame (fully visible). */
  layout?: "default" | "circle";
}) {
  const alt = logoText.trim() ? `${logoText} logo` : "Store logo";
  const linkClass = layout === "circle" ? NAV_LOGO_LINK_CIRCLE_CLASS : NAV_LOGO_LINK_INNER_CLASS;
  const imgClass = layout === "circle" ? NAV_LOGO_IMG_CIRCLE_CLASS : NAV_LOGO_IMG_CLASS;
  const placeholderClass =
    layout === "circle" ? NAV_LOGO_PLACEHOLDER_CIRCLE_CLASS : NAV_LOGO_PLACEHOLDER_CLASS;
  return (
    <LogoHomeLink className={linkClass}>
      {logoUrl ? (
        <NavbarWidgetLogo src={logoUrl} alt={alt} className={imgClass} />
      ) : (
        <span className={placeholderClass} aria-hidden />
      )}
    </LogoHomeLink>
  );
}

/** Primary/secondary CTAs: avoid extreme stadium pills when label is long (was rounded-full + fixed h). */
const NAVBAR_CTA_SM =
  "inline-flex min-h-9 max-w-full shrink items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-xs font-semibold leading-snug";
const NAVBAR_CTA_MD =
  "inline-flex min-h-9 max-w-full shrink items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-sm font-semibold leading-snug sm:min-h-10";
/** Business desktop: one shared row height for nav pill, icons, CTAs, search. */
/** Business bg strip height. */
const NAVBAR_BUSINESS_ROW_H = "h-[42px] min-h-[58px] max-h-[56px]";
/** Business-2: +5px vs business strip so in-bar logo is not flush to the top edge. */
const NAVBAR_BUSINESS2_ROW_H = "h-[64px] min-h-[64px] max-h-[64px]";
/** Buttons/icons sit shorter inside the strip (not flush to strip edges). */
const NAVBAR_BUSINESS_BTN_H = "h-8 min-h-8 max-h-8";
/** Primary/secondary CTAs: taller so they sit flush with the strip. */
const NAVBAR_BUSINESS_CTA_H = "h-[32px] min-h-[35px] max-h-[40px]";
/** Business desktop: compact single-row CTAs beside search/icons. */
const NAVBAR_BUSINESS_CTA_CLASS =
  `inline-flex ${NAVBAR_BUSINESS_CTA_H} min-w-0 max-w-[7rem] shrink items-center justify-center gap-0.5 whitespace-nowrap rounded-md px-2 py-0 text-[9px] font-semibold leading-none shadow-sm sm:max-w-[8rem] sm:gap-1 sm:px-2.5 sm:text-[10px] lg:max-w-[9rem] lg:text-[11px]`;
/** Dark overlay inside the admin-colored strip (right zone, slanted left edge). */
const NAVBAR_BUSINESS_STRIP_RIGHT_BG = "rgba(0, 0, 0, 0.8)";
/** Slanted left edge: bottom extends further left than top (matches reference). */
const NAVBAR_BUSINESS_STRIP_RIGHT_CLIP =
  "polygon(1.35rem 0, 100% 0, 100% 100%, 0 100%)";
/** Width covers buttons area only — increase if buttons overflow. */
const NAVBAR_BUSINESS_STRIP_RIGHT_W =
  "w-[calc(37%+1.35rem)] min-w-[calc(16rem+1.35rem)]";

/** Business strip — slightly tighter row but still readable. */
const NAVBAR_MENU_LINK_BUSINESS =
  "text-xs font-medium leading-snug sm:text-sm";
/** Business-2 — slightly larger nav labels than Business. */
const NAVBAR_MENU_LINK_BUSINESS2 =
  "text-sm font-medium leading-snug sm:text-[15px] lg:text-[16px]";

/** Developer dark pill: keep CTAs on one row with icon rail. */
const NAVBAR_DEVELOPER_CTA_CLASS =
  "inline-flex h-8 min-w-0 max-w-[8.5rem] shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-semibold leading-tight sm:max-w-[10rem] sm:gap-1.5 sm:px-2.5 sm:text-[11px] md:max-w-[11rem] md:text-xs";

const CartCountContext = createContext<number>(0);
const CartSubtotalContext = createContext<number>(0);

function getCartItemCountFromStorage(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("cart");
    const cart = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((sum, item) => {
      const qty = Number(item?.qty);
      return sum + (Number.isFinite(qty) && qty > 0 ? qty : 1);
    }, 0);
  } catch {
    return 0;
  }
}

function getCartSubtotalFromStorage(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("cart");
    const cart = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((sum, item) => {
      const qty = Number(item?.qty);
      const salePrice = Number(item?.salePrice);
      const normalizedQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
      const normalizedPrice = Number.isFinite(salePrice) ? salePrice : 0;
      return sum + normalizedQty * normalizedPrice;
    }, 0);
  } catch {
    return 0;
  }
}

function isLikelyCartTarget(href?: string, openCartOnClick?: boolean): boolean {
  if (openCartOnClick) return true;
  const normalized = String(href || "").toLowerCase().trim();
  if (!normalized) return false;
  return (
    normalized.includes("cart") ||
    normalized.includes("checkout") ||
    normalized.includes("basket")
  );
}

function ActionIconLink({
  href,
  openCartOnClick,
  onOpenCart,
  onClick,
  className,
  style,
  title,
  children,
}: {
  href?: string;
  openCartOnClick?: boolean;
  onOpenCart?: () => void;
  onClick?: () => void;
  className: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}) {
  const cartItemCount = useContext(CartCountContext);
  const showCartCount = isLikelyCartTarget(href, openCartOnClick) && cartItemCount > 0;
  const countLabel = cartItemCount > 99 ? "99+" : String(cartItemCount);

  if (openCartOnClick) {
    return (
      <button
        type="button"
        className={`${className} relative`}
        style={style}
        title={title}
        onClick={() => {
          onClick?.();
          onOpenCart?.();
        }}
      >
        {children}
        {showCartCount ? (
          <span className="absolute -right-1 -top-1 z-[1] flex min-h-4 min-w-[16px] max-w-none items-center justify-center whitespace-nowrap rounded-full bg-orange-500 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
            {countLabel}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <a
      href={resolveHref(href)}
      className={`${className} relative`}
      style={style}
      title={title}
      onClick={onClick}
    >
      {children}
      {showCartCount ? (
        <span className="absolute -right-1 -top-1 z-[1] flex min-h-4 min-w-[16px] max-w-none items-center justify-center whitespace-nowrap rounded-full bg-orange-500 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
          {countLabel}
        </span>
      ) : null}
    </a>
  );
}

function resolvePrimaryButtonStyle(content?: NavbarWidgetContent): CSSProperties | undefined {
  if (!content) return undefined;
  const style: CSSProperties = {};
  if (content.primaryButtonColor) style.backgroundColor = content.primaryButtonColor;
  if (content.primaryButtonTextColor) style.color = content.primaryButtonTextColor;
  return Object.keys(style).length ? style : undefined;
}

function resolveSecondaryButtonStyle(content?: NavbarWidgetContent): CSSProperties | undefined {
  if (!content) return undefined;
  const style: CSSProperties = {};
  if (content.secondaryButtonColor) style.backgroundColor = content.secondaryButtonColor;
  if (content.secondaryButtonTextColor) style.color = content.secondaryButtonTextColor;
  return Object.keys(style).length ? style : undefined;
}

function resolveActionIconButtonStyle(
  content: NavbarWidgetContent | undefined,
  slot: 1 | 2
): CSSProperties | undefined {
  if (!content) return undefined;
  const bg = slot === 1 ? content.actionIcon1BgColor : content.actionIcon2BgColor;
  const fg = slot === 1 ? content.actionIcon1Color : content.actionIcon2Color;
  const style: CSSProperties = {};
  if (bg) style.backgroundColor = bg;
  if (fg) style.color = fg;
  return Object.keys(style).length ? style : undefined;
}

function resolveAssetSrc(raw?: string): string {
  return getLogoUrl(raw) || "";
}

function linkTypeNormalized(link: NavbarLinkItem | undefined): string {
  return String(link?.linkType || "label").toLowerCase().replace(/-/g, "_");
}

function isIconOnlyLink(link: NavbarLinkItem): boolean {
  return linkTypeNormalized(link) === "icon";
}

function isIconLabelLink(link: NavbarLinkItem): boolean {
  return linkTypeNormalized(link) === "icon_label";
}

function navLinkAriaLabel(link: NavbarLinkItem): string {
  return String(link?.label || link?.url || "Link").trim() || "Link";
}

function renderNavLinkContent(link: NavbarLinkItem, fallback = DEFAULT_NAVBAR_FLATICON) {
  if (isIconOnlyLink(link)) {
    return (
      <NavbarIcon
        code={link?.icon}
        className="h-4 w-4 text-current"
        fallback={fallback}
        reactIconMap={NAVBAR_REACT_ICON_MAP}
      />
    );
  }
  if (isIconLabelLink(link)) {
    const text = link?.label?.trim() || "";
    return (
      <span className="inline-flex max-w-full min-w-0 items-center gap-2.5 sm:gap-3">
        <NavbarIcon
          code={link?.icon}
          className="h-5 w-5 shrink-0 text-current"
          fallback={fallback}
          reactIconMap={NAVBAR_REACT_ICON_MAP}
        />
        {text ? <span className="min-w-0 font-medium">{text}</span> : null}
      </span>
    );
  }
  return link?.label || "";
}

function getDropdownChildren(link: NavbarLinkItem) {
  return (Array.isArray(link?.children) ? link.children : []).filter(
    (child) => String(child?.label || "").trim() && String(child?.url || "").trim()
  );
}

/** Touch-friendly expand/collapse for nav links with children (mobile drawer). */
function NavLinkItemMobileAccordion({
  link,
  i,
  linkClassName,
  fallbackIcon = DEFAULT_NAVBAR_FLATICON,
  onNavigate,
}: {
  link: NavbarLinkItem;
  i: number;
  linkClassName: string;
  fallbackIcon?: string;
  onNavigate?: () => void;
}) {
  const children = getDropdownChildren(link);
  const [open, setOpen] = useState(false);
  const subId = `nav-drawer-sub-${String(link.id ?? i)}`;
  const showAria = isIconOnlyLink(link) || (isIconLabelLink(link) && !String(link?.label || "").trim());
  const aria = navLinkAriaLabel(link);
  const submenuLabel = String(link.label || "Category").trim() || "Category";

  return (
    <div className="relative">
      <div className="flex w-full min-w-0 items-stretch gap-1">
        <a
          href={resolveHref(link.url)}
          data-nav-link="1"
          className={`${linkClassName} min-w-0 flex-1 text-left`}
          onClick={onNavigate}
          aria-label={showAria ? aria : undefined}
        >
          {renderNavLinkContent(link, fallbackIcon)}
        </a>

        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center self-stretch rounded-md px-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary"
          aria-expanded={open}
          aria-controls={subId}
          aria-label={open ? `Hide ${submenuLabel} sublinks` : `Show ${submenuLabel} sublinks`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <FiChevronDown
            className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden
            strokeWidth={2}
          />
        </button>
      </div>
      <div
        id={subId}
        role="region"
        aria-label={`${String(link.label || "Category").trim()} sublinks`}
        className={`ml-2 mt-2 flex flex-col gap-1.5 py-1 pl-3 ${open ? "" : "hidden"}`}
      >
        {children.map((child, childIndex) => (
          <a
            key={child.id || `${link.id || i}-child-${childIndex}`}
            href={resolveHref(child.url)}
            onClick={onNavigate}
            className="py-2 text-[15px] font-medium text-slate-700 transition hover:text-slate-900"
          >
            {child.label}
          </a>
        ))}
      </div>
    </div>
  );
}

const NAV_FLYOUT_HOVER_CLOSE_MS = 180;

function NavLinkItemNode({
  link,
  i,
  linkClassName,
  fallbackIcon = DEFAULT_NAVBAR_FLATICON,
  onNavigate,
  touchExpandable = false,
  bodyPortalFlyout = false,
  compact = false,
  nowrap = false,
}: {
  link: NavbarLinkItem;
  i: number;
  linkClassName: string;
  fallbackIcon?: string;
  onNavigate?: () => void;
  /** When true, links with children use tap-to-expand instead of hover flyout (required in mobile drawers). */
  touchExpandable?: boolean;
  /**
   * When true (NavbarWingSplit desktop), the flyout renders in `document.body` with `position: fixed` so it
   * stacks above in-page heroes/banners and survives hover moves without losing the group.
   */
  bodyPortalFlyout?: boolean;
  /** Tighter label + chevron spacing (business navbar). */
  compact?: boolean;
  /** Keep label on one line (retail-two-row links bar). */
  nowrap?: boolean;
}) {
  const flyoutTriggerGap = compact ? "gap-1" : "gap-4";
  const flyoutRowClass = nowrap
    ? `flex shrink-0 items-center justify-between ${flyoutTriggerGap}`
    : `flex w-full min-w-0 items-center justify-between ${flyoutTriggerGap}`;
  const flyoutLabelClass = nowrap ? "shrink-0" : "min-w-0 flex-1";
  const flyoutChevronClass = compact
    ? "h-3.5 w-3.5 shrink-0 text-current opacity-80"
    : "h-5 w-5 shrink-0 text-current opacity-70";
  const children = getDropdownChildren(link);
  const aria = navLinkAriaLabel(link);
  const showAria = isIconOnlyLink(link) || (isIconLabelLink(link) && !String(link?.label || "").trim());
  const flyoutPanelId = useMemo(
    () => `nav-flyout-${String(link.id || i).replace(/\W/g, "")}-${i}`,
    [link.id, i]
  );

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0, minWidth: 220, overlap: 10 });

  const clearHoverClose = () => {
    if (hoverCloseTimer.current != null) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const scheduleHoverClose = () => {
    clearHoverClose();
    hoverCloseTimer.current = setTimeout(() => setFlyoutOpen(false), NAV_FLYOUT_HOVER_CLOSE_MS);
  };

  const openFlyout = () => {
    clearHoverClose();
    setFlyoutOpen(true);
  };

  const updateFlyoutPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const minWidth = Math.max(220, r.width);
    const margin = 8;
    const overlap = 10;
    let left = r.left;
    if (left + minWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - minWidth);
    }
    setFlyoutPos({ top: r.bottom - overlap, left, minWidth, overlap });
  }, []);

  useLayoutEffect(() => {
    if (!bodyPortalFlyout || !flyoutOpen) return;
    updateFlyoutPosition();
    const sync = () => updateFlyoutPosition();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [bodyPortalFlyout, flyoutOpen, updateFlyoutPosition]);

  useEffect(() => {
    return () => clearHoverClose();
  }, []);

  useEffect(() => {
    if (!bodyPortalFlyout || !flyoutOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlyoutOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bodyPortalFlyout, flyoutOpen]);

  const onTriggerBlur = (e: FocusEvent<HTMLAnchorElement>) => {
    if (!bodyPortalFlyout) return;
    requestAnimationFrame(() => {
      const panel = document.getElementById(flyoutPanelId);
      const next = e.relatedTarget as Node | null;
      if (next && (panel?.contains(next) || triggerRef.current?.contains(next))) return;
      if (panel?.contains(document.activeElement)) return;
      setFlyoutOpen(false);
    });
  };

  const flyoutLinkClass =
    "group/item flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-800 transition-all duration-200 hover:bg-slate-100 hover:text-slate-950 hover:translate-x-1";

  const flyoutInner = (
    <div
      data-nav-flyout-panel
      className={`min-w-[220px] w-full overflow-hidden rounded-md border border-slate-200/90 p-2 shadow-[0_16px_48px_rgba(15,23,42,0.18)] ${
        bodyPortalFlyout ? "bg-white backdrop-blur-xl" : "bg-white/95 backdrop-blur-xl"
      }`}
    >
      {children.map((child, childIndex) => (
        <a
          key={child.id || `${link.id || i}-child-${childIndex}`}
          href={resolveHref(child.url)}
          onClick={onNavigate}
          className={flyoutLinkClass}
        >
          <span>{child.label}</span>
          <svg
            className="h-4 w-4 opacity-0 transition-all duration-200 group-hover/item:translate-x-1 group-hover/item:opacity-100"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      ))}
    </div>
  );

  if (children.length === 0) {
    return (
      <a
        key={link.id || i}
        href={resolveHref(link.url)}
        data-nav-link="1"
        className={linkClassName}
        onClick={onNavigate}
        aria-label={showAria ? aria : undefined}
      >
        {renderNavLinkContent(link, fallbackIcon)}
      </a>
    );
  }

  if (touchExpandable) {
    return (
      <NavLinkItemMobileAccordion
        link={link}
        i={i}
        linkClassName={linkClassName}
        fallbackIcon={fallbackIcon}
        onNavigate={onNavigate}
      />
    );
  }

  if (bodyPortalFlyout) {
    return (
      <div
        key={link.id || i}
        className="relative"
        onMouseEnter={() => {
          openFlyout();
          updateFlyoutPosition();
        }}
        onMouseLeave={scheduleHoverClose}
      >
        <a
          ref={triggerRef}
          href={resolveHref(link.url)}
          data-nav-link="1"
          className={linkClassName}
          onClick={onNavigate}
          aria-expanded={flyoutOpen}
          aria-haspopup="true"
          aria-controls={flyoutPanelId}
          aria-label={showAria ? aria : undefined}
          onFocus={() => {
            openFlyout();
            updateFlyoutPosition();
          }}
          onBlur={onTriggerBlur}
        >
          <span className={flyoutRowClass}>
            <span className={flyoutLabelClass}>{renderNavLinkContent(link, fallbackIcon)}</span>
            <FiChevronDown
              className={`${flyoutChevronClass} transition-transform duration-200 ${
                flyoutOpen ? "rotate-180" : ""
              }`}
              aria-hidden
              strokeWidth={2}
            />
          </span>
        </a>
        {flyoutOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              id={flyoutPanelId}
              role="menu"
              className="fixed z-[9990]"
              style={{
                top: flyoutPos.top,
                left: flyoutPos.left,
                minWidth: flyoutPos.minWidth,
                paddingTop: flyoutPos.overlap,
              }}
              onMouseEnter={clearHoverClose}
              onMouseLeave={scheduleHoverClose}
            >
              {flyoutInner}
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div key={link.id || i} className={`group relative${nowrap ? " shrink-0" : ""}`}>
      <a
        href={resolveHref(link.url)}
        data-nav-link="1"
        className={linkClassName}
        onClick={onNavigate}
        aria-label={showAria ? aria : undefined}
      >
        <span className={flyoutRowClass}>
          <span className={flyoutLabelClass}>{renderNavLinkContent(link, fallbackIcon)}</span>
          <FiChevronDown className="h-5 w-5 shrink-0 text-slate-400" aria-hidden strokeWidth={2} />
        </span>
      </a>
      <div className="absolute left-0 top-full z-[150] hidden pt-1 group-hover:block group-focus-within:block">
        {flyoutInner}
      </div>
    </div>
  );
}

/** Right-side slide panel for mobile; desktop unchanged (`md:hidden` on trigger + drawer). */
function NavbarMobileDrawer({
  open,
  onClose,
  panelClassName,
  headerClassName,
  closeButtonClassName,
  children,
}: {
  open: boolean;
  onClose: () => void;
  panelClassName: string;
  headerClassName: string;
  closeButtonClassName: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu overlay" : undefined}
        aria-hidden={!open}
        className={`fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${open ? "" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[201] flex max-h-[100dvh] w-[min(100vw-0.75rem,24rem)] flex-col overflow-y-auto border-l border-slate-200/90 bg-[#f8f9fb] text-slate-900 shadow-[0_25px_80px_-16px_rgba(15,23,42,0.28)] transition-transform duration-300 ease-out md:hidden ${panelClassName} ${open ? "translate-x-0" : "pointer-events-none translate-x-full"}`}
      >
        <div
          className={`flex shrink-0 flex-col gap-1 border-b border-slate-200/80 bg-white px-6 pb-5 pt-6 ${headerClassName}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
            
              <h2 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-slate-900">Menu</h2>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={onClose}
              className={`shrink-0 rounded-full border border-slate-200/90 bg-slate-50 p-2.5 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 ${closeButtonClassName}`}
            >
              <FiX className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-8 px-6 pb-10 pt-7">{children}</div>
      </div>
    </>
  );
}

function NavbarModern({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const actionIcon1Style: CSSProperties | undefined =
    content?.actionIcon1BgColor || content?.actionIcon1Color
      ? {
          ...(content?.actionIcon1BgColor
            ? { backgroundColor: content.actionIcon1BgColor }
            : {}),
          ...(content?.actionIcon1Color ? { color: content.actionIcon1Color } : {}),
        }
      : undefined;
  const actionIcon2Style: CSSProperties | undefined =
    content?.actionIcon2BgColor || content?.actionIcon2Color
      ? {
          ...(content?.actionIcon2BgColor
            ? { backgroundColor: content.actionIcon2BgColor }
            : {}),
          ...(content?.actionIcon2Color ? { color: content.actionIcon2Color } : {}),
        }
      : undefined;
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton === true;
  const showSecondaryButton = content?.showSecondaryButton === true;
  const primaryCtaLabel = content?.primaryButtonLabel?.trim() || "";
  const secondaryCtaLabel = content?.secondaryButtonLabel?.trim() || "";
  const hasRightEndContent =
    showSearch || showIcons || showPrimaryButton || showSecondaryButton;
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  const sectionStyle = content?.layout === "classic" ? undefined : navbarBgStyle;
  const isClassicLayout = content?.layout === "classic";
  const classicRightSectionBgStyle = content?.classicRightSectionBgColor
    ? { backgroundColor: content.classicRightSectionBgColor }
    : undefined;
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  return (
    <section
      className={`pt-1 pb-2 ${
        isClassicLayout
          ? "w-full px-0 sm:px-0"
          : "w-full px-3 sm:px-10"
      }`}
      style={sectionStyle}
    >

      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-3">

        {/* ================= LEFT: LOGO + mobile menu ================= */}
        <div className="flex w-full shrink-0 items-center justify-between md:w-auto md:justify-start">
          <div className={NAV_LOGO_WRAPPER_CLASS}>
            <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
          </div>
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-800 md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <FiMenu className="h-6 w-6" aria-hidden />
          </button>
        </div>

        {/* ================= RIGHT: MENU (desktop) — grid avoids nav/search/CTA overlap ================= */}
        <div
          className={`hidden w-full min-w-0 rounded-2xl bg-[#DEE3DE] px-2 py-1.5 sm:px-4 sm:py-1.5 md:px-3 md:py-1.5 lg:px-4 lg:py-1.5 overflow-visible md:w-auto md:max-w-full ${
            hasRightEndContent
              ? "md:grid md:grid-cols-[minmax(0,auto)_auto_minmax(0,auto)] md:items-center md:gap-2"
              : "md:flex md:items-center md:justify-center"
          } ${isClassicLayout ? "md:ml-auto md:min-w-0" : "md:min-w-0"}`}
          style={classicRightSectionBgStyle}
        >
          {hasRightEndContent ? (
            <>
              <nav className="flex min-w-0 flex-nowrap items-center justify-self-start gap-3 overflow-x-auto md:gap-4">
                {links.map((link, i) => (
                  <NavLinkItemNode
                    key={link.id || i}
                    link={link}
                    i={i}
                    fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                    linkClassName="shrink-0 whitespace-nowrap text-[15px] font-medium leading-snug sm:text-base text-slate-700 transition hover:text-slate-900"
                  />
                ))}
              </nav>

              {showSearch ? (
                <div className="hidden min-w-0 max-w-[min(100%,14rem)] items-center justify-self-center px-1 py-1 md:flex md:max-w-[min(100%,12rem)] lg:max-w-[min(100%,16rem)]">
                  <NavbarSearch variant="compact" placeholder="Search" className="w-full min-w-0" />
                </div>
              ) : (
                <span className="hidden w-0 min-w-0 shrink-0 md:block" aria-hidden />
              )}

              <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-1.5 justify-self-end sm:gap-2">
                {showIcons ? (
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <ActionIconLink
                      href={content?.actionIcon1Url}
                      openCartOnClick={content?.actionIcon1OpenCart === true}
                      onOpenCart={content?.onOpenCart}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
                      style={actionIcon1Style}
                    >
                      <ActionIcon1 className="h-4 w-4" />
                    </ActionIconLink>
                    <ActionIconLink
                      href={content?.actionIcon2Url}
                      openCartOnClick={content?.actionIcon2OpenCart === true}
                      onOpenCart={content?.onOpenCart}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
                      style={actionIcon2Style}
                    >
                      <ActionIcon2 className="h-4 w-4" />
                    </ActionIconLink>
                  </div>
                ) : null}

                {showPrimaryButton || showSecondaryButton ? (
                  <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
                    {showPrimaryButton ? (
                      <a
                        href={resolveHref(content?.primaryButtonUrl)}
                        className={`${NAVBAR_DEVELOPER_CTA_CLASS} max-w-[9.5rem] bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800`}
                        style={primaryButtonStyle}
                      >
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                          <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{primaryLabel}</span>
                        </span>
                      </a>
                    ) : null}
                    {showSecondaryButton ? (
                      <a
                        href={resolveHref(content?.secondaryButtonUrl)}
                        className={`${NAVBAR_DEVELOPER_CTA_CLASS} max-w-[9.5rem] bg-orange-500 text-white shadow-sm transition hover:bg-orange-600`}
                        style={secondaryButtonStyle}
                      >
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                          <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{secondaryLabel}</span>
                        </span>
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <nav className="flex min-w-0 flex-wrap items-center justify-center gap-3 overflow-x-auto md:flex-nowrap md:gap-4">
              {links.map((link, i) => (
                <NavLinkItemNode
                  key={link.id || i}
                  link={link}
                  i={i}
                  fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                  linkClassName="shrink-0 whitespace-nowrap text-[15px] font-medium leading-snug sm:text-base text-slate-700 transition hover:text-slate-900"
                />
              ))}
            </nav>
          )}
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="hover:bg-slate-100 text-slate-700"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium sm:text-base text-slate-700 transition hover:text-slate-900"
              touchExpandable
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compact"
            placeholder="Search"
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons ? (
          <div className="flex gap-2">
            <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm" style={actionIcon1Style}>
              <ActionIcon1 className="h-4 w-4" />
            </ActionIconLink>
            <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm" style={actionIcon2Style}>
              <ActionIcon2 className="h-4 w-4" />
            </ActionIconLink>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_MD} bg-emerald-700 text-white`}
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-4 w-4 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_MD} bg-orange-500 text-white`}
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-4 w-4 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </section>
  );
}

function NavbarMinimalist({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton === true;
  const showSecondaryButton = content?.showSecondaryButton === true;
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const actionIcon1Style: CSSProperties = {
    backgroundColor: content?.actionIcon1BgColor || "#000000",
    color: content?.actionIcon1Color || "#ffffff",
  };
  const actionIcon2Style: CSSProperties = {
    backgroundColor: content?.actionIcon2BgColor || "#f97316",
    color: content?.actionIcon2Color || "#ffffff",
  };
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  return (
    <header className="w-full bg-white" style={navbarBgStyle}>
      <div className="mx-auto grid min-w-0 max-w-6xl grid-cols-1 px-4 py-3 sm:px-6 md:h-16 md:grid-cols-[minmax(0,auto)_auto_minmax(0,auto)] md:items-center md:gap-x-6 md:gap-y-0 md:py-0">
        <div className="col-span-full flex w-full min-w-0 items-center justify-between md:hidden">
          <div className={NAV_LOGO_WRAPPER_CLASS}>
            <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
          </div>
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-800"
            onClick={() => setMobileOpen(true)}
          >
            <FiMenu className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <nav className="hidden max-w-full min-w-0 items-center justify-self-start gap-4 overflow-x-auto md:flex md:flex-nowrap md:gap-5">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="shrink-0 whitespace-nowrap text-[15px] font-medium leading-snug sm:text-base text-slate-600 transition hover:text-slate-900"
            />
          ))}
        </nav>

        <div className={`hidden max-w-full min-w-0 shrink-0 items-center justify-self-center md:flex ${NAV_LOGO_WRAPPER_CLASS}`}>
          <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
        </div>

        <div className="hidden min-w-0 max-w-full shrink-0 flex-nowrap items-center justify-end justify-self-end gap-2 sm:gap-2.5 md:flex">
          {showSearch ? (
            <div className="hidden min-w-0 max-w-[min(100%,10rem)] items-center md:flex lg:max-w-[min(100%,13rem)]">
              <NavbarSearch
                variant="compactDense"
                placeholder="Search"
                className="min-w-0 w-full"
              />
            </div>
          ) : null}

          {showIcons ? (
            <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
              <ActionIconLink
                href={content?.actionIcon1Url}
                openCartOnClick={content?.actionIcon1OpenCart === true}
                onOpenCart={content?.onOpenCart}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                style={actionIcon1Style}
              >
                <ActionIcon1 className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                  1
                </span>
              </ActionIconLink>
              <ActionIconLink
                href={content?.actionIcon2Url}
                openCartOnClick={content?.actionIcon2OpenCart === true}
                onOpenCart={content?.onOpenCart}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50"
                style={actionIcon2Style}
              >
                <ActionIcon2 className="h-4 w-4" />
              </ActionIconLink>
            </div>
          ) : null}

          {showPrimaryButton || showSecondaryButton ? (
            <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
              {showPrimaryButton ? (
                <a
                  href={resolveHref(content?.primaryButtonUrl)}
                  className={`${NAVBAR_DEVELOPER_CTA_CLASS} max-w-[9.5rem] bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800`}
                  style={primaryButtonStyle}
                >
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{primaryLabel}</span>
                  </span>
                </a>
              ) : null}
              {showSecondaryButton ? (
                <a
                  href={resolveHref(content?.secondaryButtonUrl)}
                  className={`${NAVBAR_DEVELOPER_CTA_CLASS} max-w-[9.5rem] bg-orange-500 text-white shadow-sm transition hover:bg-orange-600`}
                  style={secondaryButtonStyle}
                >
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                    <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{secondaryLabel}</span>
                  </span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="hover:bg-slate-100 text-slate-700"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="rounded-lg px-3 py-2 text-[15px] font-medium sm:text-base text-slate-600 transition hover:text-slate-900"
              touchExpandable
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compactDense"
            placeholder="Search"
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons ? (
          <div className="flex gap-2">
            <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700" style={actionIcon1Style}>
              <ActionIcon1 className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                1
              </span>
            </ActionIconLink>
            <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700" style={actionIcon2Style}>
              <ActionIcon2 className="h-4 w-4" />
            </ActionIconLink>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} bg-emerald-700 text-white`}
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} bg-orange-500 text-white`}
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </header>
  );
}


function NavbarDarkSidebar({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton !== false;
  const showSecondaryButton = content?.showSecondaryButton !== false;
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  return (
    <header
      className="relative w-full rounded-3xl border-slate-800 bg-slate-950 text-white md:rounded-full overflow-visible"
      style={navbarBgStyle}
    >
      <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between px-4 py-3 sm:px-6 md:h-16 md:justify-between md:py-0">
        <div className="flex items-center gap-3 md:hidden">
          <div className={NAV_LOGO_WRAPPER_CLASS}>
            <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
          </div>
        </div>
        <button
          type="button"
          aria-label="Open menu"
          className="rounded-lg border border-slate-200/90 bg-white p-2 text-slate-900 shadow-sm md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <FiMenu className="h-6 w-6" aria-hidden />
        </button>

        <div className="relative hidden h-16 w-full min-w-0 md:grid md:grid-cols-[minmax(0,auto)_auto_minmax(0,auto)] md:items-center md:gap-x-2 md:py-0 lg:gap-x-3">
          <div className="flex max-w-full min-w-0 items-center gap-2 md:gap-2.5">
            <div className={`${NAV_LOGO_WRAPPER_CLASS} shrink-0`}>
              <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
            </div>
            {showSearch ? (
              <div className="hidden min-w-0 max-w-[min(100%,10rem)] md:flex lg:max-w-[min(100%,13rem)]">
                <NavbarSearch
                  variant="compactDarkDense"
                  placeholder="Search products..."
                  className="min-w-0 w-full"
                />
              </div>
            ) : null}
          </div>

          <nav
            className="flex min-w-0 max-w-full flex-nowrap items-center justify-center gap-3 overflow-visible px-1 md:gap-3 lg:gap-4"
            aria-label="Primary"
          >
            {links.map((link, i) => (
              <NavLinkItemNode
                key={link.id || i}
                link={link}
                i={i}
                fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                linkClassName="shrink-0 whitespace-nowrap text-[15px] font-medium text-slate-300 transition hover:text-white sm:text-base"
              />
            ))}
          </nav>

          <div className="flex min-w-0 max-w-full flex-nowrap items-center justify-end gap-1.5 overflow-visible pt-0.5 sm:gap-2">
            {showIcons ? (
              <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
                <ActionIconLink
                  href={content?.actionIcon1Url}
                  openCartOnClick={content?.actionIcon1OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-visible rounded-full border border-white/35 bg-white/20 text-white shadow-sm backdrop-blur-sm hover:bg-white/30 sm:h-9 sm:w-9"
                  style={actionIcon1Style}
                >
                  <ActionIcon1 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[9px] text-white sm:-right-1 sm:-top-1 sm:h-4 sm:w-4 sm:text-[10px]">
                    2
                  </span>
                </ActionIconLink>
                <ActionIconLink
                  href={content?.actionIcon2Url}
                  openCartOnClick={content?.actionIcon2OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/20 text-white shadow-sm backdrop-blur-sm hover:bg-white/30 sm:h-9 sm:w-9"
                  style={actionIcon2Style}
                >
                  <ActionIcon2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </ActionIconLink>
              </div>
            ) : null}
            {showPrimaryButton || showSecondaryButton ? (
              <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-1.5">
                {showPrimaryButton ? (
                  <a
                    href={resolveHref(content?.primaryButtonUrl)}
                    className={`${NAVBAR_DEVELOPER_CTA_CLASS} border border-white/10 bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800`}
                    style={primaryButtonStyle}
                  >
                    <PrimaryButtonIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="min-w-0 truncate">
                      {content?.primaryButtonLabel?.trim() || "Sign in"}
                    </span>
                  </a>
                ) : null}
                {showSecondaryButton ? (
                  <a
                    href={resolveHref(content?.secondaryButtonUrl)}
                    className={`${NAVBAR_DEVELOPER_CTA_CLASS} border border-white/10 bg-orange-500 text-white shadow-sm transition hover:bg-orange-600`}
                    style={secondaryButtonStyle}
                  >
                    <SecondaryButtonIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="min-w-0 truncate">{secondaryLabel}</span>
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-600 hover:bg-slate-100"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="rounded-lg px-3 py-2 text-[15px] font-semibold text-slate-900 transition hover:text-slate-700 sm:text-base"
              touchExpandable
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compactDarkDense"
            placeholder="Search products..."
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons ? (
          <div className="flex gap-2">
            <ActionIconLink
              href={content?.actionIcon1Url}
              openCartOnClick={content?.actionIcon1OpenCart === true}
              onOpenCart={content?.onOpenCart}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:bg-slate-100"
              style={actionIcon1Style}
            >
              <ActionIcon1 className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                2
              </span>
            </ActionIconLink>
            <ActionIconLink
              href={content?.actionIcon2Url}
              openCartOnClick={content?.actionIcon2OpenCart === true}
              onOpenCart={content?.onOpenCart}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:bg-slate-100"
              style={actionIcon2Style}
            >
              <ActionIcon2 className="h-4 w-4" />
            </ActionIconLink>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} bg-emerald-700 text-white`}
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} bg-orange-500 text-white`}
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </header>
  );
}

function NavbarBusiness({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton !== false;
  const showSecondaryButton = content?.showSecondaryButton !== false;
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const businessLeftStripColor = String(content?.navbarBgColor || "").trim();
  const businessLeftStripBgStyle = businessLeftStripColor
    ? { backgroundColor: businessLeftStripColor }
    : undefined;
  const businessRightStripColor = String(content?.classicRightSectionBgColor || "").trim();
  const businessRightStripBgStyle = {
    backgroundColor: businessRightStripColor || NAVBAR_BUSINESS_STRIP_RIGHT_BG,
  };
  return (
    <>
      <header className="relative w-full overflow-visible px-10 py-3 sm:px-16 lg:px-20 xl:px-28 2xl:px-32">
      <div className="flex items-center justify-between md:hidden">
        <div className={NAV_LOGO_WRAPPER_CLASS}>
          <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
        </div>
        <button
          type="button"
          aria-label="Open menu"
          className="rounded-lg p-2 text-black"
          onClick={() => setMobileOpen(true)}
        >
          <FiMenu className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {/* Single row: logo | one bg strip (nav center + actions right) */}
      <div
        className={`relative hidden w-full min-w-0 items-center gap-2 overflow-visible md:flex ${NAVBAR_BUSINESS_ROW_H} lg:gap-3`}
      >
        <div className="flex shrink-0 items-center">
          <div className={`${NAV_LOGO_WRAPPER_CLASS} shrink-0`}>
            <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
          </div>
        </div>

        <div
          className={`${NAVBAR_BUSINESS_ROW_H} relative flex min-w-0 flex-1 items-stretch rounded-xl`}
        >
          {/* LEFT STRAP: Nav links on admin bg color — grows to fill strip */}
          <nav
            className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-nowrap items-center justify-center gap-0.5 rounded-l-xl px-3 sm:px-4"
            style={businessLeftStripBgStyle}
            aria-label="Primary"
          >
            {links.map((link, i) => (
              <NavLinkItemNode
                key={link.id || i}
                link={link}
                i={i}
                fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                bodyPortalFlyout
                compact
                linkClassName={`inline-flex ${NAVBAR_BUSINESS_BTN_H} shrink-0 items-center whitespace-nowrap px-1.5 py-0 ${NAVBAR_MENU_LINK_BUSINESS} transition`}
              />
            ))}
          </nav>

          {/* RIGHT STRAP: Buttons on dark background */}
          <div
            className="relative z-[1] flex shrink-0 flex-nowrap items-center justify-end rounded-r-xl px-3 sm:px-4"
            style={businessRightStripBgStyle}
          >
            <div className="relative flex flex-nowrap items-center justify-end gap-1.5 py-0 sm:gap-2">
            {showIcons ? (
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                <ActionIconLink
                  href={content?.actionIcon1Url}
                  openCartOnClick={content?.actionIcon1OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className={`relative flex ${NAVBAR_BUSINESS_BTN_H} w-8 shrink-0 items-center justify-center overflow-visible rounded-full`}
                  style={actionIcon1Style}
                >
                  <ActionIcon1 className="h-3.5 w-3.5" />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                    2
                  </span>
                </ActionIconLink>
                <ActionIconLink
                  href={content?.actionIcon2Url}
                  openCartOnClick={content?.actionIcon2OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className={`flex ${NAVBAR_BUSINESS_BTN_H} w-8 shrink-0 items-center justify-center overflow-visible rounded-full`}
                  style={actionIcon2Style}
                >
                  <ActionIcon2 className="h-3.5 w-3.5" />
                </ActionIconLink>
              </div>
            ) : null}
            {showPrimaryButton || showSecondaryButton ? (
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                {showPrimaryButton ? (
                  <a
                    href={resolveHref(content?.primaryButtonUrl)}
                    className={`${NAVBAR_BUSINESS_CTA_CLASS} bg-emerald-700 text-white transition hover:bg-emerald-800`}
                    style={primaryButtonStyle}
                  >
                    <PrimaryButtonIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="min-w-0 truncate">{primaryLabel}</span>
                  </a>
                ) : null}
                {showSecondaryButton ? (
                  <a
                    href={resolveHref(content?.secondaryButtonUrl)}
                    className={`${NAVBAR_BUSINESS_CTA_CLASS} bg-orange-500 text-white transition hover:bg-orange-600`}
                    style={secondaryButtonStyle}
                  >
                    <SecondaryButtonIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="min-w-0 truncate">{secondaryLabel}</span>
                  </a>
                ) : null}
              </div>
            ) : null}
            {showSearch ? (
              <div
                className={`hidden ${NAVBAR_BUSINESS_BTN_H} min-w-0 max-w-[9rem] shrink-0 lg:block lg:max-w-[10rem] xl:max-w-[11rem]`}
              >
                <NavbarSearch
                  variant="compactDense"
                  placeholder="Search..."
                  className="min-w-0 h-full w-full [&_form>div>div]:!h-8 [&_form>div>div]:!min-h-8 [&_form>div>div]:!max-h-8"
                />
              </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      </header>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="hover:bg-slate-100 text-slate-700"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="rounded-lg px-3 py-2 text-[15px] font-medium sm:text-base text-slate-700 transition hover:text-slate-900"
              touchExpandable
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compactPill"
            placeholder="Search..."
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons ? (
          <div className="flex gap-2">
            <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="relative flex h-10 w-10 items-center justify-center rounded-full" style={actionIcon1Style}>
              <ActionIcon1 className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                2
              </span>
            </ActionIconLink>
            <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-10 w-10 items-center justify-center rounded-full" style={actionIcon2Style}>
              <ActionIcon2 className="h-4 w-4" />
            </ActionIconLink>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_MD} bg-emerald-700 text-white`}
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-4 w-4 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_MD} bg-orange-500 text-white`}
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-4 w-4 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </>
  );
}

function NavbarBusiness2({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton !== false;
  const showSecondaryButton = content?.showSecondaryButton !== false;
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const businessBarColor = String(content?.navbarBgColor || "").trim() || "#000000";
  const businessBarBgStyle = { backgroundColor: businessBarColor };
  return (
    <>
      <header
        className="relative w-full overflow-visible px-10 py-3 sm:px-16 lg:px-20 xl:px-28 2xl:px-32"
        style={businessBarBgStyle}
      >
      <div className="flex items-center justify-between md:hidden">
        <div className={NAV_LOGO_WRAPPER_CLASS}>
          <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
        </div>
        <button
          type="button"
          aria-label="Open menu"
          className="rounded-lg p-2 text-white"
          onClick={() => setMobileOpen(true)}
        >
          <FiMenu className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {/* Business-2: flat full-width bar — no inner strap / rounded pill */}
      <div
        className={`relative hidden w-full min-w-0 items-center md:flex ${NAVBAR_BUSINESS2_ROW_H}`}
      >
          <div className="flex shrink-0 items-center pr-2 sm:pr-3">
            <div className={`${NAV_LOGO_WRAPPER_CLASS} shrink-0 [&_img]:max-h-[52px]`}>
              <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
            </div>
          </div>

          <nav
            className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-nowrap items-center justify-center gap-0.5 px-2 sm:px-3"
            aria-label="Primary"
          >
            {links.map((link, i) => (
              <NavLinkItemNode
                key={link.id || i}
                link={link}
                i={i}
                fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                bodyPortalFlyout
                compact
                linkClassName={`inline-flex ${NAVBAR_BUSINESS_BTN_H} shrink-0 items-center whitespace-nowrap px-1.5 py-0 ${NAVBAR_MENU_LINK_BUSINESS2} transition`}
              />
            ))}
          </nav>

          <div className="relative z-[1] flex shrink-0 flex-nowrap items-center justify-end px-3 sm:px-4">
            <div className="relative flex flex-nowrap items-center justify-end gap-1.5 py-0 sm:gap-2">
            {showIcons ? (
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                <ActionIconLink
                  href={content?.actionIcon1Url}
                  openCartOnClick={content?.actionIcon1OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className={`relative flex ${NAVBAR_BUSINESS_BTN_H} w-8 shrink-0 items-center justify-center overflow-visible rounded-full`}
                  style={actionIcon1Style}
                >
                  <ActionIcon1 className="h-3.5 w-3.5" />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                    2
                  </span>
                </ActionIconLink>
                <ActionIconLink
                  href={content?.actionIcon2Url}
                  openCartOnClick={content?.actionIcon2OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className={`flex ${NAVBAR_BUSINESS_BTN_H} w-8 shrink-0 items-center justify-center overflow-visible rounded-full`}
                  style={actionIcon2Style}
                >
                  <ActionIcon2 className="h-3.5 w-3.5" />
                </ActionIconLink>
              </div>
            ) : null}
            {showPrimaryButton || showSecondaryButton ? (
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                {showPrimaryButton ? (
                  <a
                    href={resolveHref(content?.primaryButtonUrl)}
                    className={`${NAVBAR_BUSINESS_CTA_CLASS} bg-emerald-700 text-white transition hover:bg-emerald-800`}
                    style={primaryButtonStyle}
                  >
                    <PrimaryButtonIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="min-w-0 truncate">{primaryLabel}</span>
                  </a>
                ) : null}
                {showSecondaryButton ? (
                  <a
                    href={resolveHref(content?.secondaryButtonUrl)}
                    className={`${NAVBAR_BUSINESS_CTA_CLASS} bg-orange-500 text-white transition hover:bg-orange-600`}
                    style={secondaryButtonStyle}
                  >
                    <SecondaryButtonIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="min-w-0 truncate">{secondaryLabel}</span>
                  </a>
                ) : null}
              </div>
            ) : null}
            {showSearch ? (
              <div
                className={`hidden ${NAVBAR_BUSINESS_BTN_H} min-w-0 max-w-[9rem] shrink-0 lg:block lg:max-w-[10rem] xl:max-w-[11rem]`}
              >
                <NavbarSearch
                  variant="compactDense"
                  placeholder="Search..."
                  className="min-w-0 h-full w-full [&_form>div>div]:!h-8 [&_form>div>div]:!min-h-8 [&_form>div>div]:!max-h-8"
                />
              </div>
              ) : null}
            </div>
          </div>
      </div>
      </header>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="hover:bg-slate-100 text-slate-700"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="rounded-lg px-3 py-2 text-[15px] font-medium sm:text-base text-slate-700 transition hover:text-slate-900"
              touchExpandable
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compactPill"
            placeholder="Search..."
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons ? (
          <div className="flex gap-2">
            <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="relative flex h-10 w-10 items-center justify-center rounded-full" style={actionIcon1Style}>
              <ActionIcon1 className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                2
              </span>
            </ActionIconLink>
            <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-10 w-10 items-center justify-center rounded-full" style={actionIcon2Style}>
              <ActionIcon2 className="h-4 w-4" />
            </ActionIconLink>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_MD} bg-emerald-700 text-white`}
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-4 w-4 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_MD} bg-orange-500 text-white`}
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-4 w-4 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </>
  );
}

function NavbarDeveloper({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton !== false;
  const showSecondaryButton = content?.showSecondaryButton !== false;
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  const developerActionsBarStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  const getLinkIcon = (label?: string, iconCode?: string) => {
    const key = String(label || "").toLowerCase();
    if (key.includes("home")) return createNavbarIconSlot(iconCode, "fi-rr-home", NAVBAR_REACT_ICON_MAP);
    if (key.includes("product") || key.includes("shop")) {
      return createNavbarIconSlot(iconCode, DEFAULT_NAVBAR_FLATICON, NAVBAR_REACT_ICON_MAP);
    }
    if (key.includes("feature")) return createNavbarIconSlot(iconCode, "fi-rr-star", NAVBAR_REACT_ICON_MAP);
    if (key.includes("pricing") || key.includes("deal")) {
      return createNavbarIconSlot(iconCode, "fi-rr-tags", NAVBAR_REACT_ICON_MAP);
    }
    return createNavbarIconSlot(iconCode, DEFAULT_NAVBAR_FLATICON, NAVBAR_REACT_ICON_MAP);
  };

  return (
    <header
      className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6"
      // style={navbarBgStyle}
    >
      <div className="flex items-center justify-between md:hidden">
        <div className={NAV_LOGO_WRAPPER_CLASS}>
          <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
        </div>
        <button type="button" aria-label="Open menu" className="rounded-lg p-2 text-slate-800" onClick={() => setMobileOpen(true)}>
          <FiMenu className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <div className="hidden min-w-0 w-full flex-col gap-3 md:flex md:flex-nowrap md:flex-row md:items-center md:gap-x-3 md:gap-y-0 lg:gap-x-4">
        <div className={`${NAV_LOGO_WRAPPER_CLASS} max-w-full min-w-0 shrink-0`}>
          <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
        </div>

        <div className="flex min-h-0 min-w-0 max-w-full flex-1 items-center justify-center md:px-2">
          <div
            className="flex max-w-full min-w-0 flex-nowrap items-center gap-1 overflow-visible rounded-xl bg-slate-900/95 p-2 px-4 shadow-lg backdrop-blur-md sm:gap-1.5 sm:px-2.5 md:max-w-[min(100%,42rem)]"
            style={developerActionsBarStyle}
          >
            <nav className="flex max-w-full min-w-0 shrink-0 flex-nowrap items-center gap-0.5 overflow-x-auto sm:gap-1">
              {links.map((link, i) => {
                const Icon = getLinkIcon(link.label, link.icon);
                const lt = linkTypeNormalized(link);
                if (lt === "icon_label") {
                  return (
                    <a
                      key={link.id || i}
                      href={resolveHref(link.url)}
                      data-nav-link="1"
                      className="
                        group relative flex h-9 max-w-[9rem] shrink-0 items-center gap-1 rounded-full
                        px-2 text-white/90 transition-all duration-200
                        hover:-translate-y-0.5 hover:bg-white/10 hover:text-white
                        sm:max-w-[11rem] sm:gap-1.5 sm:px-2.5
                      "
                      title={link.label || link.icon || "Link"}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                      <span className="min-w-0 truncate text-xs font-medium sm:text-sm">
                        {link.label?.trim() || link.icon || "Link"}
                      </span>
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white opacity-0 transition group-hover:opacity-100" />
                    </a>
                  );
                }
                return (
                  <a
                    key={link.id || i}
                    href={resolveHref(link.url)}
                    data-nav-link="1"
                    className="
                      group relative flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-full text-white/80
                      transition-all duration-200
                      hover:-translate-y-0.5 hover:bg-white/10 hover:text-white
                      sm:h-9 sm:w-9
                    "
                    title={link.label || link.icon || "Link"}
                    aria-label={isIconOnlyLink(link) ? navLinkAriaLabel(link) : undefined}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white opacity-0 transition group-hover:opacity-100" />
                  </a>
                );
              })}
            </nav>

            {showIcons ? (
              <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-1.5">
                <button
                  className="
                    relative flex h-9 w-9 shrink-0 items-center justify-center overflow-visible
                    rounded-full bg-orange-500 text-white
                    transition-all duration-200
                    hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-md
                  "
                  title="Cart"
                  type="button"
                  style={actionIcon1Style}
                >
                  <ActionIcon1 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-orange-600 sm:h-4 sm:w-4 sm:text-[10px]">
                    2
                  </span>
                </button>

                <button
                  className="
                    flex h-9 w-9 shrink-0 items-center justify-center
                    rounded-full bg-violet-500 text-white
                    transition-all duration-200
                    hover:-translate-y-0.5 hover:bg-violet-600 hover:shadow-md
                  "
                  title="User"
                  type="button"
                  style={actionIcon2Style}
                >
                  <ActionIcon2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </button>
              </div>
            ) : null}

            {showPrimaryButton || showSecondaryButton ? (
              <div className="flex shrink-0 flex-nowrap items-center gap-1 sm:gap-1.5">
                {showPrimaryButton ? (
                  <a
                    href={resolveHref(content?.primaryButtonUrl)}
                    className={`${NAVBAR_DEVELOPER_CTA_CLASS} bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800`}
                    style={primaryButtonStyle}
                  >
                    <PrimaryButtonIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="min-w-0 truncate">
                      {content?.primaryButtonLabel?.trim() || "Sign in"}
                    </span>
                  </a>
                ) : null}
                {showSecondaryButton ? (
                  <a
                    href={resolveHref(content?.secondaryButtonUrl)}
                    className={`${NAVBAR_DEVELOPER_CTA_CLASS} bg-orange-500 text-white shadow-sm transition hover:bg-orange-600`}
                    style={secondaryButtonStyle}
                  >
                    <SecondaryButtonIcon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                    <span className="min-w-0 truncate">{secondaryLabel}</span>
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {showSearch ? (
          <div className="flex shrink-0 items-center justify-end md:min-w-0">
            <div className="flex min-w-0 max-w-[min(100%,10rem)] md:max-w-[min(100%,13rem)]">
              <NavbarSearch
                variant="compactDenseTall"
                placeholder="Search anything..."
                className="min-w-0 w-full"
              />
            </div>
          </div>
        ) : null}
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-700 hover:bg-slate-100"
      >
        <nav className="flex flex-col gap-1">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium sm:text-base text-slate-700 transition hover:text-slate-900"
              touchExpandable
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compactDenseTall"
            placeholder="Search anything..."
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons ? (
          <div className="flex gap-2">
            <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white" title="Cart">
              <ActionIcon1 className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-orange-600">
                2
              </span>
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500 text-white" title="User">
              <ActionIcon2 className="h-5 w-5" />
            </button>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} bg-emerald-700 text-white`}
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} bg-orange-500 text-white`}
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </header>
  );
}


function NavbarBoldLeft({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = links[0]?.label || "Home";
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton !== false;
  const showSecondaryButton = content?.showSecondaryButton !== false;
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;

  return (
    <header className="w-full bg-white py-3" style={navbarBgStyle}>
      <div className="w-full min-w-0 px-0 md:px-4 lg:px-5">
        <div className="w-full rounded-none border-0 border-transparent bg-white shadow-none ring-0 outline-none md:rounded-xl md:border md:border-slate-200 md:shadow-sm">
          <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-3 sm:px-6 md:min-h-16 md:h-auto md:py-2">
            <div className="flex items-center justify-between md:hidden">
              <div className={`${NAV_LOGO_WRAPPER_CLASS} items-center justify-center overflow-visible`}>
                <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
              </div>
              <button type="button" aria-label="Open menu" className="rounded-lg p-2 text-slate-800" onClick={() => setMobileOpen(true)}>
                <FiMenu className="h-6 w-6" aria-hidden />
              </button>
            </div>

            <div className="hidden min-w-0 md:grid md:w-full md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-x-3 md:gap-y-2 lg:gap-x-4">
              <div className="flex shrink-0 items-center justify-self-start gap-2 md:gap-3">
                <div className={`${NAV_LOGO_WRAPPER_CLASS} items-center justify-center overflow-visible`}>
                  <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
                </div>
              </div>

              <div className="flex min-w-0 justify-center justify-self-stretch md:min-w-0">
                <nav className="flex min-h-0 min-w-0 max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 px-1 md:gap-x-3 md:gap-y-1 md:px-2 lg:gap-x-4">
                  {links.map((link, i) => {
                    const isActive = link.label === active;
                    return (
                      <a
                        key={i}
                        href={resolveHref(link.url)}
                        data-nav-link="1"
                        className="relative shrink-0 whitespace-nowrap text-[15px] font-medium leading-snug sm:text-base text-slate-700 transition hover:text-orange-500"
                      >
                        {renderNavLinkContent(link, DEFAULT_NAVBAR_FLATICON)}
                        {isActive ? <span className="absolute -bottom-2 left-0 h-0.5 w-full rounded-full bg-orange-500" /> : null}
                      </a>
                    );
                  })}
                </nav>
              </div>

              <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end justify-self-end gap-1 md:gap-1.5">
                {showSearch ? (
                  <div className="hidden min-w-0 max-w-[10rem] shrink lg:block lg:max-w-[14rem] xl:max-w-[18rem]">
                    <NavbarSearch variant="compactPill" placeholder="Search..." className="min-w-0" />
                  </div>
                ) : null}

                {showIcons ? (
                  <>
                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
                      style={{
                        backgroundColor: content?.actionIcon1BgColor || "#f1f5f9",
                        color: content?.actionIcon1Color || "#334155",
                        ...actionIcon1Style,
                      }}
                    >
                      <ActionIcon1 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
                      style={{
                        backgroundColor: content?.actionIcon2BgColor || "#f1f5f9",
                        color: content?.actionIcon2Color || "#334155",
                        ...actionIcon2Style,
                      }}
                    >
                      <ActionIcon2 className="h-4 w-4" />
                    </button>
                  </>
                ) : null}

                {showPrimaryButton ? (
                  <a
                    href={resolveHref(content?.primaryButtonUrl)}
                    className={`${NAVBAR_CTA_MD} !shrink-0 whitespace-nowrap bg-orange-500 text-white transition hover:bg-orange-600`}
                    style={primaryButtonStyle}
                  >
                    <PrimaryButtonIcon className="h-4 w-4 shrink-0" />
                    {primaryLabel}
                  </a>
                ) : null}

                {showSecondaryButton ? (
                  <a
                    href={resolveHref(content?.secondaryButtonUrl)}
                    className={`${NAVBAR_CTA_MD} !shrink-0 whitespace-nowrap bg-slate-900 text-white transition hover:bg-slate-800`}
                    style={secondaryButtonStyle}
                  >
                    <SecondaryButtonIcon className="h-4 w-4 shrink-0" />
                    {secondaryLabel}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-700 hover:bg-slate-100"
      >
        <nav className="flex flex-col gap-1">
          {links.map((link, i) => {
            const isActive = link.label === active;
            return (
              <NavLinkItemNode
                key={link.id ?? i}
                link={link}
                i={i}
                fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                linkClassName={`relative rounded-lg px-3 py-2 text-[15px] font-medium transition hover:text-slate-900 sm:text-base ${isActive ? "text-orange-600" : "text-slate-700"}`}
                touchExpandable
                onNavigate={() => setMobileOpen(false)}
              />
            );
          })}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compact"
            placeholder="Search"
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons || showPrimaryButton || showSecondaryButton ? (
          <div className="flex flex-col gap-2">
            {showIcons ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm"
                  style={{
                    backgroundColor: content?.actionIcon1BgColor || "#f1f5f9",
                    color: content?.actionIcon1Color || "#334155",
                    ...actionIcon1Style,
                  }}
                >
                  <ActionIcon1 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm"
                  style={{
                    backgroundColor: content?.actionIcon2BgColor || "#f1f5f9",
                    color: content?.actionIcon2Color || "#334155",
                    ...actionIcon2Style,
                  }}
                >
                  <ActionIcon2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_MD} bg-orange-500 text-white shadow-sm`}
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-4 w-4 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_MD} bg-slate-900 text-white shadow-sm`}
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-4 w-4 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </header>
  );
}

/** Black pill bar: logo disc | centered links | optional search, icons, CTAs (admin toggles). */
function NavbarPillBlack({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const resolvedLogoUrl = resolveAssetSrc(logoUrl);
  const trimmedLogo = resolvedLogoUrl.trim();
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton === true;
  const showSecondaryButton = content?.showSecondaryButton === true;
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const hasRightEnd = showSearch || showIcons || showPrimaryButton || showSecondaryButton;
  const pillBarBgStyle: CSSProperties = {
    backgroundColor: String(content?.navbarBgColor || "").trim() || "#000000",
  };

  const primRes = resolvePrimaryButtonStyle(content) || {};
  const pillPrimaryMerged: CSSProperties = {
    backgroundColor: primRes.backgroundColor ?? "#fafafa",
    color: primRes.color ?? "#0f172a",
  };
  const secRes = resolveSecondaryButtonStyle(content) || {};
  const pillSecondaryMerged: CSSProperties = {
    backgroundColor: secRes.backgroundColor ?? "transparent",
    color: secRes.color ?? "#ffffff",
  };
  const i1 = resolveActionIconButtonStyle(content, 1) || {};
  const i2 = resolveActionIconButtonStyle(content, 2) || {};
  const pillIcon1Merged: CSSProperties = {
    backgroundColor: i1.backgroundColor ?? "rgba(255,255,255,0.1)",
    color: i1.color ?? "#ffffff",
  };
  const pillIcon2Merged: CSSProperties = {
    backgroundColor: i2.backgroundColor ?? "rgba(255,255,255,0.1)",
    color: i2.color ?? "#ffffff",
  };

  return (
    <>
      <header className="w-full py-3">
        <div className="w-full min-w-0 px-4 sm:px-5">
          <div
            className="w-full rounded-xl shadow-[0_10px_36px_rgba(0,0,0,0.28)]"
            style={pillBarBgStyle}
          >
            <div className="mx-auto grid min-h-[52px] w-full min-w-0 max-w-5xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2 sm:min-h-[56px] sm:gap-3 sm:px-6 sm:py-2.5 md:gap-x-4 md:gap-y-0 lg:max-w-6xl">
              <div className="flex min-w-0 shrink-0 items-center justify-self-start sm:gap-3">
                <LogoHomeLink className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md sm:h-11 sm:w-11">
                  {trimmedLogo ? (
                    <NavbarWidgetLogo
                      src={trimmedLogo}
                      alt={logoText.trim() ? `${logoText} logo` : "Store logo"}
                      className="h-full w-full min-h-0 min-w-0 max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <GiFlame className="h-6 w-6 shrink-0 text-[#2563eb] sm:h-7 sm:w-7" aria-hidden />
                  )}
                </LogoHomeLink>
              </div>

              <div className="flex min-w-0 max-w-full justify-center justify-self-stretch">
                <nav className="nav-pill-black-desktop hidden min-w-0 max-w-full flex-nowrap items-center justify-center gap-4 overflow-x-auto md:flex md:gap-6 lg:gap-9">
                  {links.map((link, i) => (
                    <NavLinkItemNode
                      key={link.id || i}
                      link={link}
                      i={i}
                      fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                      bodyPortalFlyout
                      linkClassName="shrink-0 whitespace-nowrap text-[15px] font-medium leading-snug text-white transition hover:opacity-80 sm:text-base"
                    />
                  ))}
                </nav>
              </div>

              <div className="flex min-w-0 shrink-0 items-center justify-end justify-self-end gap-2 lg:gap-2.5">
                {hasRightEnd ? (
                  <div className="hidden min-w-0 flex-nowrap items-center justify-end gap-2 md:flex lg:gap-2.5">
                    {showSearch ? (
                      <div className="hidden min-w-0 max-w-[10rem] shrink-0 lg:block xl:max-w-[13rem]">
                        <NavbarSearch
                          variant="compactDark"
                          placeholder="Search"
                          className="min-w-0 w-full [&_form>div>div]:shadow-md"
                        />
                      </div>
                    ) : null}
                    {showIcons ? (
                      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        <ActionIconLink
                          href={content?.actionIcon1Url}
                          openCartOnClick={content?.actionIcon1OpenCart === true}
                          onOpenCart={content?.onOpenCart}
                          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-white/40 transition hover:opacity-90"
                          style={pillIcon1Merged}
                          title="Basket"
                        >
                          <ActionIcon1 className="h-4 w-4 shrink-0" />
                        </ActionIconLink>
                        <ActionIconLink
                          href={content?.actionIcon2Url}
                          openCartOnClick={content?.actionIcon2OpenCart === true}
                          onOpenCart={content?.onOpenCart}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-white/40 transition hover:opacity-90"
                          style={pillIcon2Merged}
                          title="Account"
                        >
                          <ActionIcon2 className="h-4 w-4 shrink-0" />
                        </ActionIconLink>
                      </div>
                    ) : null}
                    {showPrimaryButton || showSecondaryButton ? (
                      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
                        {showPrimaryButton ? (
                          <a
                            href={resolveHref(content?.primaryButtonUrl)}
                            className={`${NAVBAR_CTA_SM} shadow-sm ring-1 ring-white/45 transition hover:opacity-95`}
                            style={pillPrimaryMerged}
                          >
                            <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[8rem] truncate sm:max-w-none">{primaryLabel}</span>
                          </a>
                        ) : null}
                        {showSecondaryButton ? (
                          <a
                            href={resolveHref(content?.secondaryButtonUrl)}
                            className={`${NAVBAR_CTA_SM} border border-white/65 shadow-sm transition hover:opacity-95`}
                            style={pillSecondaryMerged}
                          >
                            <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="max-w-[8rem] truncate sm:max-w-none">{secondaryLabel}</span>
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label="Open menu"
                  className="shrink-0 rounded-full p-2 text-white transition hover:bg-white/10 md:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <FiMenu className="h-6 w-6" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-700 hover:bg-slate-100"
      >
        <nav className="flex flex-col gap-1">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium sm:text-base text-slate-700 transition hover:text-slate-900"
              touchExpandable
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compact"
            placeholder="Search"
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons ? (
          <div className="mt-2 flex gap-2">
            <ActionIconLink
              href={content?.actionIcon1Url}
              openCartOnClick={content?.actionIcon1OpenCart === true}
              onOpenCart={content?.onOpenCart}
              className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm ring-1 ring-slate-200"
              style={pillIcon1Merged}
            >
              <ActionIcon1 className="h-4 w-4 shrink-0" />
            </ActionIconLink>
            <ActionIconLink
              href={content?.actionIcon2Url}
              openCartOnClick={content?.actionIcon2OpenCart === true}
              onOpenCart={content?.onOpenCart}
              className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm ring-1 ring-slate-200"
              style={pillIcon2Merged}
            >
              <ActionIcon2 className="h-4 w-4 shrink-0" />
            </ActionIconLink>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="mt-2 flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} shadow-sm ring-1 ring-slate-200 transition hover:opacity-95`}
                style={pillPrimaryMerged}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} border border-slate-200 shadow-sm transition hover:opacity-95`}
                style={pillSecondaryMerged}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </>
  );
}

/** Row width below `2xl` (1536px). At `2xl+`, header uses full viewport width. */
const WING_SPLIT_ROW_WIDTH_VW = 99;
/** Inner padding (px) on the right end of the right strip. */
const WING_SPLIT_RIGHT_STRIP_PADDING_RIGHT_PX = 12;
/** Logo circle diameter: 20rem on desktop; on narrow phones cap width so the row still fits. */
const WING_SPLIT_LOGO_CIRCLE_DESKTOP = "8rem";
/** Left vs right strip flex ratio (share of row after circle + gaps). */
const WING_SPLIT_LEFT_STRIP_FLEX = 2;
const WING_SPLIT_RIGHT_STRIP_FLEX = 7;

function NavbarWingSplit({
  logoText,
  logoUrl,
  links,
  primaryLabel,
  secondaryLabel,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton === true;
  const showSecondaryButton = content?.showSecondaryButton === true;
  const ActionIcon1 = createNavbarIconSlot(content?.actionIcon1, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const ActionIcon2 = createNavbarIconSlot(content?.actionIcon2, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const pillBg =
    content?.navbarBgColor || content?.classicRightSectionBgColor || "#2563eb";
  const primaryBarBg: CSSProperties = { backgroundColor: pillBg };
  const logoCircleBorderStyle: CSSProperties = { borderColor: pillBg };
  const resolvedLogoUrl = resolveAssetSrc(logoUrl);
  const hasLogoImg = Boolean(resolvedLogoUrl.trim());
  const trimmedLogoText = logoText.trim();

  const desktopCircleBox: CSSProperties = {
    width: WING_SPLIT_LOGO_CIRCLE_DESKTOP,
    height: WING_SPLIT_LOGO_CIRCLE_DESKTOP,
  };

  /** Concave end toward logo: semicircular bite (mask), radius = half logo circle. */
  const wingSplitLeftStripNotchMask = (diameterExpr: string): CSSProperties => ({
    WebkitMaskImage: `radial-gradient(circle calc(${diameterExpr} / 2) at 100% 50%, transparent 99.6%, black 100%)`,
    maskImage: `radial-gradient(circle calc(${diameterExpr} / 2) at 100% 50%, transparent 99.6%, black 100%)`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  });
  const wingSplitRightStripNotchMask = (diameterExpr: string): CSSProperties => ({
    WebkitMaskImage: `radial-gradient(circle calc(${diameterExpr} / 2) at 0% 50%, transparent 99.6%, black 100%)`,
    maskImage: `radial-gradient(circle calc(${diameterExpr} / 2) at 0% 50%, transparent 99.6%, black 100%)`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
  });

  return (
    <header
      className="relative z-0 mx-auto min-w-0 overflow-visible 2xl:!w-[100vw] 2xl:!max-w-[100vw]"
      style={{
        width: `${WING_SPLIT_ROW_WIDTH_VW}vw`,
        maxWidth: `${WING_SPLIT_ROW_WIDTH_VW}vw`,
      }}
    >
      <div className="w-full min-w-0">
        {/* Mobile: logo left, menu right — no bar/logo backgrounds (transparent) */}
        <div className="relative md:hidden">
          <div className="flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 max-w-[calc(100%-3.5rem)]">
              <NavbarLogoHomeSlot logoUrl={resolvedLogoUrl} logoText={logoText} />
            </div>
            <button
              type="button"
              aria-label="Open menu"
              className="shrink-0 rounded-lg p-2 text-slate-800 transition hover:bg-slate-100/90"
              onClick={() => setMobileOpen(true)}
            >
              <FiMenu className="h-6 w-6" aria-hidden />
            </button>
          </div>
        </div>

        {/* Desktop: left strip (~30%) + gap + circle + gap + right strip (~60%), links flush right */}
        <div className="relative z-0 hidden overflow-visible py-3 md:block">
          <div className="flex w-full min-w-0 items-center gap-0 overflow-visible px-3 md:px-4 lg:px-5">
            <div
              className="-mr-3 min-h-10 min-w-0 shrink rounded-l-xl shadow-lg ring-1 ring-black/10 md:-mr-4 md:min-h-11 lg:-mr-14"
              style={{
                ...primaryBarBg,
                ...wingSplitLeftStripNotchMask(WING_SPLIT_LOGO_CIRCLE_DESKTOP),
                flex: `${WING_SPLIT_LEFT_STRIP_FLEX} 1 0`,
              }}
              aria-hidden
            />
            <div
              className="z-10 flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-white shadow-md"
              style={{ ...logoCircleBorderStyle, ...desktopCircleBox }}
            >
              {hasLogoImg ? (
                <div className="box-border flex h-[82%] w-[82%] min-h-0 min-w-0 items-center justify-center">
                  <NavbarLogoHomeSlot layout="circle" logoUrl={resolvedLogoUrl} logoText={logoText} />
                </div>
              ) : trimmedLogoText ? (
                <LogoHomeLink className="inline-flex max-w-[min(18rem,90%)] items-center justify-center px-3">
                  <span className="truncate text-center text-3xl font-bold italic leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
                    {trimmedLogoText}
                  </span>
                </LogoHomeLink>
              ) : (
                <div className="box-border flex h-[82%] w-[82%] min-h-0 min-w-0 items-center justify-center">
                  <NavbarLogoHomeSlot layout="circle" logoUrl="" logoText={logoText} />
                </div>
              )}
            </div>
            <div
              className="-ml-3 grid min-h-10 min-w-0 max-w-full shrink grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 overflow-visible rounded-r-xl py-1 pl-2 shadow-lg ring-1 ring-black/10 md:-ml-4 md:min-h-11 md:gap-x-3 md:py-1.5 lg:-ml-14"
              style={{
                ...primaryBarBg,
                ...wingSplitRightStripNotchMask(WING_SPLIT_LOGO_CIRCLE_DESKTOP),
                flex: `${WING_SPLIT_RIGHT_STRIP_FLEX} 1 0`,
                paddingRight: WING_SPLIT_RIGHT_STRIP_PADDING_RIGHT_PX,
              }}
            >
              <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-2">
                {showSearch ? (
                  <div className="hidden min-w-0 max-w-[10rem] shrink-0 lg:block xl:max-w-[13rem]">
                    <NavbarSearch
                      variant="compactDark"
                      placeholder="Search"
                      className="min-w-0 w-full [&_form>div>div]:shadow-md"
                    />
                  </div>
                ) : null}
                {showIcons ? (
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <ActionIconLink
                      href={content?.actionIcon1Url}
                      openCartOnClick={content?.actionIcon1OpenCart === true}
                      onOpenCart={content?.onOpenCart}
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white shadow-sm ring-1 ring-white/45 transition hover:bg-white/20"
                      style={actionIcon1Style}
                      title="Basket"
                    >
                      <ActionIcon1 className="h-4 w-4" />
                    </ActionIconLink>
                    <ActionIconLink
                      href={content?.actionIcon2Url}
                      openCartOnClick={content?.actionIcon2OpenCart === true}
                      onOpenCart={content?.onOpenCart}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white shadow-sm ring-1 ring-white/45 transition hover:bg-white/20"
                      style={actionIcon2Style}
                      title="Account"
                    >
                      <ActionIcon2 className="h-4 w-4" />
                    </ActionIconLink>
                  </div>
                ) : null}
                {showPrimaryButton || showSecondaryButton ? (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                    {showPrimaryButton ? (
                      <a
                        href={resolveHref(content?.primaryButtonUrl)}
                        className={`${NAVBAR_CTA_SM} bg-white/95 text-slate-900 shadow-sm ring-1 ring-white/80 transition hover:bg-white`}
                        style={primaryButtonStyle}
                      >
                        <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[8rem] truncate sm:max-w-none">{primaryLabel}</span>
                      </a>
                    ) : null}
                    {showSecondaryButton ? (
                      <a
                        href={resolveHref(content?.secondaryButtonUrl)}
                        className={`${NAVBAR_CTA_SM} border border-white/70 bg-transparent text-white shadow-sm transition hover:bg-white/15`}
                        style={secondaryButtonStyle}
                      >
                        <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[8rem] truncate sm:max-w-none">{secondaryLabel}</span>
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <nav
                className="relative z-[20] flex min-w-0 max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 overflow-x-auto md:gap-x-5"
                style={{ color: "var(--nav-link-text)" }}
              >
                {links.map((link, i) => (
                  <NavLinkItemNode
                    key={link.id || i}
                    link={link}
                    i={i}
                    fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                    bodyPortalFlyout
                    linkClassName="shrink-0 whitespace-nowrap text-[15px] font-semibold transition hover:opacity-90 sm:text-base"
                  />
                ))}
              </nav>
              <div className="min-h-0 min-w-0 max-w-full" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-700 hover:bg-slate-100"
      >
        <nav className="flex flex-col gap-1">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              linkClassName="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium sm:text-base text-slate-700 transition hover:text-slate-900"
              touchExpandable
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <NavbarSearch
            variant="compact"
            placeholder="Search"
            className="mt-2"
            onSearchNavigate={() => setMobileOpen(false)}
          />
        ) : null}
        {showIcons ? (
          <div className="mt-2 flex gap-2">
            <ActionIconLink
              href={content?.actionIcon1Url}
              openCartOnClick={content?.actionIcon1OpenCart === true}
              onOpenCart={content?.onOpenCart}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"
              style={actionIcon1Style}
            >
              <ActionIcon1 className="h-4 w-4" />
            </ActionIconLink>
            <ActionIconLink
              href={content?.actionIcon2Url}
              openCartOnClick={content?.actionIcon2OpenCart === true}
              onOpenCart={content?.onOpenCart}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"
              style={actionIcon2Style}
            >
              <ActionIcon2 className="h-4 w-4" />
            </ActionIconLink>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="mt-2 flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} bg-emerald-700 text-white`}
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className={`${NAVBAR_CTA_SM} bg-orange-500 text-white`}
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </header>
  );
}

function NavbarRetailTwoRow({
  logoText,
  logoUrl,
  links,
  content,
}: {
  logoText: string;
  logoUrl: string;
  links: NavbarLinkItem[];
  primaryLabel: string;
  secondaryLabel: string;
  content: NavbarWidgetContent;
}) {
  const cartItemCount = useContext(CartCountContext);
  const cartSubtotal = useContext(CartSubtotalContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton === true;
  const showSecondaryButton = content?.showSecondaryButton === true;
  const primaryCtaLabel = content?.primaryButtonLabel?.trim() || "";
  const secondaryCtaLabel = content?.secondaryButtonLabel?.trim() || "";
  const UserIcon = createNavbarIconSlot(content?.actionIcon1, "fi-rr-user", NAVBAR_REACT_ICON_MAP);
  const CartIcon = createNavbarIconSlot(content?.actionIcon2, "fi-rr-shopping-cart", NAVBAR_REACT_ICON_MAP);
  const userIconStyle = resolveActionIconButtonStyle(content, 1);
  const cartIconStyle = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = createNavbarIconSlot(content?.primaryButtonIcon, "fi-rr-download", NAVBAR_REACT_ICON_MAP);
  const SecondaryButtonIcon = createNavbarIconSlot(content?.secondaryButtonIcon, "fi-rr-phone-call", NAVBAR_REACT_ICON_MAP);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  const retailLinksBarBgStyle = content?.classicRightSectionBgColor
    ? { backgroundColor: content.classicRightSectionBgColor }
    : undefined;

  /** Product Central → Variants → “Sticky navbar”: fixed top row + `pt-[44px]` above links bar. */
  const pinTopRow = parseStickyNavbarFlag(content?.stickyNavbar);

  /** Fixed top row only; links offset only when sticky is enabled in admin. */
  const topRowShellClass = "mx-auto w-full max-w-6xl px-4 py-4 sm:px-10 lg:px-10";

  const phoneDisplay = content?.secondaryButtonLabel?.trim() || "0333 344 8147";
  const phoneHref = `tel:${String(phoneDisplay).replace(/[^\d+]/g, "")}`;

  const topRowContent = (
    <>
      <div className="flex flex-col gap-1.5 lg:hidden">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className={`${NAV_LOGO_WRAPPER_CLASS} min-w-0 shrink`}>
            <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
          </div>
          <div className="ml-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-x-1 gap-y-0.5 sm:gap-x-1.5">
            <div className="shrink-0 text-right leading-tight">
              <p className="text-[8px] font-medium leading-tight text-slate-500 sm:text-[9px]">Need Help?</p>
              <a
                href={phoneHref}
                className="block whitespace-nowrap text-[10px] font-bold leading-tight tracking-tight text-slate-900 hover:text-slate-700 hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary sm:text-[11px]"
              >
                {phoneDisplay}
              </a>
            </div>
            {showIcons ? (
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                <ActionIconLink
                  href={content?.actionIcon2Url}
                  openCartOnClick={content?.actionIcon2OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className="relative inline-flex items-center gap-0 p-0.5"
                  style={cartIconStyle}
                  title="Basket"
                >
                  <CartIcon className="h-5 w-5 shrink-0 text-slate-900" />
                </ActionIconLink>
                <div className="shrink-0 text-right leading-tight">
                  <p className="text-[7px] font-medium uppercase leading-tight tracking-wide text-slate-500 sm:text-[8px]">
                    Basket
                  </p>
                  <p className="whitespace-nowrap text-[10px] font-bold tabular-nums leading-none text-slate-900 sm:text-[11px]">
                    £{cartSubtotal.toFixed(2)}
                  </p>
                </div>
                <ActionIconLink
                  href={content?.actionIcon1Url}
                  openCartOnClick={content?.actionIcon1OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className="relative inline-flex items-center justify-center p-0.5"
                  style={userIconStyle}
                  title="Account"
                >
                  <UserIcon className="h-7 w-7 shrink-0 text-slate-900" />
                  {cartItemCount === 0 ? (
                    <span className="text-[8px] font-semibold tabular-nums leading-none text-slate-800 sm:text-[9px]">
                      0
                    </span>
                  ) : null}
                </ActionIconLink>
              </div>
            ) : null}
            <button
              type="button"
              aria-label="Open menu"
              className="rounded-md p-1.5 text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary sm:p-2"
              onClick={() => setMobileOpen(true)}
            >
              <FiMenu className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden items-center justify-between gap-6 lg:flex lg:min-h-[4.5rem]">
        <div className={NAV_LOGO_WRAPPER_CLASS}>
          <NavbarLogoHomeSlot logoUrl={logoUrl} logoText={logoText} />
        </div>

        {showSearch ? (
          <div className="min-w-0 max-w-[60%] flex-[1_1_46%] px-2">
            <NavbarSearch variant="compact" />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-5 text-slate-900 xl:gap-6">
          <div className="shrink-0 text-right leading-tight">
            <p className="text-[13px] text-slate-500">Need Help?</p>
            <a
              href={phoneHref}
              className="text-[16px] font-bold tracking-tight text-slate-900 hover:text-slate-700 hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              {phoneDisplay}
            </a>
          </div>
          {showIcons ? (
            <div className="flex items-center gap-5 xl:gap-2">
              <ActionIconLink
                href={content?.actionIcon2Url}
                openCartOnClick={content?.actionIcon2OpenCart === true}
                onOpenCart={content?.onOpenCart}
                className="relative inline-flex items-center gap-1 p-0.5"
                style={cartIconStyle}
                title="Basket"
              >
                <CartIcon className="h-8 w-8 font-semibold shrink-0 text-slate-900"  />
              </ActionIconLink>

              <div className="flex items-center gap-2.5">
                <div className="text-right leading-tight">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Basket</p>
                  <p className="text-[13px] font-bold tabular-nums leading-none text-slate-900">
                    £{cartSubtotal.toFixed(2)}
                  </p>
                </div>

                <ActionIconLink
                  href={content?.actionIcon1Url}
                  openCartOnClick={content?.actionIcon1OpenCart === true}
                  onOpenCart={content?.onOpenCart}
                  className="inline-flex items-center justify-center p-0.5"
                  style={userIconStyle}
                  title="Account"
                >
                  <UserIcon className="h-8 w-8 font-semibold shrink-0 text-slate-900"  />
                  {cartItemCount === 0 ? (
                    <span className="text-[11px] font-semibold tabular-nums leading-none text-slate-800">0</span>
                  ) : null}
                </ActionIconLink>
              </div>
            </div>
          ) : null}
          {showPrimaryButton ? (
            <div className="ml-1 flex items-center gap-2">
              {showPrimaryButton && primaryCtaLabel ? (
                <a
                  href={resolveHref(content?.primaryButtonUrl)}
                  className={`${NAVBAR_CTA_SM} bg-emerald-700 px-2.5 text-white transition hover:bg-emerald-800`}
                  style={primaryButtonStyle}
                >
                  <PrimaryButtonIcon className="h-3.5 w-3.5 shrink-0" />
                  {primaryCtaLabel}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  const retailLinksSection = (
    <div
      className="relative left-1/2 w-screen sm:max-w-[96vw] 2xl:max-w-[98.5vw] rounded-xl -translate-x-1/2 bg-[#fdf4df] mt-6"
      style={retailLinksBarBgStyle}
    >
      <div className="mx-auto w-full px-4 py-2 sm:px-6 md:px-8 lg:px-10">
        <nav className="hidden h-12 w-full flex-nowrap items-center justify-center gap-4 overflow-x-auto overflow-y-visible [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 lg:flex xl:gap-7 [&::-webkit-scrollbar]:hidden">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={DEFAULT_NAVBAR_FLATICON}
              nowrap
              linkClassName="relative shrink-0 whitespace-nowrap text-[14px] font-medium text-white transition hover:text-white/90 xl:text-[15px]"
            />
          ))}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {pinTopRow ? (
        <>
          <div
            className="fixed left-0 right-0 z-[58] w-full overflow-visible bg-white shadow-sm"
            style={{
              ...(navbarBgStyle ?? {}),
              top: SITE_ANNOUNCEMENT_TOP_OFFSET,
            }}
          >
            <div className={topRowShellClass}>{topRowContent}</div>
          </div>
          <div className="w-full overflow-visible pt-[5.5rem]">{retailLinksSection}</div>
        </>
      ) : (
        <header className="w-full overflow-visible" style={navbarBgStyle}>
          <div className="flex w-full flex-col overflow-visible">
            <div className={topRowShellClass}>{topRowContent}</div>
            {retailLinksSection}
          </div>
        </header>
      )}

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-700 hover:bg-slate-100"
      >
        {showSearch ? (
          <section className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Search</p>
            <NavbarSearch
              variant="compact"
              className="min-w-0 w-full"
              onSearchNavigate={() => setMobileOpen(false)}
            />
          </section>
        ) : null}
        <section>
          <nav className="flex flex-col gap-3">
            {links.map((link, i) => (
              <NavLinkItemNode
                key={link.id || i}
                link={link}
                i={i}
                fallbackIcon={DEFAULT_NAVBAR_FLATICON}
                linkClassName="flex w-full min-w-0 items-center px-4 py-3.5 text-lg font-medium leading-snug text-slate-800 transition hover:text-slate-600"
                touchExpandable
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        </section>
      </NavbarMobileDrawer>
    </>
  );
}


export default function BlogNavbarWidget({ content }: { content: NavbarWidgetContent }) {
  useFlaticonStylesheets();
  const auth = useAuth();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState(0);

  const contentForRender = useMemo((): NavbarWidgetContent => {
    const base = content || {};
    return {
      ...base,
      actionIcon2Url: resolveActionIcon2UrlForSession(base, Boolean(auth?.user)),
    };
  }, [content, auth?.user]);

  useEffect(() => {
    const syncCartSummary = () => {
      setCartItemCount(getCartItemCountFromStorage());
      setCartSubtotal(getCartSubtotalFromStorage());
    };
    syncCartSummary();
    window.addEventListener("cartUpdated", syncCartSummary);
    window.addEventListener("storage", syncCartSummary);
    return () => {
      window.removeEventListener("cartUpdated", syncCartSummary);
      window.removeEventListener("storage", syncCartSummary);
    };
  }, []);

  const fallbackVariantByLayout: Record<string, NavbarWidgetContent["variant"]> = {
    classic: "modern",
    centered: "minimalist",
    split: "dark-sidebar",
    minimal: "developer",
  };
  const variant =
    contentForRender?.variant ||
    fallbackVariantByLayout[String(contentForRender?.layout || "classic")] ||
    "modern";
  const logoText = contentForRender?.logoText?.trim() || "";
  const widgetLogoUrl = resolveAssetSrc(contentForRender?.logoUrl);
  /**
   * Client-only fallback when CMS omits logo (e.g. non-home pages). Homepage SSR injects
   * `logoUrl` via `mergePublicStoreLogoIntoHomepageBlocks` + variant bar `serverBootstrapLogo`.
   */
  const [fallbackLogoUrl, setFallbackLogoUrl] = useState("");

  useLayoutEffect(() => {
    if (widgetLogoUrl) return;
    try {
      const cached = sessionStorage.getItem(NAVBAR_WIDGET_PUBLIC_LOGO_SESSION_KEY);
      if (cached) setFallbackLogoUrl(cached);
    } catch {
      /* private mode / quota */
    }
  }, [widgetLogoUrl]);

  useEffect(() => {
    let cancelled = false;
    if (widgetLogoUrl) return () => void 0;

    const base = getNavbarLogoApiBase();
    if (!base) return () => void 0;

    const endpoints = buildNavbarPublicLogoFetchUrls(base);

    const loadLogo = async () => {
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "GET",
            headers: { Accept: "application/json, text/plain, */*" },
            mode: "cors",
            cache: "no-store",
          });
          if (!res.ok) continue;
          let json: unknown;
          try {
            json = await res.json();
          } catch {
            continue;
          }
          const rawPath = extractPublicLogoPathFromJson(json);
          if (!rawPath) continue;
          const resolved = resolveAssetSrc(rawPath);
          if (!resolved) continue;
          if (!cancelled) {
            setFallbackLogoUrl(resolved);
            try {
              sessionStorage.setItem(NAVBAR_WIDGET_PUBLIC_LOGO_SESSION_KEY, resolved);
            } catch {
              /* ignore quota / private mode */
            }
          }
          return;
        } catch {
          // try next endpoint
        }
      }
    };

    void loadLogo();
    return () => {
      cancelled = true;
    };
  }, [widgetLogoUrl]);

  useEffect(() => {
    if (!widgetLogoUrl || typeof document === "undefined") return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = widgetLogoUrl;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [widgetLogoUrl]);

  const effectiveLogoUrl = (widgetLogoUrl || fallbackLogoUrl || "").trim();
  const logoUrl = effectiveLogoUrl;
  const linkTextColor = contentForRender?.menuLinkTextColor?.trim() || "#334155";
  const linkHoverColor = contentForRender?.menuLinkHoverColor?.trim() || "#0f172a";
  const linkColorVars = {
    "--nav-link-text": linkTextColor,
    "--nav-link-hover": linkHoverColor,
  } as CSSProperties;
  const linkColorStyle = (
    <style jsx global>{`
      @media (max-width: 767px) {
        .navbar-widget-link-colors nav.nav-mobile-dark-drawer a[data-nav-link="1"] {
          color: #e2e8f0 !important;
        }
        .navbar-widget-link-colors nav.nav-mobile-dark-drawer a[data-nav-link="1"]:hover {
          color: #ffffff !important;
        }
        .navbar-widget-link-colors nav:not(.nav-mobile-dark-drawer) a[data-nav-link="1"] {
          color: #0a0a0a !important;
        }
        .navbar-widget-link-colors nav:not(.nav-mobile-dark-drawer) a[data-nav-link="1"]:hover {
          color: #171717 !important;
        }
      }
      @media (min-width: 768px) {
        .navbar-widget-link-colors nav a[data-nav-link="1"] {
          color: var(--nav-link-text) !important;
        }
        .navbar-widget-link-colors nav a[data-nav-link="1"]:hover {
          color: var(--nav-link-hover) !important;
        }
        .navbar-widget-link-colors nav a[data-nav-link="1"] svg {
          color: inherit !important;
        }
        .navbar-widget-link-colors[data-navbar-variant="wing-split-pill"] nav a[data-nav-link="1"] {
          font-weight: 600 !important;
        }
        .navbar-widget-link-colors[data-navbar-variant="wing-split-pill"] nav [data-nav-flyout-panel] a {
          color: #0f172a !important;
          font-weight: 500 !important;
        }
        .navbar-widget-link-colors[data-navbar-variant="wing-split-pill"] nav [data-nav-flyout-panel] a:hover {
          color: #020617 !important;
        }
        .navbar-widget-link-colors[data-navbar-variant="pill-black"] nav.nav-pill-black-desktop > div > a[data-nav-link="1"] {
          color: #ffffff !important;
          font-weight: 500 !important;
        }
        .navbar-widget-link-colors[data-navbar-variant="pill-black"] nav.nav-pill-black-desktop > div > a[data-nav-link="1"]:hover {
          color: rgba(255, 255, 255, 0.88) !important;
        }
      }
    `}</style>
  );
  const links = (contentForRender?.links || []).filter((l) => {
    const type = linkTypeNormalized(l);
    if (type === "icon") return String(l?.icon || "").trim();
    if (type === "icon_label") {
      return Boolean(String(l?.icon || "").trim() || String(l?.label || "").trim());
    }
    return String(l?.label || "").trim();
  });
  const primaryLabel = contentForRender?.primaryButtonLabel?.trim() || "Sign in";
  const secondaryLabel = contentForRender?.secondaryButtonLabel?.trim() || "Register";

  const commonProps = { logoText, logoUrl, links, primaryLabel, secondaryLabel, content: contentForRender };

  let variantNode: ReactNode;
  switch (variant) {
    case "minimalist":
      variantNode = (
        <>
          <div className="navbar-widget-link-colors relative z-[70]" style={linkColorVars}>
            <NavbarMinimalist {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    case "dark-sidebar":
      variantNode = (
        <>
          <div className="navbar-widget-link-colors relative z-[70]" style={linkColorVars}>
            <NavbarDarkSidebar {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    case "business":
      variantNode = (
        <>
          <div
            className="navbar-widget-link-colors relative z-[90]"
            style={linkColorVars}
            data-navbar-variant="business"
          >
            <NavbarBusiness {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    case "business-2":
      variantNode = (
        <>
          <div
            className="navbar-widget-link-colors relative z-[90]"
            style={linkColorVars}
            data-navbar-variant="business-2"
          >
            <NavbarBusiness2 {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    case "developer":
      variantNode = (
        <>
          <div className="navbar-widget-link-colors relative z-[70]" style={linkColorVars}>
            <NavbarDeveloper {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    case "bold-left":
      variantNode = (
        <>
          <div className="navbar-widget-link-colors relative z-[70]" style={linkColorVars}>
            <NavbarBoldLeft {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    case "wing-split":
      variantNode = (
        <>
          <div
            className="navbar-widget-link-colors relative z-[110]"
            style={linkColorVars}
            data-navbar-variant="wing-split-pill"
          >
            <NavbarWingSplit {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    case "pill-black":
      variantNode = (
        <>
          <div
            className="navbar-widget-link-colors relative z-[110]"
            style={linkColorVars}
            data-navbar-variant="pill-black"
          >
            <NavbarPillBlack {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    case "retail-two-row":
      variantNode = (
        <>
          <div className="navbar-widget-link-colors relative z-[1]" style={linkColorVars}>
            <NavbarRetailTwoRow {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
    default:
      variantNode = (
        <>
          <div className="navbar-widget-link-colors relative z-[70]" style={linkColorVars}>
            <NavbarModern {...commonProps} />
          </div>
          {linkColorStyle}
        </>
      );
      break;
  }

  const variantRootZ =
    variant === "retail-two-row" ? "relative z-[50] isolate" : "relative z-[90] isolate";

  return (
    <CartCountContext.Provider value={cartItemCount}>
      <CartSubtotalContext.Provider value={cartSubtotal}>
        <div className={`${variantRootZ} w-full min-w-0`}>{variantNode}</div>
      </CartSubtotalContext.Provider>
    </CartCountContext.Provider>
  );
}
