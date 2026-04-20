"use client";
import React, { useMemo } from "react";
import {
  renderVariantOptionIcon,
  type VariantOptionIconish,
} from "./variantOptionIcons";

export interface ComesWithItem extends VariantOptionIconish {
  slug: string;
  name: string;
  description: string | null;
  /** Set by API when slug matches VariantAttribute; false = stale slug placeholder */
  fromCatalog?: boolean;
}

const DefaultIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

function hasAnyMedia(item: ComesWithItem): boolean {
  const img = item.image?.url || item.image?.path;
  return Boolean(item.icon || item.description || img);
}

/** Keep rows that exist in the catalog (or legacy payloads that look enriched). */
function isCatalogComesWithRow(item: ComesWithItem): boolean {
  if (item.fromCatalog === false) return false;
  if (item.fromCatalog === true) return true;
  return hasAnyMedia(item);
}

function dedupeBySlug(items: ComesWithItem[]): ComesWithItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.slug)) return false;
    seen.add(i.slug);
    return true;
  });
}

export default function ComesWith({
  product,
  comesWithItemsPopulated,
  onItemClick,
}: {
  product: any;
  comesWithItemsPopulated?: ComesWithItem[];
  onItemClick?: (item: ComesWithItem) => void;
}) {
  const comesWithItems: ComesWithItem[] = useMemo(() => {
    const slugs: string[] = product?.comesWithItems || [];
    const populated = (comesWithItemsPopulated || []) as ComesWithItem[];

    let list: ComesWithItem[];

    if (populated.length > 0) {
      const catalogRows = populated.filter(isCatalogComesWithRow);
      const hasExplicitFromCatalog = populated.some(
        (i) => typeof i.fromCatalog === "boolean"
      );
      if (catalogRows.length > 0) {
        list = catalogRows;
      } else if (hasExplicitFromCatalog) {
        list = [];
      } else {
        list = populated;
      }
    } else {
      list = slugs.map((slug) => ({
        slug,
        name: slug
          .split(/[-_]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        icon: null,
        description: null,
      }));
    }

    return dedupeBySlug(list);
  }, [comesWithItemsPopulated, product?.comesWithItems]);

  const renderIcon = (item: ComesWithItem) => {
    const node = renderVariantOptionIcon(
      item,
      "h-5 w-5",
      "flex items-center justify-center [&>i]:text-lg [&>svg]:w-5 [&>svg]:h-5"
    );
    if (node) return node;
    return <DefaultIcon />;
  };

  const handleItemClick = (item: ComesWithItem) => {
    if (onItemClick) onItemClick(item);
  };

  if (comesWithItems.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold leading-6 text-gray-900 mb-2">
        Comes with
      </h2>
      <div className="grid md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 grid-cols-2 justify-start gap-3 items-stretch">
        {comesWithItems.map((item) => (
          <div
            key={item.slug}
            className="flex min-w-0 flex-row items-center gap-2 border p-2 rounded-lg bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => handleItemClick(item)}
          >
            <div className="h-6 w-6 shrink-0 flex items-center justify-center">
              {renderIcon(item)}
            </div>
            <span className="min-w-0 flex-1 cursor-pointer text-xs font-medium leading-snug text-gray-900 break-anywhere">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
