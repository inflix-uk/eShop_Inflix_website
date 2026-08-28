import { ProductData } from "../../../../../types";
import { getCanonical } from "@/lib/getCanonical";
import {
  ProductReviewRow,
  ProductReviewsSummary,
} from "@/app/(routes)/products/lib/productReviewsClient";
import {
  applyAutoJsonLd,
  escapeJsonLdForScriptTag as escapeJsonLdShared,
  hasNonEmptyField,
  isPlainObject,
  toSchemaOrgShortEnum,
} from "@/app/lib/jsonLdMerge";

type ProductVariantLike = {
  name?: string;
  Price?: number | string | null;
  salePrice?: number | string | null;
  Quantity?: number | null;
  SKU?: string | null;
  EIN?: string | null;
  MPN?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  variantImages?: Array<{ path?: string; url?: string }>;
  metaSchemas?: unknown[];
};

export type GenerateProductSchemaOptions = {
  /** Full path under /products/ (product slug or product/variant). */
  slugPath: string;
  selectedVariant?: ProductVariantLike | null;
  reviewData?: Pick<
    ProductReviewsSummary,
    "averageRating" | "totalReviews" | "reviews"
  > | null;
  siteName?: string;
};

function resolveAssetUrl(asset: { url?: string; path?: string } | string | null | undefined): string | null {
  if (!asset) return null;
  if (typeof asset === "string") {
    const raw = asset.trim();
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
      return raw;
    }
    const base = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    if (!base) return raw.startsWith("/") ? raw : `/${raw}`;
    return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
  }

  const base = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  const raw = String(asset.url || asset.path || "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  if (!base) return raw.startsWith("/") ? raw : `/${raw}`;
  return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
}

function stripHtml(html: string | undefined | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Reject empty / placeholder SKU-MPN values like 0, 0.0, "null". */
function normalizeCatalogCode(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "n/a" || lower === "na") {
    return "";
  }
  // Numeric placeholders from admin form defaults
  if (/^0+(\.0+)?$/.test(raw)) return "";
  return raw;
}

/** GTIN/EAN: digits only, valid retail lengths only. */
function normalizeGtinDigits(value: unknown): string {
  const digits = String(value ?? "").trim().replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return "";
  // All zeros / trivial
  if (/^0+$/.test(digits)) return "";
  return digits;
}

function assignGtinFields(schema: Record<string, unknown>, gtin: string) {
  delete schema.gtin;
  delete schema.gtin8;
  delete schema.gtin12;
  delete schema.gtin13;
  delete schema.gtin14;
  if (!gtin) return;
  if (gtin.length === 8) schema.gtin8 = gtin;
  else if (gtin.length === 12) schema.gtin12 = gtin;
  else if (gtin.length === 13) schema.gtin13 = gtin;
  else if (gtin.length === 14) schema.gtin14 = gtin;
  else schema.gtin = gtin;
}

function mapItemCondition(raw: string | undefined | null): string {
  const value = String(raw || "").toLowerCase();
  if (
    value.includes("refurb") ||
    value.includes("renewed") ||
    value.includes("certified")
  ) {
    return "RefurbishedCondition";
  }
  if (
    value.includes("used") ||
    value.includes("pre-owned") ||
    value.includes("preowned") ||
    value.includes("second")
  ) {
    return "UsedCondition";
  }
  return "NewCondition";
}

function reviewAuthorName(raw?: string | null): string {
  const s = String(raw || "").trim();
  if (!s) return "Customer";
  if (s.includes("@")) {
    const local = s.split("@")[0].replace(/[._]+/g, " ").trim();
    return local || "Customer";
  }
  return s;
}

function collectImages(
  product: ProductData,
  selectedVariant?: ProductVariantLike | null
): string[] {
  const fromVariant =
    selectedVariant?.variantImages?.map((img) => resolveAssetUrl(img)).filter(Boolean) ||
    [];
  const fromGallery =
    (Array.isArray(product.Gallery_Images) ? product.Gallery_Images : [])
      .map((img) => resolveAssetUrl(img))
      .filter(Boolean) || [];
  const meta = resolveAssetUrl((product as { meta_Image?: { url?: string; path?: string } }).meta_Image);

  const ordered = [
    ...(fromVariant as string[]),
    ...(meta ? [meta] : []),
    ...(fromGallery as string[]),
  ];

  return Array.from(new Set(ordered));
}

function buildShippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: 0,
      currency: "GBP",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "GB",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 1,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 3,
        unitCode: "DAY",
      },
    },
  };
}

function buildReturnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "GB",
    returnPolicyCategory: "MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 30,
    returnMethod: "ReturnByMail",
    returnFees: "FreeReturn",
  };
}

export const escapeJsonLdForScriptTag = escapeJsonLdShared;

export async function generateOrganizationSchema(siteName = "Aroma Desire") {
  const site = await getCanonical("");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName || "Aroma Desire",
    url: site,
    logo: `${site}/logo.png`,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "English",
    },
  };
}

/**
 * Google merchant-listing oriented Product + Offer JSON-LD.
 * Use Offer (not AggregateOffer) so the page is eligible for merchant listing experiences.
 */
export async function generateProductSchema(
  product: ProductData,
  options: GenerateProductSchemaOptions
): Promise<Record<string, unknown>> {
  const { slugPath, selectedVariant, reviewData, siteName } = options;
  const site = await getCanonical("");
  const productPageUrl = await getCanonical(`/products/${slugPath.replace(/^\/+/, "")}`);
  const sellerName = (siteName || "").trim() || "Aroma Desire";

  const variant =
    selectedVariant ||
    (Array.isArray(product.variantValues) && product.variantValues.length === 1
      ? (product.variantValues[0] as ProductVariantLike)
      : null);

  const salePrice = parseMoney(variant?.salePrice);
  const listPrice = parseMoney(variant?.Price);
  const activePrice =
    salePrice != null && salePrice > 0
      ? salePrice
      : listPrice != null && listPrice > 0
        ? listPrice
        : null;

  const quantity = Number(variant?.Quantity ?? 0);
  const inStock = Number.isFinite(quantity) ? quantity > 0 : true;

  // Prefer SEO meta title/description (variant meta when that URL is selected)
  const seoMeta = (product as { Seo_Meta?: { metaTitle?: string; metaDescription?: string } })
    .Seo_Meta;
  const schemaName =
    String(selectedVariant?.metaTitle || "").trim() ||
    String(seoMeta?.metaTitle || "").trim() ||
    product.name;
  const description =
    String(selectedVariant?.metaDescription || "").trim() ||
    String(seoMeta?.metaDescription || "").trim() ||
    stripHtml(product.Product_description).substring(0, 5000) ||
    stripHtml(product.Product_summary) ||
    stripHtml((product as { description?: string }).description) ||
    product.name;

  const images = collectImages(product, variant);
  const sku = normalizeCatalogCode(variant?.SKU);
  const mpn = normalizeCatalogCode(variant?.MPN);
  const gtin = normalizeGtinDigits(variant?.EIN);
  const brandName = String(product.brand || sellerName).trim();
  const conditionSource =
    product.condition ||
    variant?.name ||
    "";

  const validFromDate = (() => {
    const raw = (product as { createdAt?: string }).createdAt;
    if (raw) {
      try {
        return new Date(raw).toISOString().split("T")[0];
      } catch {
        /* fall through */
      }
    }
    return new Date().toISOString().split("T")[0];
  })();

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: productPageUrl,
    priceCurrency: "GBP",
    availability: inStock ? "InStock" : "OutOfStock",
    itemCondition: mapItemCondition(conditionSource),
    seller: {
      "@type": "Organization",
      name: sellerName,
      url: site,
    },
    shippingDetails: buildShippingDetails(),
    hasMerchantReturnPolicy: buildReturnPolicy(),
  };

  if (activePrice != null) {
    offer.price = Number(activePrice.toFixed(2));
    // Sale / strikethrough when list price is higher than active sale price
    if (
      listPrice != null &&
      salePrice != null &&
      listPrice > salePrice &&
      salePrice > 0
    ) {
      offer.validFrom = validFromDate;
      offer.priceSpecification = {
        "@type": "UnitPriceSpecification",
        priceType: "StrikethroughPrice",
        price: Number(listPrice.toFixed(2)),
        priceCurrency: "GBP",
      };
    }
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: schemaName,
    description,
    url: productPageUrl,
    offers: offer,
  };
  if (images.length > 0) {
    schema.image = images;
  }

  if (brandName) {
    schema.brand = {
      "@type": "Brand",
      name: brandName,
    };
  }

  if (product.category) {
    schema.category = product.category;
  }

  // Variant grouping for Google merchant (GSC productGroupID)
  const variantCount = Array.isArray(product.variantValues)
    ? product.variantValues.length
    : 0;
  const productId = String(product._id || "").trim();
  if (productId && variantCount > 1) {
    schema.productGroupID = productId;
    if (selectedVariant) {
      schema.inProductGroupWithID = productId;
    }
  }

  if (sku) schema.sku = sku;
  if (mpn) schema.mpn = mpn;
  assignGtinFields(schema, gtin);

  const averageRating = Number(reviewData?.averageRating || 0);
  const totalReviews = Number(reviewData?.totalReviews || 0);
  const reviews = Array.isArray(reviewData?.reviews) ? reviewData!.reviews : [];

  if (averageRating > 0 && totalReviews > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: averageRating,
      reviewCount: totalReviews,
      bestRating: 5,
      worstRating: 1,
    };

    const reviewNodes = reviews
      .slice(0, 10)
      .map((review: ProductReviewRow) => {
        const rating = Number(review.rating);
        if (!Number.isFinite(rating) || rating < 1) return null;
        const body = String(review.comment || review.review || "").trim();
        const dateRaw = review.DateTime || review.createdAt;
        const node: Record<string, unknown> = {
          "@type": "Review",
          author: {
            "@type": "Person",
            name: reviewAuthorName(review.name),
          },
          reviewRating: {
            "@type": "Rating",
            ratingValue: rating,
            bestRating: 5,
            worstRating: 1,
          },
        };
        if (body) node.reviewBody = body;
        if (dateRaw) {
          try {
            node.datePublished = new Date(dateRaw).toISOString().split("T")[0];
          } catch {
            /* ignore invalid dates */
          }
        }
        return node;
      })
      .filter(Boolean);

    if (reviewNodes.length > 0) {
      schema.review = reviewNodes;
    }
  }

  return orderProductSchemaKeys(normalizeOfferEnumerationFields(schema));
}

export {
  isProductSchemaNode,
  mergeMissingSchemaFields,
} from "@/app/lib/jsonLdMerge";

const PRODUCT_IDENTIFIER_KEYS = [
  "sku",
  "mpn",
  "gtin",
  "gtin8",
  "gtin12",
  "gtin13",
  "gtin14",
  "isbn",
] as const;

/** Preferred Product JSON-LD key order (Google ignores order; keeps validators readable). */
const PRODUCT_KEY_ORDER = [
  "@context",
  "@type",
  "@id",
  "name",
  "description",
  "image",
  "url",
  "sku",
  "mpn",
  "gtin",
  "gtin8",
  "gtin12",
  "gtin13",
  "gtin14",
  "isbn",
  "brand",
  "manufacturer",
  "category",
  "color",
  "material",
  "productGroupID",
  "inProductGroupWithID",
  "additionalProperty",
  "offers",
  "aggregateRating",
  "review",
] as const;

function orderProductSchemaKeys(
  productNode: Record<string, unknown>
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  for (const key of PRODUCT_KEY_ORDER) {
    if (Object.prototype.hasOwnProperty.call(productNode, key)) {
      ordered[key] = productNode[key];
    }
  }
  for (const key of Object.keys(productNode)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
      ordered[key] = productNode[key];
    }
  }
  return ordered;
}

/**
 * Google merchant docs: full schema.org URLs and short names are both valid
 * (e.g. InStock / NewCondition). We emit short names for consistency.
 * @see https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
 */
function normalizeOfferEnumerationFields(
  productNode: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...productNode };
  const offers = out.offers;
  if (!isPlainObject(offers)) return out;

  const nextOffers: Record<string, unknown> = { ...offers };

  for (const key of ["availability", "itemCondition"] as const) {
    const short = toSchemaOrgShortEnum(nextOffers[key]);
    if (short) nextOffers[key] = short;
  }

  const priceSpec = nextOffers.priceSpecification;
  if (isPlainObject(priceSpec)) {
    const nextSpec: Record<string, unknown> = { ...priceSpec };
    const priceType = toSchemaOrgShortEnum(nextSpec.priceType);
    if (priceType) nextSpec.priceType = priceType;
    nextOffers.priceSpecification = nextSpec;
  } else if (Array.isArray(priceSpec)) {
    nextOffers.priceSpecification = priceSpec.map((entry) => {
      if (!isPlainObject(entry)) return entry;
      const nextSpec: Record<string, unknown> = { ...entry };
      const priceType = toSchemaOrgShortEnum(nextSpec.priceType);
      if (priceType) nextSpec.priceType = priceType;
      return nextSpec;
    });
  }

  const returns = nextOffers.hasMerchantReturnPolicy;
  if (isPlainObject(returns)) {
    const nextReturns: Record<string, unknown> = { ...returns };
    for (const key of [
      "returnPolicyCategory",
      "returnMethod",
      "returnFees",
    ] as const) {
      const short = toSchemaOrgShortEnum(nextReturns[key]);
      if (short) nextReturns[key] = short;
    }
    // applicableCountry must stay as country code string "GB", not URL
    const country = nextReturns.applicableCountry;
    if (typeof country === "string") {
      const shortCountry = toSchemaOrgShortEnum(country);
      if (shortCountry && shortCountry.length <= 3) {
        nextReturns.applicableCountry = shortCountry.toUpperCase();
      }
    }
    nextOffers.hasMerchantReturnPolicy = nextReturns;
  }

  out.offers = nextOffers;
  return out;
}

/**
 * Identifiers always follow catalog (variant SKU / MPN / EAN), never stale admin-pasted values.
 * If catalog value is missing/invalid → field omitted (empty).
 * Reorders keys so sku/mpn/gtin sit with product identity fields (not after reviews).
 */
function finalizeProductSchemaNode(
  productNode: Record<string, unknown>,
  autoProduct: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...productNode };

  for (const key of PRODUCT_IDENTIFIER_KEYS) {
    delete out[key];
  }

  for (const key of PRODUCT_IDENTIFIER_KEYS) {
    if (hasNonEmptyField(autoProduct, key)) {
      out[key] = autoProduct[key];
    }
  }

  return orderProductSchemaKeys(normalizeOfferEnumerationFields(out));
}

/**
 * Resolve final JSON-LD list for a product page:
 * - No admin Product → full auto Product
 * - Admin Product(s) → merge missing merchant fields only (admin wins)
 * - sku/mpn/gtin always from catalog; omitted when not given
 * - FAQPage / Organization / LocalBusiness: admin fields win, missing from auto
 * - Non-matching admin nodes pass through unchanged
 */
export function resolveProductPageJsonLdObjects(
  adminObjects: Record<string, unknown>[],
  autoProduct: Record<string, unknown>,
  extras?: {
    autoBusiness?: Record<string, unknown> | null;
    autoFaq?: Record<string, unknown> | null;
    appendAutoBusiness?: boolean;
  }
): Record<string, unknown>[] {
  return applyAutoJsonLd(
    adminObjects,
    {
      product: autoProduct,
      business: extras?.autoBusiness || null,
      faq: extras?.autoFaq || null,
    },
    {
      appendAutoProduct: true,
      appendAutoBusiness: extras?.appendAutoBusiness !== false && Boolean(extras?.autoBusiness),
      appendAutoFaq: Boolean(extras?.autoFaq),
      finalizeProduct: finalizeProductSchemaNode,
    }
  );
}

export async function generateBreadcrumbSchema(product: ProductData, slug: string) {
  const site = await getCanonical("");
  const productsUrl = await getCanonical("/products");
  const categoryUrl = await getCanonical(
    `/categories/${encodeURIComponent(product.category || "products")}`
  );
  const productUrl = await getCanonical(`/products/${slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: site,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: productsUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category || "Products",
        item: categoryUrl,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: productUrl,
      },
    ],
  };
}
