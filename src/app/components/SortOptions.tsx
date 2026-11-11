import { SortOption } from "../../../types";

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Products don't carry a `popularity` field, so the old `b.popularity - a.popularity`
 * was NaN and left the list in arbitrary order. Rank by explicit popularity if the API
 * ever sends it, then featured, in stock, rating and number of reviews.
 */
const popularityScore = (p: Record<string, unknown>): number[] => [
  num(p.popularity),
  p.is_featured ? 1 : 0,
  num(p.availabilityPercentage) > 0 || num(p.availableVariants) > 0 ? 1 : 0,
  num(p.averageRating),
  Array.isArray(p.reviewDetails) ? p.reviewDetails.length : num(p.reviewCount),
];

export const SortOptions: SortOption[] = [
  {
    name: "Most Popular",
    key: "popularity",
    sortFunc: (a, b) => {
      const sa = popularityScore(a);
      const sb = popularityScore(b);
      for (let i = 0; i < sa.length; i += 1) {
        if (sb[i] !== sa[i]) return sb[i] - sa[i];
      }
      return 0;
    },
  },
  {
    name: "Best Rating",
    key: "rating",
    sortFunc: (a, b) => num(b.averageRating) - num(a.averageRating),
  },
  {
    name: "Newest",
    key: "newest",
    sortFunc: (a, b) =>
      (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0),
  },
  {
    name: "Price: Low to High",
    key: "priceLowToHigh",
    sortFunc: (a, b) =>
      (Number(a.minSalePrice) || Number(a.minPrice) || Number(a.price) || 0) -
      (Number(b.minSalePrice) || Number(b.minPrice) || Number(b.price) || 0),
  },
  {
    name: "Price: High to Low",
    key: "priceHighToLow",
    sortFunc: (a, b) =>
      (Number(b.minSalePrice) || Number(b.minPrice) || Number(b.price) || 0) -
      (Number(a.minSalePrice) || Number(a.minPrice) || Number(a.price) || 0),
  },
];
