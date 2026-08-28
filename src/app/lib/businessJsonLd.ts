import { getCanonical } from "@/lib/getCanonical";
import { getStoreIdentity } from "@/lib/storeIdentity";
import { getSiteWideSchemaPublic } from "@/app/services/siteWideSchemaService";
import { withPodcastStudioPhotos } from "@/app/lib/podcastShareImage";
import {
  applyAutoJsonLd,
  escapeJsonLdForScriptTag,
  isPlainObject,
  parseJsonLdStringsToObjects,
  schemaTypeIncludes,
  stringifyJsonLdObjects,
} from "@/app/lib/jsonLdMerge";

function asRecord(value: unknown): Record<string, unknown> | null {
  return isPlainObject(value) ? value : null;
}

function typeIncludes(node: Record<string, unknown>, wanted: string): boolean {
  return schemaTypeIncludes(node, wanted);
}

const BUSINESS_TYPES = [
  "Organization",
  "LocalBusiness",
  "OnlineStore",
  "OnlineBusiness",
  "Store",
  "RecordingStudio",
] as const;

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

/**
 * Google LocalBusiness requires name + address.
 * Without a usable PostalAddress, emit Organization (no required fields).
 * @see https://developers.google.com/search/docs/appearance/structured-data/local-business
 * @see https://developers.google.com/search/docs/appearance/structured-data/logo
 */
export async function generateAutoBusinessSchema(): Promise<Record<string, unknown>> {
  const [site, identity] = await Promise.all([
    getCanonical(""),
    getStoreIdentity().catch(() => null),
  ]);
  const name = (identity?.siteName || "").trim() || "Store";
  const logo = (identity?.logoUrl || identity?.ogImageUrl || "").trim();
  const photo = (identity?.ogImageUrl || "").trim();

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Organization",
    name,
    url: site,
  };
  if (logo) schema.logo = logo;
  if (photo) schema.image = photo;
  else if (logo) schema.image = logo;

  return schema;
}

export async function buildBusinessOrganizationJsonLdString(): Promise<string | null> {
  const schema = await generateAutoBusinessSchema();
  return escapeJsonLdForScriptTag(JSON.stringify(schema));
}

export function jsonLdStringsHaveBusinessSchema(
  jsonLdStrings: string[] | undefined
): boolean {
  if (!jsonLdStrings?.length) return false;
  return jsonLdStrings.some((raw) => {
    try {
      return jsonLdContainsBusinessSchema(JSON.parse(raw) as unknown);
    } catch {
      return /"@type"\s*:\s*"(Organization|LocalBusiness|OnlineStore|RecordingStudio)"/.test(
        raw
      );
    }
  });
}

/** @deprecated use jsonLdStringsHaveBusinessSchema */
export function adminJsonLdHasBusinessSchema(
  jsonLdStrings: string[] | undefined
): boolean {
  return jsonLdStringsHaveBusinessSchema(jsonLdStrings);
}

export async function shouldSkipAutoBusinessOrganization(
  adminJsonLdStrings: string[]
): Promise<boolean> {
  if (jsonLdStringsHaveBusinessSchema(adminJsonLdStrings)) return true;

  const siteWide = await getSiteWideSchemaPublic().catch(() => [] as string[]);
  return jsonLdStringsHaveBusinessSchema(siteWide);
}

export function isBlogPathname(pathname: string | null | undefined): boolean {
  const p = String(pathname || "").toLowerCase();
  if (!p) return false;
  return p === "/blogs" || p === "/blogs/" || p.startsWith("/blogs/");
}

export function isProductPathname(pathname: string | null | undefined): boolean {
  const p = String(pathname || "").toLowerCase();
  if (!p) return false;
  return p === "/products" || p === "/products/" || p.startsWith("/products/");
}

function isStandaloneOrganizationNode(node: unknown): boolean {
  if (!isPlainObject(node)) return false;
  return (
    schemaTypeIncludes(node, "Organization") &&
    !schemaTypeIncludes(node, "OnlineStore") &&
    !schemaTypeIncludes(node, "OnlineBusiness") &&
    !schemaTypeIncludes(node, "LocalBusiness") &&
    !schemaTypeIncludes(node, "Store") &&
    !schemaTypeIncludes(node, "RecordingStudio")
  );
}

function hasUsablePostalAddress(address: unknown): boolean {
  const a = asRecord(address);
  if (!a) return false;
  const country = String(a.addressCountry || "").trim();
  const locality = String(a.addressLocality || "").trim();
  const street = String(a.streetAddress || "").trim();
  return Boolean(country) && Boolean(street || locality);
}

/**
 * Google LocalBusiness required: name + address.
 * @see https://developers.google.com/search/docs/appearance/structured-data/local-business
 */
function organizationToLocalBusiness(
  org: Record<string, unknown>
): Record<string, unknown> | null {
  if (!hasUsablePostalAddress(org.address)) return null;
  const name = String(org.name || "").trim();
  if (!name) return null;

  const out: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "LocalBusiness",
    name,
    address: org.address,
  };

  for (const key of [
    "url",
    "image",
    "logo",
    "telephone",
    "email",
    "geo",
    "openingHoursSpecification",
    "priceRange",
    "description",
    "sameAs",
    "legalName",
  ] as const) {
    if (org[key] !== undefined) out[key] = org[key];
  }
  return out;
}

function harvestOrganizationsForLocalBusiness(
  nodes: Record<string, unknown>[]
): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];

  const walk = (entry: unknown) => {
    if (!isPlainObject(entry)) return;
    if (isStandaloneOrganizationNode(entry) || schemaTypeIncludes(entry, "LocalBusiness")) {
      found.push(entry);
    }
    if (Array.isArray(entry["@graph"])) {
      for (const child of entry["@graph"]) walk(child);
    }
    walk(entry.parentOrganization);
  };

  for (const node of nodes) walk(node);
  return found;
}

/**
 * Product pages: OnlineStore + WebSite (no Product-duplicate commerce fields),
 * plus Google LocalBusiness from site-wide Organization NAP (name + address).
 * Offer.seller stays a small Organization on Product.
 */
const STORE_COMMERCE_KEYS_ON_PDP = [
  "offers",
  "hasMerchantReturnPolicy",
  "shippingDetails",
  "hasShippingService",
  "availability",
] as const;

export function siteWideJsonLdForProductPage(
  nodes: Record<string, unknown>[]
): Record<string, unknown>[] {
  let localBusiness: Record<string, unknown> | null = null;
  for (const org of harvestOrganizationsForLocalBusiness(nodes)) {
    const lb = organizationToLocalBusiness(org);
    if (lb) {
      localBusiness = lb;
      break;
    }
  }

  const slimStoreNode = (node: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = { ...node };
    const isStore =
      schemaTypeIncludes(out, "OnlineStore") ||
      schemaTypeIncludes(out, "OnlineBusiness") ||
      schemaTypeIncludes(out, "Store");
    const isWebSite = schemaTypeIncludes(out, "WebSite");

    if (isStore) {
      for (const key of STORE_COMMERCE_KEYS_ON_PDP) {
        delete out[key];
      }
      delete out.parentOrganization;
    }

    if (isWebSite) {
      if (localBusiness) out.publisher = localBusiness;
      else delete out.publisher;
    }

    return out;
  };

  const mapEntry = (entry: unknown): unknown => {
    if (!isPlainObject(entry)) return entry;
    if (isStandaloneOrganizationNode(entry) || schemaTypeIncludes(entry, "LocalBusiness")) {
      return null;
    }
    if (Array.isArray(entry["@graph"])) {
      const graph = (entry["@graph"] as unknown[])
        .map(mapEntry)
        .filter((item) => item != null);
      if (!graph.length) return null;
      return slimStoreNode({ ...entry, "@graph": graph });
    }
    return slimStoreNode(entry);
  };

  const slimmed = nodes
    .map((node) => mapEntry(node))
    .filter((node): node is Record<string, unknown> => isPlainObject(node));

  const hasWebSite = slimmed.some((node) => {
    if (schemaTypeIncludes(node, "WebSite")) return true;
    const graph = node["@graph"];
    return (
      Array.isArray(graph) &&
      graph.some((item) => isPlainObject(item) && schemaTypeIncludes(item, "WebSite"))
    );
  });

  if (localBusiness && !hasWebSite) {
    slimmed.push({
      "@context": "https://schema.org/",
      "@type": "WebSite",
      name: localBusiness.name,
      url: localBusiness.url,
      publisher: localBusiness,
    });
  }

  return slimmed;
}

/** Middleware sets x-pathname on the *request* (not the response). */
export function pathnameFromRequestHeaders(headerList: Headers): string {
  const candidates = [
    headerList.get("x-pathname"),
    headerList.get("next-url"),
    headerList.get("x-invoke-path"),
    headerList.get("x-matched-path"),
  ];
  for (const raw of candidates) {
    const value = String(raw || "").trim();
    if (!value) continue;
    try {
      if (/^https?:\/\//i.test(value)) return new URL(value).pathname;
    } catch {
      /* use as path */
    }
    return value.split("?")[0] || value;
  }
  return "";
}

/**
 * Site-wide admin JSON-LD.
 * - Product URLs: OnlineStore + WebSite with nested LocalBusiness publisher only.
 * - Blog URLs: admin as-is, no auto Organization append.
 * - Other URLs: admin as-is; append auto Organization only if no business node.
 */
export async function resolveSiteWideJsonLdStrings(
  siteWideStrings: string[],
  pathname: string | null | undefined
): Promise<string[]> {
  const adminObjects = parseJsonLdStringsToObjects(siteWideStrings);

  if (isProductPathname(pathname)) {
    const forPdp = siteWideJsonLdForProductPage(adminObjects);
    return forPdp.length
      ? stringifyJsonLdObjects(await withPodcastStudioPhotos(forPdp))
      : [];
  }

  const autoBusiness = await generateAutoBusinessSchema();
  const skipAutoBusiness = isBlogPathname(pathname);
  const merged = applyAutoJsonLd(
    adminObjects,
    { business: autoBusiness },
    {
      appendAutoBusiness: !skipAutoBusiness,
      mergeAutoBusiness: false,
    }
  );
  if (!merged.length) return [];
  return stringifyJsonLdObjects(await withPodcastStudioPhotos(merged));
}

export async function mergeAdminJsonLdWithAutoBusiness(
  adminJsonLdStrings: string[],
  options?: { appendAutoBusiness?: boolean }
): Promise<string[]> {
  const autoBusiness = await generateAutoBusinessSchema();
  const append = options?.appendAutoBusiness === true;

  const adminObjects = parseJsonLdStringsToObjects(adminJsonLdStrings);
  const merged = applyAutoJsonLd(
    adminObjects,
    { business: autoBusiness },
    { appendAutoBusiness: append, mergeAutoBusiness: false }
  );
  return stringifyJsonLdObjects(await withPodcastStudioPhotos(merged));
}
