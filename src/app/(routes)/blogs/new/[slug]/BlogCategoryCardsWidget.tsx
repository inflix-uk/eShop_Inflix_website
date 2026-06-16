"use client";

import CategoriesCard from "@/app/components/CategoriesCard";
import {
  resolveCategoryCardsDividerColor,
  resolveCategoryCardsHeadingColor,
  type CategoryCard,
} from "@/app/services/categoryCardsService";

export type CategoryCardBlockItem = {
  id?: string;
  categoryName?: string;
  categoryNameColor?: string;
  itemCountColor?: string;
  overlayColor?: string;
  shopNowLink?: string;
  itemCount?: number;
  backgroundImage?: string;
  categoryImage?: string;
  order?: number;
  isActive?: boolean;
};

export type BlogCategoryCardsWidgetProps = {
  headingText?: string;
  headingColor?: string;
  dividerColor?: string;
  sectionBackgroundColor?: string;
  items?: CategoryCardBlockItem[];
};

function toDisplayCards(items: CategoryCardBlockItem[] | undefined): CategoryCard[] {
  return (items || [])
    .filter((it) => it && it.isActive !== false)
    .map((it) => {
      const categoryName = it.categoryName || "";
      // Auto-generate shopNowLink if empty
      const shopNowLink = (it.shopNowLink || "").trim() || 
        (categoryName ? `/categories/${encodeURIComponent(categoryName.toLowerCase().replace(/\s+/g, "-"))}` : "");
      
      return {
        _id: it.id || `cc-${categoryName || "card"}`,
        categoryName,
        shopNowLink,
        itemCount: it.itemCount ?? 0,
        categoryNameColor: it.categoryNameColor,
        itemCountColor: it.itemCountColor,
        overlayColor: it.overlayColor,
        backgroundImage: it.backgroundImage || "",
        categoryImage: it.categoryImage || "",
        order: it.order ?? 0,
        isActive: true,
      };
    })
    .filter(
      (c) =>
        c.categoryName.trim().length > 0 &&
        c.backgroundImage.trim().length > 0
    );
}

export default function BlogCategoryCardsWidget({
  headingText = "Popular Categories",
  headingColor,
  dividerColor,
  sectionBackgroundColor = "",
  items = [],
}: BlogCategoryCardsWidgetProps) {
  const cards = toDisplayCards(items);

  return (
    <section
      className="mt-8 w-full min-w-0"
      style={
        sectionBackgroundColor?.trim()
          ? { backgroundColor: sectionBackgroundColor.trim() }
          : undefined
      }
    >
      <div className="relative">
        <div className="flex items-center gap-3 mt-10">
          <h2
            className="text-2xl font-semibold"
            style={{ color: resolveCategoryCardsHeadingColor(headingColor) }}
          >
            {headingText}
          </h2>
          <div
            className="mt-1 min-w-0 flex-grow border-b"
            style={{ borderColor: resolveCategoryCardsDividerColor(dividerColor) }}
          />
        </div>
      </div>
      <CategoriesCard
        countItems={() => 0}
        newCategories={{ categories: [] }}
        inlineCards={cards}
      />
    </section>
  );
}
