import type { NavbarCategoryItem, NavbarItem } from "./navbarTypes";
import { isNavbarCustom } from "./navbarTypes";

export function normalizeNavbarPayload(raw: unknown): NavbarItem[] {
  if (!Array.isArray(raw)) return [];
  const out: NavbarItem[] = [];
  for (const row of raw as Record<string, unknown>[]) {
    if (row?.itemType === "custom") {
      out.push({
        itemType: "custom",
        _id: String(row._id),
        label: String(row.label ?? ""),
        path: String(row.path ?? ""),
        order: Number(row.order) || 0,
        subCategory: [],
      });
    } else {
      const cat: NavbarCategoryItem = {
        _id: String(row._id),
        name: String(row.name ?? ""),
        isPublish: Boolean(row.isPublish),
        isFeatured: Boolean(row.isFeatured),
        subCategory: Array.isArray(row.subCategory)
          ? (row.subCategory as string[])
          : [],
        order: Number(row.order) || 0,
        Logo: row.Logo as NavbarCategoryItem["Logo"],
        bannerImage: row.bannerImage as NavbarCategoryItem["bannerImage"],
      };
      out.push(cat);
    }
  }
  return out;
}

/** Same filtering/sort as `fetchNavbarCategory` fulfilled payload. */
export function normalizeNavbarItemsForPublicNav(raw: unknown): NavbarItem[] {
  const normalized = normalizeNavbarPayload(raw);
  return normalized
    .filter((item) => isNavbarCustom(item) || item.isPublish)
    .sort((a, b) => a.order - b.order);
}
