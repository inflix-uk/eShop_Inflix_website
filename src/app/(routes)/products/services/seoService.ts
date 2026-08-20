import { ProductData } from "../../../../../types";
import { getCanonical } from "@/lib/getCanonical";
import {
  ProductReviewRow,
  ProductReviewsSummary,
} from "@/app/(routes)/products/lib/productReviewsClient";

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

/** Escape `<` so values cannot break the outer script tag. */
export function escapeJsonLdForScriptTag(json: string): string {
  return json.replace(/</g, "\\u003c");
}

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
  const sku = String(variant?.SKU || "").trim();
  const mpn = String(variant?.MPN || "").trim();
  const gtin = String(variant?.EIN || "").trim().replace(/\D/g, "");
  const brandName = String(product.brand || sellerName).trim();
  const conditionSource =
    product.condition ||
    variant?.name ||
    "";

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
    image: images,
    url: productPageUrl,
    offers: offer,
  };

  if (brandName) {
    schema.brand = {
      "@type": "Brand",
      name: brandName,
    };
  }

  if (product.category) {
    schema.category = product.category;
  }

  if (sku) schema.sku = sku;
  if (mpn) schema.mpn = mpn;
  if (gtin) {
    if (gtin.length === 8) schema.gtin8 = gtin;
    else if (gtin.length === 12) schema.gtin12 = gtin;
    else if (gtin.length === 13) schema.gtin13 = gtin;
    else if (gtin.length === 14) schema.gtin14 = gtin;
    else schema.gtin = gtin;
  }

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

  return schema;
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
