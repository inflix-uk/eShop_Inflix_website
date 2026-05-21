import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getCanonical } from "@/lib/getCanonical";
import ProductPage from "@/app/(routes)/products/[...slug]/ProductPage";
import Loading from "@/app/components/Loading";
import VariantLinksSSR from "@/app/(routes)/products/components/VariantLinksSSR";
import ProductSEOContent from "@/app/(routes)/products/components/ProductSEOContent";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";

// Force dynamic rendering since we use cache: "no-store" for fresh product data
export const dynamic = 'force-dynamic';

async function getProductData(productName: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get/product/by/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producturl: productName }),
       cache: "no-store"
    });

    if (!res.ok) {
      console.error(`Failed to fetch product data: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.product || null;
  } catch (error) {
    console.error("Error fetching product data:", error);
    return null;
  }
}

// Parse slug array into product URL and variant info
// URL format: /products/{productUrl} or /products/{productUrl}/{variantSlug}
function parseSlugArray(slugArray: string[]): { productUrl: string; variantSlug: string } {
  const sanitizeSegment = (segment: string): string => {
    if (!segment) return "";
    let value = segment;
    try {
      value = decodeURIComponent(segment);
    } catch {
      value = segment;
    }

    // Handle accidental quoted values such as "\"product-slug\"" from copied URLs.
    return value
      .trim()
      .replace(/^['"`]+|['"`]+$/g, "")
      .replace(/^%22+|%22+$/gi, "");
  };

  if (!slugArray || slugArray.length === 0) {
    return { productUrl: '', variantSlug: '' };
  }

  // First segment is always the product URL
  const productUrl = sanitizeSegment(slugArray[0]);

  // Second segment (if exists) is the variant slug — ignore accidental full URLs in the path
  let variantSlug = "";
  if (slugArray.length > 1) {
    const candidate = sanitizeSegment(slugArray[1]);
    if (candidate && !/^https?:?/i.test(candidate) && !candidate.includes("://")) {
      variantSlug = candidate;
    }
  }

  return { productUrl, variantSlug };
}

// Generate static params for popular products (optional - improves performance)
export async function generateStaticParams() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) return [];

    const res = await fetch(`${base}/get/popular/products`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) return [];

    const text = await res.text();
    const trimmed = text?.trim() ?? "";
    if (!trimmed) {
      console.warn(
        "[generateStaticParams] Empty body from /get/popular/products (skipping prerender paths)"
      );
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      console.error(
        "[generateStaticParams] Invalid JSON from /get/popular/products"
      );
      return [];
    }

    let list: unknown[] = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { products?: unknown[] }).products)
    ) {
      list = (parsed as { products: unknown[] }).products;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { data?: unknown[] }).data)
    ) {
      list = (parsed as { data: unknown[] }).data;
    } else {
      return [];
    }

    return list
      .slice(0, 100)
      .map((product: unknown) => {
        const p = product as { url?: string; name?: string };
        const slug =
          p.url ||
          (typeof p.name === "string"
            ? p.name.toLowerCase().replace(/\s+/g, "-")
            : "");
        return slug ? { slug: [slug] } : null;
      })
      .filter(
        (param): param is { slug: string[] } =>
          param != null && Boolean(param.slug[0])
      );
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

// Helper function to find matching variant from URL slug
// Uses slug field first (new SEO format), then variantId, then fuzzy match
function findVariantFromSlug(product: any, variantInfo: string) {
  if (!variantInfo || !product.variantValues || product.variantValues.length === 0) {
    return null;
  }

  const normalizedUrlSlug = variantInfo.toLowerCase().replace(/_/g, '-');

  // 1. Try exact match on slug field (new SEO format)
  const bySlug = product.variantValues.find((variant: any) => variant.slug === normalizedUrlSlug);
  if (bySlug) return bySlug;

  // 2. Try match on variantId
  const byVariantId = product.variantValues.find((variant: any) => variant.variantId === variantInfo);
  if (byVariantId) return byVariantId;

  // 3. Try fuzzy match on name (convert name to slug format and compare)
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/_/g, '-')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  };

  const byNameFuzzy = product.variantValues.find((variant: any) => {
    if (!variant.name) return false;
    const nameSlug = generateSlug(variant.name);
    return nameSlug === normalizedUrlSlug;
  });
  if (byNameFuzzy) return byNameFuzzy;

  // 4. Fallback: Try partial match (all URL parts exist in variant name)
  const urlParts = normalizedUrlSlug.split('-').filter(Boolean);
  return product.variantValues.find((variant: any) => {
    if (!variant.name) return false;

    // Normalize variant name (e.g., "Excellent-Black (#000000)-64GB" -> "excellent black 64gb")
    const normalizedVariantName = variant.name
      .toLowerCase()
      .replace(/\s*\(#[0-9a-f]+\)/g, '') // Remove color codes like (#000000)
      .replace(/[-_]/g, ' '); // Replace dashes and underscores with spaces

    // Check if all URL parts are present in the variant name
    return urlParts.every(part => normalizedVariantName.includes(part));
  });
}

function parseSchemaInputs(rawSchema: unknown): Record<string, unknown>[] {
  if (rawSchema == null) return [];

  const toObject = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object") return null;
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).length > 0 ? obj : null;
  };

  if (typeof rawSchema === "object") {
    const direct = toObject(rawSchema);
    return direct ? [direct] : [];
  }

  if (typeof rawSchema !== "string") return [];

  let normalized = rawSchema.trim();
  if (!normalized) return [];

  // Remove HTML comments from admin-pasted snippets.
  normalized = normalized.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!normalized) return [];

  // If a full HTML/meta snippet is pasted, extract only ld+json script bodies.
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const scriptBodies: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(normalized)) !== null) {
    const body = (match[1] || "").trim();
    if (body) scriptBodies.push(body);
  }

  const candidates = scriptBodies.length > 0 ? scriptBodies : [normalized];
  const parsed: Record<string, unknown>[] = [];

  for (const candidate of candidates) {
    const clean = candidate.trim();
    if (!clean || clean.startsWith("<")) continue;
    try {
      const obj = JSON.parse(clean) as unknown;
      const asObj = toObject(obj);
      if (asObj) parsed.push(asObj);
    } catch {
      // Ignore invalid entries; keep valid schema payloads.
    }
  }

  return parsed;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { productUrl, variantSlug } = parseSlugArray(slug);
    const [product, navbarVariantTestConfig] = await Promise.all([
      getProductData(productUrl),
      getNavbarVariantTestPublicServer(),
    ]);

    // Build the full URL path for canonical
    const fullSlugPath = slug.join('/');

    if (!product) {
      return {
        title: "",
        description: "",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    // Check if this is a variant-specific URL
    const selectedVariant = findVariantFromSlug(product, variantSlug);

    // Determine if we should use variant meta or product meta
    const isVariantSelected = !!(selectedVariant && variantSlug);

    const resolveAssetUrl = (asset: any): string | null => {
      const base = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
      const raw = String(asset?.url || asset?.path || "").trim();
      if (!raw) return null;
      if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
        return raw;
      }
      if (!base) return raw.startsWith("/") ? raw : `/${raw}`;
      return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
    };

    let title = "";
    let description = "";
    let keywords = "";

    if (isVariantSelected) {
      // Variant is selected - use ONLY variant meta (even if empty, NO fallback to product meta)
      title = selectedVariant.metaTitle || '';
      description = selectedVariant.metaDescription || '';
      keywords = selectedVariant.metaKeywords || '';
    } else {
      // No variant selected - use base product Seo_Meta only (empty fallback)
      const metaTitle = product.Seo_Meta?.metaTitle;
      const metaDescription = product.Seo_Meta?.metaDescription;
      const metaKeywords = product.Seo_Meta?.metaKeywords;

      title = metaTitle || '';
      description = metaDescription || '';
      keywords = metaKeywords || '';
    }

    // Use meta_Image if available, otherwise use Gallery_Images
    const metaImageUrl = resolveAssetUrl(product.meta_Image);
    const galleryImages =
      (Array.isArray(product.Gallery_Images) ? product.Gallery_Images : [])
        .map((img: any) => resolveAssetUrl(img))
        .filter((img: string | null): img is string => Boolean(img));
    const images = metaImageUrl ? [metaImageUrl, ...galleryImages] : galleryImages;
    const canonicalUrl = await getCanonical(`/products/${fullSlugPath}`);

    return {
      title,
      description,
      ...(keywords ? { keywords } : {}),
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        images: images.slice(0, 4).map((img: string) => ({
          url: img,
          width: 800,
          height: 600,
          alt: product.name,
        })),
        type: "website",
        locale: "en_GB",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: images.slice(0, 1),
      },
      alternates: {
        canonical: canonicalUrl,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: "",
      description: "",
    };
  }

}

export default async function Product({
  params,
}: {
    params: Promise<{ slug: string[] }>
}) {
  try {
    const { slug } = await params;

    // Validate slug format - must be an array with at least one element
    if (!slug || !Array.isArray(slug) || slug.length === 0 || slug.length > 2) {
      console.error('Invalid slug format:', slug);
      notFound();
    }

    const { productUrl, variantSlug } = parseSlugArray(slug);

    if (!productUrl) {
      console.error('Could not extract product URL from slug:', slug);
      notFound();
    }

    const [product, navbarVariantTestConfig] = await Promise.all([
      getProductData(productUrl),
      getNavbarVariantTestPublicServer(),
    ]);

    if (!product) {
      console.error('Product not found for productUrl:', productUrl);
      notFound();
    }

    // Validate required product data
    if (!product.name) {
      console.error('Product missing required name field:', product);
      notFound();
    }

    // Get schemas based on variant selection
    const selectedVariant = findVariantFromSlug(product, variantSlug);
    const isVariantSelected = !!(selectedVariant && variantSlug);

    let schemas: string[] = [];

    if (isVariantSelected) {
      // Variant is selected - use ONLY variant schemas (no fallback to product schemas)
      schemas = selectedVariant.metaSchemas?.filter((schema: string) => schema && schema.trim()) || [];
    } else {
      // No variant selected - use base product schemas
      schemas = product.Seo_Meta?.metaSchemas?.filter((schema: string) => schema && schema.trim()) || [];
    }

  return (
    <>
      {/* JSON-LD Structured Data Schemas */}
      {schemas.flatMap((schema, index) => {
        const parsedSchemas = parseSchemaInputs(schema);
        return parsedSchemas.map((parsedSchema, innerIndex) => (
          <script
            key={`schema-${index}-${innerIndex}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(parsedSchema),
            }}
          />
        ));
      })}

      <VariantLinksSSR product={product} />
      <Suspense fallback={<Loading />}>
        <ProductPage
          product={product}
          initialVariantSlug={variantSlug}
          navbarVariantTestConfig={navbarVariantTestConfig}
        />
      </Suspense>
      <ProductSEOContent product={product} />
    </>
  );
  } catch (error) {
    console.error('Unexpected error in Product page:', error);
    notFound();
  }
}
