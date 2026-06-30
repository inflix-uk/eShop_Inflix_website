import { cache } from "react";
import { cmsServerFetchJson } from "@/app/lib/cmsServerFetch";
import type { NavbarItem } from "@/app/lib/features/navbarcategories/navbarTypes";
import { normalizeNavbarItemsForPublicNav } from "@/app/lib/features/navbarcategories/navbarCategoryNormalize";
import { getLogo } from "@/app/services/logoService";
import {
  DEFAULT_HEADER_SUPPORT_EMAIL,
  DEFAULT_HEADER_SUPPORT_PHONE,
  fetchNavbarHeaderPublic,
} from "@/app/services/navbarHeaderPublicService";
import { DEFAULT_LOGO_ALT } from "@/lib/storeIdentity";

export type HomeNavbarServerBootstrap = {
  items: NavbarItem[];
  logoUrl: string | null;
  logoAlt: string;
  supportPhone: string;
  supportEmail: string;
};

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

function extractNavbarRowsFromUpstream(body: unknown): unknown {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && "data" in body) {
    const d = (body as { data: unknown }).data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === "object" && d !== null && "data" in d) {
      const inner = (d as { data: unknown }).data;
      if (Array.isArray(inner)) return inner;
    }
  }
  return [];
}

async function fetchNavbarCategoriesUpstream(): Promise<NavbarItem[]> {
  const base = apiBase();
  if (!base) return [];
  try {
    const json = await cmsServerFetchJson<unknown>(
      `${base}/get/category/for/navbar`
    );
    const rows = extractNavbarRowsFromUpstream(json);
    return normalizeNavbarItemsForPublicNav(rows);
  } catch (e) {
    console.warn("[navbarCriticalServer] navbar categories fetch failed:", e);
    return [];
  }
}

/** Homepage above-the-fold: logo, header phone, category row — same sources as client `Nav`. */
export const getHomeNavbarCriticalServer = cache(async (): Promise<HomeNavbarServerBootstrap> => {
  const [logo, header, items] = await Promise.all([
    getLogo().catch((e) => {
      console.warn("[navbarCriticalServer] logo fetch failed:", e);
      return null;
    }),
    fetchNavbarHeaderPublic().catch((e) => {
      console.warn("[navbarCriticalServer] header fetch failed:", e);
      return {
        supportPhone: DEFAULT_HEADER_SUPPORT_PHONE,
        supportEmail: DEFAULT_HEADER_SUPPORT_EMAIL,
      };
    }),
    fetchNavbarCategoriesUpstream(),
  ]);

  return {
    items,
    logoUrl: logo?.logoUrl ?? null,
    logoAlt: logo?.altText?.trim() ? logo.altText.trim() : DEFAULT_LOGO_ALT,
    supportPhone: header.supportPhone || DEFAULT_HEADER_SUPPORT_PHONE,
    supportEmail: header.supportEmail || DEFAULT_HEADER_SUPPORT_EMAIL,
  };
});
