"use client";

import React from "react";
import TrustpilotWidget from "./TrustpilotWidget";
import { renderVariantOptionIcon } from "./variantOptionIcons";

export interface TopSectionItem {
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  image?: {
    filename?: string;
    path?: string;
    url?: string;
  } | null;
}

// Fallback SVG icon when no icon is provided
const DefaultIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const renderIcon = (item: TopSectionItem) => {
  const node = renderVariantOptionIcon(
    item,
    "h-6 w-6",
    "flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center text-gray-800 [&>i]:inline-block [&>i]:text-xl [&>svg]:h-6 [&>svg]:w-6"
  );
  if (node) return node;
  return <DefaultIcon />;
};

export default function DeliverySection({
  isZoomed,
  product,
  topSectionItemsPopulated,
  onItemClick,
}: {
  isZoomed: boolean;
  product: any;
  topSectionItemsPopulated?: TopSectionItem[];
  onItemClick?: (item: TopSectionItem) => void;
}) {
  // Use populated items if available, otherwise fall back to slugs
  const hasPopulatedItems = topSectionItemsPopulated && topSectionItemsPopulated.length > 0;
  const topSectionSlugs: string[] = product?.topSectionItems || [];

  // Convert slugs to items if not populated
  const topSectionItems: TopSectionItem[] = hasPopulatedItems
    ? topSectionItemsPopulated
    : topSectionSlugs.map(slug => ({
        slug,
        name: slug.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon: null,
        description: null,
      }));

  const handleItemClick = (item: TopSectionItem) => {
    if (item.description && onItemClick) {
      onItemClick(item);
    }
  };

  return (
    <>
      <div className="border-t border-gray-200 border-b">
        <div className="py-5">
          {topSectionItems.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {topSectionItems.map((item) => {
                  const hasDescription = item.description && item.description.trim() !== "";

                  return (
                    <div
                      key={item.slug}
                      className={`flex flex-row gap-3 items-center ${
                        hasDescription ? "cursor-pointer hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors" : ""
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="p-3 bg-green-100 rounded-lg flex items-center justify-center text-gray-800">
                        {renderIcon(item)}
                      </div>
                      <p className="text-sm font-medium leading-6 text-gray-900 flex-1">
                        {item.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
        <div className={`mb-3 relative ${isZoomed ? "-z-10" : "z-0"}`}>
          <TrustpilotWidget />
        </div>
      </div>
    </>
  );
}
