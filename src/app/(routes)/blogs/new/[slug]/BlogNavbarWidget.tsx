"use client";
import {
  FiShoppingCart,
  FiUser,
  FiHome,
  FiGrid,
  FiTag,
  FiStar,
  FiDownload,
  FiPhone,
  FiSearch,
  FiMenu,
  FiX,
  FiChevronDown,
} from "react-icons/fi";
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { IconType } from "react-icons";
import * as FaIcons from "react-icons/fa";
import * as Fa6Icons from "react-icons/fa6";
import * as MdIcons from "react-icons/md";
import * as Io5Icons from "react-icons/io5";
import * as AiIcons from "react-icons/ai";
import * as BiIcons from "react-icons/bi";
import * as BsIcons from "react-icons/bs";
import * as RiIcons from "react-icons/ri";
import * as GiIcons from "react-icons/gi";
import * as TbIcons from "react-icons/tb";
import * as Hi2Icons from "react-icons/hi2";
import * as LuIcons from "react-icons/lu";



type NavbarLinkItem = {
  id?: string;
  label?: string;
  url?: string;
  icon?: string;
  linkType?: "label" | "icon";
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
    | "retail-two-row";
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
};

function resolveNavbarIconByName(iconName: string | undefined, fallback: IconType): IconType {
  const coreIconMap: Record<string, IconType> = {
    FiHome,
    FiGrid,
    FiStar,
    FiTag,
    FiShoppingCart,
    FiUser,
    FiDownload,
    FiPhone,
    FiSearch,
  };

  const globalIconMap: Record<string, IconType> = {
    ...coreIconMap,
    ...(FaIcons as Record<string, IconType>),
    ...(Fa6Icons as Record<string, IconType>),
    ...(MdIcons as Record<string, IconType>),
    ...(Io5Icons as Record<string, IconType>),
    ...(AiIcons as Record<string, IconType>),
    ...(BiIcons as Record<string, IconType>),
    ...(BsIcons as Record<string, IconType>),
    ...(RiIcons as Record<string, IconType>),
    ...(GiIcons as Record<string, IconType>),
    ...(TbIcons as Record<string, IconType>),
    ...(Hi2Icons as Record<string, IconType>),
    ...(LuIcons as Record<string, IconType>),
  };

  const normalized = String(iconName || "").trim();
  return globalIconMap[normalized] || fallback;
}

function resolveHref(raw?: string): string {
  const value = String(raw || "").trim();
  if (!value) return "#";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
}

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
          <span className="absolute -right-1 -top-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold leading-none text-white">
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
        <span className="absolute -right-1 -top-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold leading-none text-white">
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
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  const api = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!api) return value;

  // Mirror backend upload path conventions used by logo uploads.
  if (value.startsWith("/uploads/")) return `${api}${value}`;
  if (value.startsWith("/logo/") || value.startsWith("/favicon/")) return `${api}/uploads${value}`;
  if (value.startsWith("/")) return `${api}/uploads${value}`;
  return `${api}/uploads/${value}`;
}

function isIconLink(link: NavbarLinkItem): boolean {
  return link?.linkType === "icon";
}

function renderNavLinkContent(link: NavbarLinkItem, fallbackIcon: IconType = FiGrid) {
  if (isIconLink(link)) {
    const Icon = resolveNavbarIconByName(link?.icon, fallbackIcon);
    return <Icon className="h-4 w-4" />;
  }
  return link?.label || "";
}

function getDropdownChildren(link: NavbarLinkItem) {
  return (Array.isArray(link?.children) ? link.children : []).filter(
    (child) => String(child?.label || "").trim() && String(child?.url || "").trim()
  );
}

function NavLinkItemNode({
  link,
  i,
  linkClassName,
  fallbackIcon = FiGrid,
  onNavigate,
}: {
  link: NavbarLinkItem;
  i: number;
  linkClassName: string;
  fallbackIcon?: IconType;
  onNavigate?: () => void;
}) {
  const children = getDropdownChildren(link);
  if (children.length === 0) {
    return (
      <a
        key={link.id || i}
        href={resolveHref(link.url)}
        data-nav-link="1"
        className={linkClassName}
        onClick={onNavigate}
      >
        {renderNavLinkContent(link, fallbackIcon)}
      </a>
    );
  }

  return (
    <div key={link.id || i} className="group relative">
      <a href={resolveHref(link.url)} data-nav-link="1" className={linkClassName} onClick={onNavigate}>
        <span className="inline-flex items-center gap-1">
          {renderNavLinkContent(link, fallbackIcon)}
          <FiChevronDown className="h-3 w-3" />
        </span>
      </a>
      <div className="absolute left-0 top-full z-[80] hidden pt-1 group-hover:block group-focus-within:block">
  <div className="min-w-[220px] overflow-hidden rounded-md border border-slate-200/70 bg-white/95 p-2 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl">
    {children.map((child, childIndex) => (
      <a
        key={child.id || `${link.id || i}-child-${childIndex}`}
        href={resolveHref(child.url)}
        onClick={onNavigate}
        className="
          group/item flex items-center justify-between
          px-4 py-3 text-sm font-medium text-slate-700
          transition-all duration-200
          hover:bg-slate-50 hover:text-black
          hover:translate-x-1
        "
      >
        <span>{child.label}</span>

        <svg
          className="h-4 w-4 opacity-0 transition-all duration-200 group-hover/item:translate-x-1 group-hover/item:opacity-100"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </a>
    ))}
  </div>
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
        className={`fixed inset-0 z-[100] bg-black/40 md:hidden ${open ? "" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-[101] flex max-h-[100dvh] w-[min(100vw-2rem,20rem)] flex-col overflow-y-auto border-l border-black/10 shadow-2xl transition-transform duration-300 ease-out md:hidden ${panelClassName} ${open ? "translate-x-0" : "pointer-events-none translate-x-full"}`}
      >
        <div className={`flex shrink-0 items-center justify-between border-b border-black/10 px-4 py-3 ${headerClassName}`}>
          <span className="text-sm font-semibold">Menu</span>
          <button type="button" aria-label="Close menu" onClick={onClose} className={`rounded-lg p-2 ${closeButtonClassName}`}>
            <FiX className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-4 p-4">{children}</div>
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
  const ActionIcon1 = resolveNavbarIconByName(content?.actionIcon1, FiShoppingCart);
  const ActionIcon2 = resolveNavbarIconByName(content?.actionIcon2, FiUser);
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
  const PrimaryButtonIcon = resolveNavbarIconByName(content?.primaryButtonIcon, FiDownload);
  const SecondaryButtonIcon = resolveNavbarIconByName(content?.secondaryButtonIcon, FiPhone);
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
      className={`py-3 ${
        isClassicLayout
          ? "w-full px-0 sm:px-0"
          : "w-full px-3 sm:px-10"
      }`}
      style={sectionStyle}
    >

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

        {/* ================= LEFT: LOGO + mobile menu ================= */}
        <div className="flex w-full items-center justify-between md:w-auto md:justify-start">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="logo"
                className="h-10 w-auto max-w-[120px] rounded-md object-contain"
              />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-emerald-800 text-[11px] font-bold text-white">
                {logoText.slice(0, 2).toUpperCase()}
              </span>
            )}
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

        {/* ================= RIGHT: MENU (desktop) ================= */}
        <div
          className={`hidden w-full flex-wrap items-center gap-2 rounded-2xl bg-[#DEE3DE] p-2 sm:gap-4 sm:px-6 md:flex md:px-8 overflow-visible ${
            isClassicLayout ? "md:ml-auto md:w-auto" : "md:w-auto"
          }`}
          style={classicRightSectionBgStyle}
        >

          {/* LINKS */}
          <nav
            className={`flex w-full items-center gap-4 overflow-visible md:gap-6 ${
              hasRightEndContent ? "md:w-auto" : "md:w-full md:justify-center"
            }`}
          >
            {links.map((link, i) => (
              <NavLinkItemNode
                key={link.id || i}
                link={link}
                i={i}
                fallbackIcon={FiGrid}
                linkClassName="text-sm font-medium text-slate-700 transition hover:text-slate-900"
              />
            ))}
          </nav>

          {/* SEARCH */}
          {showSearch ? (
            <div className="hidden lg:flex items-center px-3 py-2">
              <input
                type="search"
                placeholder="Search"
                className="w-52 bg-transparent rounded-2xl text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          ) : null}

          {/* ================= ICONS (ADDED ONLY) ================= */}
          {showIcons ? (
          <div className="ml-auto flex items-center gap-2 md:ml-0">

            <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm hover:bg-emerald-800" style={actionIcon1Style}>
              <ActionIcon1 className="h-4 w-4" />
            </ActionIconLink>

            <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm hover:bg-emerald-800" style={actionIcon2Style}>
              <ActionIcon2 className="h-4 w-4" />
            </ActionIconLink>

          </div>
          ) : null}

          {/* PRIMARY BUTTON */}
          {showPrimaryButton || showSecondaryButton ? (
            <>
              {showPrimaryButton ? (
                <a
                  href={resolveHref(content?.primaryButtonUrl)}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                  style={primaryButtonStyle}
                >
                  <span className="inline-flex items-center gap-2">
                    <PrimaryButtonIcon className="h-4 w-4" />
                  {primaryLabel}
                  </span>
                </a>
              ) : null}

              {/* SECONDARY BUTTON */}
              {showSecondaryButton ? (
                <a
                  href={resolveHref(content?.secondaryButtonUrl)}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                  style={secondaryButtonStyle}
                >
                  <span className="inline-flex items-center gap-2">
                    <SecondaryButtonIcon className="h-4 w-4" />
                  {secondaryLabel}
                  </span>
                </a>
              ) : null}
            </>
          ) : null}

        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="bg-white text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="hover:bg-slate-100 text-slate-700"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={FiGrid}
              linkClassName="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <input
            type="search"
            placeholder="Search"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-4 w-4" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-4 w-4" />
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
  const primaryCtaLabel = content?.primaryButtonLabel?.trim() || "";
  const secondaryCtaLabel = content?.secondaryButtonLabel?.trim() || "";
  const ActionIcon1 = resolveNavbarIconByName(content?.actionIcon1, FiShoppingCart);
  const ActionIcon2 = resolveNavbarIconByName(content?.actionIcon2, FiUser);
  const actionIcon1Style: CSSProperties = {
    backgroundColor: content?.actionIcon1BgColor || "#000000",
    color: content?.actionIcon1Color || "#ffffff",
  };
  const actionIcon2Style: CSSProperties = {
    backgroundColor: content?.actionIcon2BgColor || "#f97316",
    color: content?.actionIcon2Color || "#ffffff",
  };
  const PrimaryButtonIcon = resolveNavbarIconByName(content?.primaryButtonIcon, FiDownload);
  const SecondaryButtonIcon = resolveNavbarIconByName(content?.secondaryButtonIcon, FiPhone);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  const businessCenterNavBgStyle = content?.classicRightSectionBgColor
    ? { backgroundColor: content.classicRightSectionBgColor }
    : undefined;
  const developerActionsBarStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  return (
    <header className="w-full bg-white" style={navbarBgStyle}>
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6 md:h-16 md:flex-row md:items-center md:justify-between md:py-0">
        <div className="flex w-full items-center justify-between md:hidden">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={`${logoText} logo`} className="h-12 w-12 rounded-md object-contain" />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold text-white">
                {logoText.slice(0, 2).toUpperCase()}
              </span>
            )}
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

        <nav className="hidden w-full items-center gap-10 overflow-visible md:flex md:w-auto">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={FiGrid}
              linkClassName="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            />
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {logoUrl ? (
            <img src={logoUrl} alt={`${logoText} logo`} className="h-32 w-32 rounded-md object-contain" />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-[11px] font-bold text-white">
              {logoText.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="hidden items-center gap-3 md:flex md:flex-nowrap">
          {showSearch ? (
            <div className="hidden items-center px-3 py-2 lg:flex">
              <input
                type="search"
                placeholder="Search"
                className="w-52 rounded-2xl bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          ) : null}

          {showIcons ? (
            <>
              <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50" style={actionIcon1Style}>
                <ActionIcon1 className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                  1
                </span>
              </ActionIconLink>

              <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50" style={actionIcon2Style}>
                <ActionIcon2 className="h-4 w-4" />
              </ActionIconLink>
            </>
          ) : null}

          {showPrimaryButton || showSecondaryButton ? (
            <>
              {showPrimaryButton ? (
                <a
                  href={resolveHref(content?.primaryButtonUrl)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                  style={primaryButtonStyle}
                >
                  <PrimaryButtonIcon className="h-3.5 w-3.5" />
                  {primaryLabel}
                </a>
              ) : null}
              {showSecondaryButton ? (
                <a
                  href={resolveHref(content?.secondaryButtonUrl)}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
                  style={secondaryButtonStyle}
                >
                  <SecondaryButtonIcon className="h-3.5 w-3.5" />
                  {secondaryLabel}
                </a>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="bg-white text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="hover:bg-slate-100 text-slate-700"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={FiGrid}
              linkClassName="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <input
            type="search"
            placeholder="Search"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-3.5 w-3.5" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white"
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-3.5 w-3.5" />
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
  const ActionIcon1 = resolveNavbarIconByName(content?.actionIcon1, FiShoppingCart);
  const ActionIcon2 = resolveNavbarIconByName(content?.actionIcon2, FiUser);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = resolveNavbarIconByName(content?.primaryButtonIcon, FiDownload);
  const SecondaryButtonIcon = resolveNavbarIconByName(content?.secondaryButtonIcon, FiPhone);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  const businessCenterNavBgStyle = content?.classicRightSectionBgColor
    ? { backgroundColor: content.classicRightSectionBgColor }
    : undefined;
  return (
    <header
      className="relative w-full rounded-3xl border-slate-800 bg-slate-950 text-white md:rounded-full overflow-visible"
      style={navbarBgStyle}
    >
      <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between px-4 py-3 sm:px-6 md:h-16 md:justify-between md:py-0">
        <div className="flex items-center gap-3 md:hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={`${logoText} logo`} className="h-12 w-12 rounded-md object-contain" />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
              {logoText.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label="Open menu"
          className="rounded-lg p-2 text-white md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <FiMenu className="h-6 w-6" aria-hidden />
        </button>

        <div className="relative hidden h-16 w-full items-center md:flex">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={`${logoText} logo`} className="h-24 w-24 rounded-md object-contain" />
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
                {logoText.slice(0, 2).toUpperCase()}
              </span>
            )}
            {showSearch ? (
              <div className="hidden items-center gap-2 rounded-full px-6 py-1.5 text-slate-300 lg:flex">
                <input
                  type="search"
                  placeholder="Search products..."
                  className="w-56 rounded-2xl bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>
            ) : null}
          </div>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            {links.map((link, i) => (
              <NavLinkItemNode
                key={link.id || i}
                link={link}
                i={i}
                fallbackIcon={FiGrid}
                linkClassName="text-sm font-medium text-slate-300 transition hover:text-white"
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {showIcons ? (
              <>
                <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/20 text-white shadow-sm backdrop-blur-sm hover:bg-white/30" style={actionIcon1Style}>
                  <ActionIcon1 className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                    2
                  </span>
                </ActionIconLink>
                <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/20 text-white shadow-sm backdrop-blur-sm hover:bg-white/30" style={actionIcon2Style}>
                  <ActionIcon2 className="h-4 w-4" />
                </ActionIconLink>
              </>
            ) : null}
            {showPrimaryButton || showSecondaryButton ? (
              <>
                {showPrimaryButton ? (
                  <a
                    href={resolveHref(content?.primaryButtonUrl)}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                    style={primaryButtonStyle}
                  >
                    <PrimaryButtonIcon className="h-3.5 w-3.5" />
                    {content?.primaryButtonLabel?.trim() || "Sign in"}
                  </a>
                ) : null}
                {showSecondaryButton ? (
                  <a
                    href={resolveHref(content?.secondaryButtonUrl)}
                    className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
                    style={secondaryButtonStyle}
                  >
                    <SecondaryButtonIcon className="h-3.5 w-3.5" />
                    {secondaryLabel}
                  </a>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="border-l border-slate-700 bg-slate-950 text-white"
        headerClassName="border-slate-700 text-white"
        closeButtonClassName="hover:bg-white/10 text-white"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={FiGrid}
              linkClassName="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <input
            type="search"
            placeholder="Search products..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
          />
        ) : null}
        {showIcons ? (
          <div className="flex gap-2">
            <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/20 text-white shadow-sm backdrop-blur-sm" style={actionIcon1Style}>
              <ActionIcon1 className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                2
              </span>
            </ActionIconLink>
            <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/20 text-white shadow-sm backdrop-blur-sm" style={actionIcon2Style}>
              <ActionIcon2 className="h-4 w-4" />
            </ActionIconLink>
          </div>
        ) : null}
        {showPrimaryButton || showSecondaryButton ? (
          <div className="flex flex-col gap-2">
            {showPrimaryButton ? (
              <a
                href={resolveHref(content?.primaryButtonUrl)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-3.5 w-3.5" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white"
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-3.5 w-3.5" />
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
  const ActionIcon1 = resolveNavbarIconByName(content?.actionIcon1, FiShoppingCart);
  const ActionIcon2 = resolveNavbarIconByName(content?.actionIcon2, FiUser);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = resolveNavbarIconByName(content?.primaryButtonIcon, FiDownload);
  const SecondaryButtonIcon = resolveNavbarIconByName(content?.secondaryButtonIcon, FiPhone);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const businessCenterNavBgStyle =
    content?.navbarBgColor || content?.classicRightSectionBgColor
      ? {
          backgroundColor:
            content?.navbarBgColor || content?.classicRightSectionBgColor,
        }
      : undefined;
  return (
    <header className="relative w-full px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between md:hidden">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={`${logoText} logo`} className="h-14 w-14 rounded-md object-contain" />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
              {logoText.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <button type="button" aria-label="Open menu" className="rounded-lg p-2 text-slate-800" onClick={() => setMobileOpen(true)}>
          <FiMenu className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <div className="relative hidden min-h-[5rem] items-center md:flex md:justify-between md:gap-6">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={`${logoText} logo`} className="h-24 w-24 rounded-md object-contain" />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
              {logoText.slice(0, 2).toUpperCase()}
            </span>
          )}
          {showSearch ? (
            <div className="hidden px-8 lg:flex">
              <input
                type="search"
                placeholder="Search..."
                className="w-58 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          ) : null}
        </div>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 overflow-visible rounded-full bg-black px-3 py-1.5 md:flex"
          style={businessCenterNavBgStyle}
        >
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={FiGrid}
              linkClassName="rounded-full px-4 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            />
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-3 md:flex-nowrap">
          {showIcons ? (
            <>
              <ActionIconLink href={content?.actionIcon1Url} openCartOnClick={content?.actionIcon1OpenCart === true} onOpenCart={content?.onOpenCart} className="relative flex h-10 w-10 items-center justify-center rounded-full" style={actionIcon1Style}>
                <ActionIcon1 className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                  2
                </span>
              </ActionIconLink>
              <ActionIconLink href={content?.actionIcon2Url} openCartOnClick={content?.actionIcon2OpenCart === true} onOpenCart={content?.onOpenCart} className="flex h-10 w-10 items-center justify-center rounded-full" style={actionIcon2Style}>
                <ActionIcon2 className="h-4 w-4" />
              </ActionIconLink>
            </>
          ) : null}
          {showPrimaryButton || showSecondaryButton ? (
            <>
              {showPrimaryButton ? (
                <a
                  href={resolveHref(content?.primaryButtonUrl)}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                  style={primaryButtonStyle}
                >
                  <PrimaryButtonIcon className="h-4 w-4" />
                  {primaryLabel}
                </a>
              ) : null}
              {showSecondaryButton ? (
                <a
                  href={resolveHref(content?.secondaryButtonUrl)}
                  className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                  style={secondaryButtonStyle}
                >
                  <SecondaryButtonIcon className="h-4 w-4" />
                  {secondaryLabel}
                </a>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="bg-white text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="hover:bg-slate-100 text-slate-700"
      >
        <nav className="flex flex-col gap-2">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={FiGrid}
              linkClassName="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
        {showSearch ? (
          <input
            type="search"
            placeholder="Search..."
            className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-4 w-4" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-4 w-4" />
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </NavbarMobileDrawer>
    </header>
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
  const ActionIcon1 = resolveNavbarIconByName(content?.actionIcon1, FiShoppingCart);
  const ActionIcon2 = resolveNavbarIconByName(content?.actionIcon2, FiUser);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton !== false;
  const showSecondaryButton = content?.showSecondaryButton !== false;
  const PrimaryButtonIcon = resolveNavbarIconByName(content?.primaryButtonIcon, FiDownload);
  const SecondaryButtonIcon = resolveNavbarIconByName(content?.secondaryButtonIcon, FiPhone);
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
    if (key.includes("home")) return resolveNavbarIconByName(iconCode, FiHome);
    if (key.includes("product") || key.includes("shop")) return resolveNavbarIconByName(iconCode, FiGrid);
    if (key.includes("feature")) return resolveNavbarIconByName(iconCode, FiStar);
    if (key.includes("pricing") || key.includes("deal")) return resolveNavbarIconByName(iconCode, FiTag);
    return resolveNavbarIconByName(iconCode, FiGrid);
  };

  return (
    <header
      className="w-full px-4 py-3 sm:px-6"
      // style={navbarBgStyle}
    >
      <div className="flex items-center justify-between md:hidden">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={`${logoText} logo`} className="h-14 w-14 rounded-lg object-contain" />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
              {logoText.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <button type="button" aria-label="Open menu" className="rounded-lg p-2 text-slate-800" onClick={() => setMobileOpen(true)}>
          <FiMenu className="h-6 w-6" aria-hidden />
        </button>
      </div>

      <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={`${logoText} logo`} className="h-24 w-24 rounded-lg object-contain" />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
              {logoText.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {showSearch ? (
          <div className="flex w-full md:flex-1 md:max-w-md">
            <div className="relative w-full">
              <input
                type="search"
                placeholder="Search anything..."
                className="
                  w-full rounded-full border border-slate-200 bg-slate-50
                  px-4 py-2 text-sm text-slate-700
                  outline-none transition
                  focus:border-violet-400 focus:bg-white
                "
              />
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <div className="flex w-full items-center gap-2 md:w-auto">
          <div
            className="flex w-full items-center gap-2 overflow-visible rounded-full bg-slate-900/95 p-1.5 px-4 shadow-lg backdrop-blur-md md:w-auto"
            style={developerActionsBarStyle}
          >
            <nav className="flex items-center gap-1">
              {links.map((link, i) => {
                const Icon = getLinkIcon(link.label, link.icon);
                return (
                  <a
                    key={link.id || i}
                    href={resolveHref(link.url)}
                    data-nav-link="1"
                    className="
                      group relative flex h-10 w-10 items-center justify-center
                      rounded-full text-white/80
                      transition-all duration-200
                      hover:-translate-y-1 hover:bg-white/10 hover:text-white
                    "
                    title={link.label || link.icon || "Link"}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white opacity-0 transition group-hover:opacity-100" />
                  </a>
                );
              })}
            </nav>

            {showIcons ? (
              <>
                <button
                  className="
                    relative flex h-11 w-11 items-center justify-center
                    rounded-full bg-orange-500 text-white
                    transition-all duration-200
                    hover:-translate-y-1 hover:shadow-lg hover:bg-orange-600
                  "
                  title="Cart"
                  type="button"
                  style={actionIcon1Style}
                >
                  <ActionIcon1 className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-orange-600">
                    2
                  </span>
                </button>

                <button
                  className="
                    flex h-11 w-11 items-center justify-center
                    rounded-full bg-violet-500 text-white
                    transition-all duration-200
                    hover:-translate-y-1 hover:shadow-lg hover:bg-violet-600
                  "
                  title="User"
                  type="button"
                  style={actionIcon2Style}
                >
                  <ActionIcon2 className="h-5 w-5" />
                </button>
              </>
            ) : null}

            {showPrimaryButton || showSecondaryButton ? (
              <>
                {showPrimaryButton ? (
                  <a
                    href={resolveHref(content?.primaryButtonUrl)}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                    style={primaryButtonStyle}
                  >
                    <PrimaryButtonIcon className="h-3.5 w-3.5" />
                    {content?.primaryButtonLabel?.trim() || "Sign in"}
                  </a>
                ) : null}
                {showSecondaryButton ? (
                  <a
                    href={resolveHref(content?.secondaryButtonUrl)}
                    className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
                    style={secondaryButtonStyle}
                  >
                    <SecondaryButtonIcon className="h-3.5 w-3.5" />
                    {secondaryLabel}
                  </a>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="bg-white text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-700 hover:bg-slate-100"
      >
        <nav className="flex flex-col gap-1">
          {links.map((link, i) => {
            const Icon = getLinkIcon(link.label, link.icon);
            return (
              <a
                key={link.id || i}
                href={resolveHref(link.url)}
                data-nav-link="1"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                {!isIconLink(link) ? (
                  <span>{renderNavLinkContent(link, FiGrid)}</span>
                ) : (
                  <span>{link.label?.trim() || "Link"}</span>
                )}
              </a>
            );
          })}
        </nav>
        {showSearch ? (
          <input
            type="search"
            placeholder="Search anything..."
            className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:bg-white"
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-3.5 w-3.5" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white"
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-3.5 w-3.5" />
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
  const ActionIcon1 = resolveNavbarIconByName(content?.actionIcon1, FiShoppingCart);
  const ActionIcon2 = resolveNavbarIconByName(content?.actionIcon2, FiUser);
  const actionIcon1Style = resolveActionIconButtonStyle(content, 1);
  const actionIcon2Style = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = resolveNavbarIconByName(content?.primaryButtonIcon, FiDownload);
  const SecondaryButtonIcon = resolveNavbarIconByName(content?.secondaryButtonIcon, FiPhone);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;

  return (
    <header className="w-full bg-white" style={navbarBgStyle}>
      <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 px-4 py-3 shadow-sm sm:px-6 md:h-16 md:py-0">
        <div className="flex items-center justify-between md:hidden">
          <div className="flex h-10 w-10 items-center justify-center overflow-visible">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="h-14 w-14 object-contain" />
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
                {logoText.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <button type="button" aria-label="Open menu" className="rounded-lg p-2 text-slate-800" onClick={() => setMobileOpen(true)}>
            <FiMenu className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <div className="hidden md:flex md:h-16 md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-visible">
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="h-14 w-14 object-contain" />
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
                  {logoText.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <nav className="flex shrink-0 items-center px-8 gap-4 md:gap-6 lg:gap-8">
            {links.map((link, i) => {
              const isActive = link.label === active;
              return (
                <a
                  key={i}
                  href={resolveHref(link.url)}
                  data-nav-link="1"
                  className="relative text-sm font-medium text-slate-700 transition hover:text-orange-500"
                >
                  {renderNavLinkContent(link, FiGrid)}
                  {isActive ? <span className="absolute -bottom-2 left-0 h-0.5 w-full rounded-full bg-orange-500" /> : null}
                </a>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-[5px]">
  {showSearch ? (
    <div className="hidden lg:flex h-9 items-center rounded-full bg-slate-100 px-3">
      <FiSearch className="h-3.5 w-3.5 text-slate-400" />

      <input
        type="search"
        placeholder="Search..."
        className="
          ml-2
          w-40
          border-0
          bg-transparent
          text-sm
          text-slate-700
          placeholder:text-slate-400
          outline-none
          ring-0
          focus:border-0
          focus:outline-none
          focus:ring-0
          focus-visible:outline-none
          focus-visible:ring-0
          appearance-none
          [-webkit-appearance:none]
        "
      />
    </div>
  ) : null}

  {showIcons ? (
    <>
      <button
        className="flex h-9 w-9 items-center justify-center rounded-full transition"
        style={{
          backgroundColor: content?.actionIcon1BgColor || "#f1f5f9",
          color: content?.actionIcon1Color || "#334155",
          ...actionIcon1Style,
        }}
      >
        <ActionIcon1 className="h-4 w-4" />
      </button>

      <button
        className="flex h-9 w-9 items-center justify-center rounded-full transition"
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
      className="inline-flex h-9 items-center gap-2 rounded-full bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
      style={primaryButtonStyle}
    >
      <PrimaryButtonIcon className="h-4 w-4" />
      {primaryLabel}
    </a>
  ) : null}

  {showSecondaryButton ? (
    <a
      href={resolveHref(content?.secondaryButtonUrl)}
      className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
      style={secondaryButtonStyle}
    >
      <SecondaryButtonIcon className="h-4 w-4" />
      {secondaryLabel}
    </a>
  ) : null}
</div>
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="bg-white text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-700 hover:bg-slate-100"
      >
        <nav className="flex flex-col gap-1">
          {links.map((link, i) => {
            const isActive = link.label === active;
            return (
              <a
                key={i}
                href={resolveHref(link.url)}
                data-nav-link="1"
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-100 ${isActive ? "text-orange-600" : "text-slate-700"}`}
                onClick={() => setMobileOpen(false)}
              >
                {renderNavLinkContent(link, FiGrid)}
              </a>
            );
          })}
        </nav>
        {showSearch ? (
          <div className="flex items-center rounded-md border border-slate-200 bg-white px-3 py-2">
            <FiSearch className="h-4 w-4 text-slate-500" />
            <input
              type="search"
              placeholder="Search"
              className="ml-2 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                style={primaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <PrimaryButtonIcon className="h-4 w-4" />
                {primaryLabel}
              </a>
            ) : null}
            {showSecondaryButton ? (
              <a
                href={resolveHref(content?.secondaryButtonUrl)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                style={secondaryButtonStyle}
                onClick={() => setMobileOpen(false)}
              >
                <SecondaryButtonIcon className="h-4 w-4" />
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
  const cartSubtotal = useContext(CartSubtotalContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showSearch = content?.showSearch !== false;
  const showIcons = content?.showButtons !== false;
  const showPrimaryButton = content?.showPrimaryButton === true;
  const showSecondaryButton = content?.showSecondaryButton === true;
  const primaryCtaLabel = content?.primaryButtonLabel?.trim() || "";
  const secondaryCtaLabel = content?.secondaryButtonLabel?.trim() || "";
  const UserIcon = resolveNavbarIconByName(content?.actionIcon1, FiUser);
  const CartIcon = resolveNavbarIconByName(content?.actionIcon2, FiShoppingCart);
  const userIconStyle = resolveActionIconButtonStyle(content, 1);
  const cartIconStyle = resolveActionIconButtonStyle(content, 2);
  const PrimaryButtonIcon = resolveNavbarIconByName(content?.primaryButtonIcon, FiDownload);
  const SecondaryButtonIcon = resolveNavbarIconByName(content?.secondaryButtonIcon, FiPhone);
  const primaryButtonStyle = resolvePrimaryButtonStyle(content);
  const secondaryButtonStyle = resolveSecondaryButtonStyle(content);
  const navbarBgStyle = content?.navbarBgColor
    ? { backgroundColor: content.navbarBgColor }
    : undefined;
  const retailLinksBarBgStyle = content?.classicRightSectionBgColor
    ? { backgroundColor: content.classicRightSectionBgColor }
    : undefined;

  return (
    <header className="w-full" style={navbarBgStyle}>
      <div className="w-full px-4 py-3 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3 md:hidden">
          {logoUrl ? (
            <img src={logoUrl} alt={`${logoText} logo`} className="h-10 w-auto object-contain" />
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
              {logoText.slice(0, 2).toUpperCase()}
            </span>
          )}
          <button
            type="button"
            aria-label="Open menu"
            className="ml-auto rounded-lg p-2 text-slate-800"
            onClick={() => setMobileOpen(true)}
          >
            <FiMenu className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <div className="hidden items-center justify-between gap-8 lg:flex">
          <div className="min-w-[170px]">
            {logoUrl ? (
              <img src={logoUrl} alt={`${logoText} logo`} className="h-12 w-auto object-contain" />
            ) : (
              <span className="text-lg font-semibold text-slate-900">{logoText}</span>
            )}
          </div>

          {showSearch ? (
            <div className="w-[53%] px-2 lg:px-6">
              <div className="flex h-12 items-center rounded-md border border-slate-300 bg-white px-4">
                <input
                  type="search"
                  placeholder="Search for Products"
                  className="w-full appearance-none border-0 bg-transparent text-sm text-slate-700 outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none placeholder:text-slate-400"
                />
                <FiSearch className="ml-3 h-4 w-4 text-slate-500" />
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex min-w-0 shrink items-center justify-end gap-2 text-slate-900 xl:gap-3">
            <div className="shrink-0 text-right leading-tight">
              <p className="text-[11px] text-slate-600">Need Help?</p>
              <a
                href={`tel:${String(content?.secondaryButtonLabel?.trim() || "0333 344 8147").replace(/[^\d+]/g, "")}`}
                className="text-[13px] font-bold tracking-tight text-slate-700 hover:text-slate-900 hover:underline focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary rounded-sm xl:text-[14px]"
              >
                {content?.secondaryButtonLabel?.trim() || "0333 344 8147"}
              </a>
            </div>
            {showIcons ? (
              <>
                <div className="flex items-center gap-2 xl:gap-3">

                      {/* Cart */}
                      <ActionIconLink
                    href={content?.actionIcon2Url}
                    openCartOnClick={content?.actionIcon2OpenCart === true}
                    onOpenCart={content?.onOpenCart}
                    className="inline-flex items-center justify-center"
                    style={cartIconStyle}
                  >
                    <CartIcon className="h-6 w-6 xl:h-7 xl:w-7 text-slate-800" />
                  </ActionIconLink>
                  
                  {/* Basket text */}
                  <div className="text-right leading-tight">
                    <p className="text-[10px] text-slate-600">Basket</p>
                    <p className="text-[12px] font-bold leading-none text-slate-900 xl:text-[13px]">
                      £{cartSubtotal.toFixed(2)}
                    </p>
                  </div>
                  {/* User */}
                  <ActionIconLink
                    href={content?.actionIcon1Url}
                    openCartOnClick={content?.actionIcon1OpenCart === true}
                    onOpenCart={content?.onOpenCart}
                    className="inline-flex items-center justify-center"
                    style={userIconStyle}
                  >
                    <UserIcon className="h-6 w-6 xl:h-7 xl:w-7 text-slate-800" />
                  </ActionIconLink>


              
                </div>
              </>
            ) : null}
            {showPrimaryButton ? (
              <div className="ml-1 flex items-center gap-2">
                {showPrimaryButton && primaryCtaLabel ? (
                  <a
                    href={resolveHref(content?.primaryButtonUrl)}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                    style={primaryButtonStyle}
                  >
                    <PrimaryButtonIcon className="h-3.5 w-3.5" />
                    {primaryCtaLabel}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="w-full bg-[#fdf4df]" style={retailLinksBarBgStyle}>
        <div className="w-full px-6 p-1 sm:px-10 lg:px-14">
          <nav className="hidden h-12 items-center justify-center gap-10 overflow-visible lg:flex">
            {links.map((link, i) => (
              <NavLinkItemNode
                key={link.id || i}
                link={link}
                i={i}
                fallbackIcon={FiGrid}
                linkClassName="relative text-base text-white transition hover:text-white/90"
              />
            ))}
          </nav>
        </div>
      </div>

      <NavbarMobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        panelClassName="bg-white text-slate-900"
        headerClassName="border-slate-200 text-slate-900"
        closeButtonClassName="text-slate-700 hover:bg-slate-100"
      >
        {showSearch ? (
          <div className="flex items-center rounded-md border border-slate-300 px-3">
            <input
              type="search"
              placeholder="Search for Products"
              className="h-11 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <FiSearch className="h-4 w-4 text-slate-500" />
          </div>
        ) : null}
        <nav className="flex flex-col gap-1">
          {links.map((link, i) => (
            <NavLinkItemNode
              key={link.id || i}
              link={link}
              i={i}
              fallbackIcon={FiGrid}
              linkClassName="rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>
      </NavbarMobileDrawer>
    </header>
  );
}


export default function BlogNavbarWidget({ content }: { content: NavbarWidgetContent }) {
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartSubtotal, setCartSubtotal] = useState(0);

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
    content?.variant ||
    fallbackVariantByLayout[String(content?.layout || "classic")] ||
    "modern";
  const logoText = content?.logoText?.trim() || "";
  const widgetLogoUrl = resolveAssetSrc(content?.logoUrl);
  const [fallbackLogoUrl, setFallbackLogoUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (widgetLogoUrl) return () => void 0;

    const base = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (!base) return () => void 0;

    const endpoints = [
      `${base}/get/logo/public`,
      `${base}/api/get/logo/public`,
      `${base}/get/logo`,
      `${base}/api/get/logo`,
    ];

    const loadLogo = async () => {
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, { method: "GET" });
          if (!res.ok) continue;
          const json = await res.json();
          const resolved = resolveAssetSrc(json?.data?.logoUrl);
          if (!resolved) continue;
          if (!cancelled) setFallbackLogoUrl(resolved);
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

  // Keep logo-only rendering across all variants. Use transparent pixel until actual logo resolves.
  const logoUrl =
    widgetLogoUrl ||
    fallbackLogoUrl ||
    "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
  const linkTextColor = content?.menuLinkTextColor?.trim() || "#334155";
  const linkHoverColor = content?.menuLinkHoverColor?.trim() || "#0f172a";
  const linkColorVars = {
    "--nav-link-text": linkTextColor,
    "--nav-link-hover": linkHoverColor,
  } as CSSProperties;
  const linkColorStyle = (
    <style jsx global>{`
      .navbar-widget-link-colors nav a[data-nav-link="1"] {
        color: var(--nav-link-text) !important;
      }
      .navbar-widget-link-colors nav a[data-nav-link="1"]:hover {
        color: var(--nav-link-hover) !important;
      }
    `}</style>
  );
  const links = (content?.links || []).filter((l) => {
    const type = String(l?.linkType || "label").toLowerCase();
    if (type === "icon") return String(l?.icon || "").trim();
    return String(l?.label || "").trim();
  });
  const primaryLabel = content?.primaryButtonLabel?.trim() || "Sign in";
  const secondaryLabel = content?.secondaryButtonLabel?.trim() || "Register";

  const commonProps = { logoText, logoUrl, links, primaryLabel, secondaryLabel, content };

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
          <div className="navbar-widget-link-colors relative z-[70]" style={linkColorVars}>
            <NavbarBusiness {...commonProps} />
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
    case "retail-two-row":
      variantNode = (
        <>
          <div className="navbar-widget-link-colors relative z-[70]" style={linkColorVars}>
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

  return (
    <CartCountContext.Provider value={cartItemCount}>
      <CartSubtotalContext.Provider value={cartSubtotal}>
        {variantNode}
      </CartSubtotalContext.Provider>
    </CartCountContext.Provider>
  );
}
