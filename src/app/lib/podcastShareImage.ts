import { cache } from "react";
import {
  getHomepageData,
  getHomepageImageUrl,
  type HomepageBlock,
} from "@/app/services/homepageDataService";
import { getHomepageHeroBannersCached } from "@/app/services/activeBannersPublicService";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import type { Banner } from "@/app/lib/homepageBannerShared";
import {
  isBusinessSchemaNode,
  isPlainObject,
} from "@/app/lib/jsonLdMerge";

const MAX_SCHEMA_PHOTOS = 8;

export const isPodcastStore = cache(async (): Promise<boolean> => {
  const cfg = await getNavbarVariantTestPublicServer().catch(() => null);
  return String(cfg?.variant || "").toLowerCase() === "podcast";
});

export function isBrandMarkUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (/\/logo\/|\/favicon\/|\/footer\/social\/|\/footer\//.test(u)) return true;
  if (/\.svg(\?|$)/i.test(u.split("?")[0] || u)) return true;
  if (/(instagram|tiktok|tik-tok|facebook|whatsapp|pinterest)/.test(u)) {
    return true;
  }
  return false;
}

export function isStudioPhotoUrl(url: string | null | undefined): boolean {
  const u = String(url || "").trim();
  if (!u) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  if (isBrandMarkUrl(u)) return false;
  const path = u.split("?")[0] || u;
  return /\.(jpe?g|png|webp|avif)$/i.test(path);
}

function pushPhoto(out: string[], raw: string | null | undefined) {
  const absolute = getHomepageImageUrl(String(raw || "").trim());
  if (!isStudioPhotoUrl(absolute)) return;
  if (out.includes(absolute)) return;
  out.push(absolute);
}

function extractImgSrcs(html: string): string[] {
  const srcs: string[] = [];
  const re = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    if (match[1]) srcs.push(match[1]);
  }
  return srcs;
}

function collectPhotosFromHomepageBlocks(blocks: HomepageBlock[] | undefined): string[] {
  const out: string[] = [];
  if (!Array.isArray(blocks)) return out;

  for (const row of blocks) {
    for (const col of row.columns || []) {
      for (const block of col.blocks || []) {
        const content = block.content;
        if (block.type === "image" && isPlainObject(content)) {
          pushPhoto(out, String(content.url || ""));
          continue;
        }
        if (block.type !== "widget" || !isPlainObject(content)) continue;

        const widgetType = String(content.widgetType || "");
        if (widgetType === "gallery" && Array.isArray(content.items)) {
          for (const item of content.items) {
            if (isPlainObject(item)) pushPhoto(out, String(item.imageUrl || ""));
          }
        }
        if (widgetType === "slider" && Array.isArray(content.slides)) {
          for (const slide of content.slides) {
            if (isPlainObject(slide)) pushPhoto(out, String(slide.imageUrl || ""));
          }
        }
        if (widgetType === "htmlCss") {
          for (const src of extractImgSrcs(String(content.html || ""))) {
            pushPhoto(out, src);
          }
        }
      }
    }
  }

  return out;
}

export function firstUsableHeroShareImage(banners: Banner[] | undefined): string | null {
  if (!Array.isArray(banners)) return null;
  for (const banner of banners) {
    const candidates = [
      banner.extraImage,
      banner.backgroundMedia === "video" ? "" : banner.srcLarge,
      banner.backgroundMedia === "video" ? "" : banner.srcSmall,
      banner.srcLarge,
      banner.srcSmall,
    ];
    for (const candidate of candidates) {
      if (isStudioPhotoUrl(candidate)) return String(candidate).trim();
    }
  }
  return null;
}

export const getPodcastStudioPhotoUrls = cache(async (): Promise<string[]> => {
  if (!(await isPodcastStore())) return [];

  const [homepage, hero] = await Promise.all([
    getHomepageData().catch(() => null),
    getHomepageHeroBannersCached().catch(() => null),
  ]);

  const fromContent = collectPhotosFromHomepageBlocks(homepage?.blocks);
  const fromHero: string[] = [];
  for (const banner of hero?.banners || []) {
    pushPhoto(fromHero, banner.extraImage);
    pushPhoto(fromHero, banner.srcLarge);
    pushPhoto(fromHero, banner.srcSmall);
  }

  const merged: string[] = [];
  for (const url of [...fromContent, ...fromHero]) {
    if (!merged.includes(url)) merged.push(url);
    if (merged.length >= MAX_SCHEMA_PHOTOS) break;
  }
  return merged;
});

function imageFieldLooksLikeLogo(image: unknown): boolean {
  if (image == null) return true;
  if (typeof image === "string") {
    const trimmed = image.trim();
    return !trimmed || isBrandMarkUrl(trimmed);
  }
  if (Array.isArray(image)) {
    if (!image.length) return true;
    return image.every((item) => imageFieldLooksLikeLogo(item));
  }
  if (isPlainObject(image)) {
    const url = String(image.url || image.contentUrl || "").trim();
    return !url || isBrandMarkUrl(url);
  }
  return false;
}

export function applyPodcastStudioPhotosToJsonLd(
  nodes: Record<string, unknown>[],
  photoUrls: string[]
): Record<string, unknown>[] {
  if (!photoUrls.length) return nodes;
  const imageValue = photoUrls.length === 1 ? photoUrls[0] : photoUrls;

  const walk = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(walk);
    if (!isPlainObject(entry)) return entry;

    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry)) {
      next[key] = walk(value);
    }

    if (isBusinessSchemaNode(next) && imageFieldLooksLikeLogo(next.image)) {
      next.image = imageValue;
    }
    return next;
  };

  return nodes.map((node) => walk(node) as Record<string, unknown>);
}

export async function withPodcastStudioPhotos(
  nodes: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  if (!(await isPodcastStore())) return nodes;
  const photos = await getPodcastStudioPhotoUrls();
  return applyPodcastStudioPhotosToJsonLd(nodes, photos);
}
