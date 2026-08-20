import { getCanonical } from "@/lib/getCanonical";
import { getStoreIdentity } from "@/lib/storeIdentity";
import { getSiteWideSchemaPublic } from "@/app/services/siteWideSchemaService";

function escapeJsonLdForScriptTag(json: string): string {
  return json.replace(/</g, "\\u003c");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function typeIncludes(node: Record<string, unknown>, wanted: string): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type === wanted;
  if (Array.isArray(type)) return type.some((t) => t === wanted);
  return false;
}

const BUSINESS_TYPES = ["Organization", "LocalBusiness", "OnlineStore"] as const;

/** True if this node itself is a business type. */
function isBusinessNode(node: Record<string, unknown>): boolean {
  return BUSINESS_TYPES.some((t) => typeIncludes(node, t));
}

/**
 * Deep-scan JSON-LD for Organization / LocalBusiness / OnlineStore
 * (root, @graph, about, publisher, mainEntity, etc.).
 */
export function jsonLdContainsBusinessSchema(parsed: unknown): boolean {
  const seen = new Set<unknown>();

  const walk = (value: unknown): boolean => {
    if (value == null) return false;
    if (typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);

    if (Array.isArray(value)) {
      return value.some((item) => walk(item));
    }

    const node = value as Record<string, unknown>;
    if (isBusinessNode(node)) return true;

    return Object.values(node).some((child) => walk(child));
  };

  return walk(parsed);
}

/** Pull Organization (or LocalBusiness) object from site-wide JSON-LD graph/root. */
export function extractBusinessNodeFromJsonLd(
  parsed: unknown
): Record<string, unknown> | null {
  const root = asRecord(parsed);
  if (!root) return null;

  if (typeIncludes(root, "Organization") || typeIncludes(root, "LocalBusiness")) {
    return root;
  }

  const graph = root["@graph"];
  if (Array.isArray(graph)) {
    const org = graph
      .map((n) => asRecord(n))
      .find(
        (n) =>
          n &&
          (typeIncludes(n, "Organization") || typeIncludes(n, "LocalBusiness"))
      );
    if (org) return org;

    const store = graph
      .map((n) => asRecord(n))
      .find((n) => n && typeIncludes(n, "OnlineStore"));
    if (store) return store;
  }

  if (typeIncludes(root, "OnlineStore")) return root;

  // Nested about / publisher on WebPage
  for (const key of ["about", "publisher", "mainEntity"] as const) {
    const nested = asRecord(root[key]);
    if (
      nested &&
      (typeIncludes(nested, "Organization") ||
        typeIncludes(nested, "LocalBusiness"))
    ) {
      return nested;
    }
  }

  return null;
}

function cloneBusinessSchema(node: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": typeIncludes(node, "LocalBusiness")
      ? "LocalBusiness"
      : "Organization",
  };

  const copyKeys = [
    "name",
    "alternateName",
    "legalName",
    "url",
    "logo",
    "image",
    "email",
    "telephone",
    "description",
    "address",
    "contactPoint",
    "brand",
    "identifier",
    "sameAs",
    "areaServed",
    "currenciesAccepted",
    "paymentAccepted",
  ] as const;

  for (const key of copyKeys) {
    if (node[key] !== undefined) out[key] = node[key];
  }

  return out;
}

/**
 * Auto business (Organization) JSON-LD for policy pages.
 * Prefers admin site-wide Organization; falls back to store identity.
 * Callers must skip when Organization is already on the page (site-wide or admin).
 */
export async function buildBusinessOrganizationJsonLdString(): Promise<string | null> {
  const siteWide = await getSiteWideSchemaPublic().catch(() => [] as string[]);

  for (const raw of siteWide) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const business = extractBusinessNodeFromJsonLd(parsed);
      if (business && (business.name || business.url)) {
        return escapeJsonLdForScriptTag(
          JSON.stringify(cloneBusinessSchema(business))
        );
      }
    } catch {
      /* ignore bad site-wide rows */
    }
  }

  const [site, identity] = await Promise.all([
    getCanonical(""),
    getStoreIdentity().catch(() => null),
  ]);
  const name = (identity?.siteName || "").trim() || "Aroma Desire";
  const logo = (identity?.ogImageUrl || "").trim();

  const fallback: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Organization",
    name,
    url: site,
  };
  if (logo) fallback.logo = logo;

  return escapeJsonLdForScriptTag(JSON.stringify(fallback));
}

export function jsonLdStringsHaveBusinessSchema(
  jsonLdStrings: string[] | undefined
): boolean {
  if (!jsonLdStrings?.length) return false;
  return jsonLdStrings.some((raw) => {
    try {
      return jsonLdContainsBusinessSchema(JSON.parse(raw) as unknown);
    } catch {
      return /"@type"\s*:\s*"(Organization|LocalBusiness|OnlineStore)"/.test(raw);
    }
  });
}

/** @deprecated use jsonLdStringsHaveBusinessSchema */
export function adminJsonLdHasBusinessSchema(
  jsonLdStrings: string[] | undefined
): boolean {
  return jsonLdStringsHaveBusinessSchema(jsonLdStrings);
}

/**
 * Skip auto Organization when site-wide or page admin schema already
 * declares Organization / LocalBusiness / OnlineStore (avoids duplicates).
 */
export async function shouldSkipAutoBusinessOrganization(
  adminJsonLdStrings: string[]
): Promise<boolean> {
  if (jsonLdStringsHaveBusinessSchema(adminJsonLdStrings)) return true;

  const siteWide = await getSiteWideSchemaPublic().catch(() => [] as string[]);
  return jsonLdStringsHaveBusinessSchema(siteWide);
}
