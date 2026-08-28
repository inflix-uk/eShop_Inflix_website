/**
 * Shared JSON-LD helpers: admin fields win, auto fills only missing keys.
 * Google accepts short schema.org enum names (InStock) and full URLs.
 * We prefer short names. @see https://schema.org/ and
 * https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
 */

export function escapeJsonLdForScriptTag(json: string): string {
  return json.replace(/</g, "\\u003c");
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function schemaTypeIncludes(
  node: Record<string, unknown>,
  wanted: string
): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type === wanted;
  if (Array.isArray(type)) return type.some((t) => t === wanted);
  return false;
}

const BUSINESS_TYPES = [
  "Organization",
  "LocalBusiness",
  "OnlineStore",
  "OnlineBusiness",
  "Store",
  "RecordingStudio",
] as const;

export function isBusinessSchemaNode(
  node: unknown
): node is Record<string, unknown> {
  if (!isPlainObject(node)) return false;
  if (BUSINESS_TYPES.some((t) => schemaTypeIncludes(node, t))) return true;
  const type = node["@type"];
  if (typeof type === "string" && type.length > 0) {
    // schema.org LocalBusiness subtypes (e.g. ProfessionalService)
    return false;
  }
  return false;
}

export function isProductSchemaNode(
  node: unknown
): node is Record<string, unknown> {
  return isPlainObject(node) && schemaTypeIncludes(node, "Product");
}

export function isFaqPageSchemaNode(
  node: unknown
): node is Record<string, unknown> {
  return isPlainObject(node) && schemaTypeIncludes(node, "FAQPage");
}

export function hasNonEmptyField(
  obj: Record<string, unknown>,
  key: string
): boolean {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return false;
  const value = obj[key];
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

/** Keep every admin field; fill only missing keys from auto. Admin arrays are never replaced. */
export function mergeMissingSchemaFields(
  adminNode: Record<string, unknown>,
  autoNode: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...adminNode };

  for (const [key, autoVal] of Object.entries(autoNode)) {
    if (autoVal == null) continue;

    if (!hasNonEmptyField(out, key)) {
      out[key] = autoVal;
      continue;
    }

    const adminVal = out[key];
    if (isPlainObject(adminVal) && isPlainObject(autoVal)) {
      out[key] = mergeMissingSchemaFields(adminVal, autoVal);
    }
  }

  return out;
}

export function toSchemaOrgShortEnum(value: unknown): string | null {
  if (value == null) return null;
  let raw = String(value).trim();
  if (!raw) return null;
  raw = raw
    .replace(/^https?:\/\/schema\.org\//i, "")
    .replace(/^schema\.org\//i, "")
    .trim();
  return raw || null;
}

export function parseJsonLdStringsToObjects(
  strings: string[] | undefined
): Record<string, unknown>[] {
  if (!strings?.length) return [];
  const out: Record<string, unknown>[] = [];
  for (const raw of strings) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        out.push({
          "@context": "https://schema.org/",
          "@graph": parsed.filter(isPlainObject),
        });
      } else if (isPlainObject(parsed)) {
        out.push(parsed);
      }
    } catch {
      /* skip invalid JSON */
    }
  }
  return out;
}

export function stringifyJsonLdObjects(
  objects: Record<string, unknown>[]
): string[] {
  return objects.map((obj) =>
    escapeJsonLdForScriptTag(JSON.stringify(obj))
  );
}

export type AutoJsonLdExtras = {
  product?: Record<string, unknown> | null;
  business?: Record<string, unknown> | null;
  faq?: Record<string, unknown> | null;
};

export type ApplyAutoJsonLdOptions = {
  appendAutoProduct?: boolean;
  appendAutoBusiness?: boolean;
  /** When false, existing admin business nodes stay untouched (no extra logo/image). */
  mergeAutoBusiness?: boolean;
  appendAutoFaq?: boolean;
  finalizeProduct?: (
    node: Record<string, unknown>,
    autoProduct: Record<string, unknown>
  ) => Record<string, unknown>;
};

function mapGraph(
  node: Record<string, unknown>,
  mapper: (entry: unknown) => unknown
): Record<string, unknown> {
  if (!Array.isArray(node["@graph"])) return node;
  return { ...node, "@graph": (node["@graph"] as unknown[]).map(mapper) };
}

/**
 * Merge auto Product / LocalBusiness|Organization / FAQPage into admin JSON-LD.
 * Filled admin fields win; missing keys come from auto. Does not emit a second
 * node of the same type when admin already has that type.
 */
export function applyAutoJsonLd(
  adminObjects: Record<string, unknown>[],
  autos: AutoJsonLdExtras,
  options: ApplyAutoJsonLdOptions = {}
): Record<string, unknown>[] {
  const {
    appendAutoProduct = true,
    appendAutoBusiness = true,
    mergeAutoBusiness = true,
    appendAutoFaq = true,
    finalizeProduct,
  } = options;

  const autoProduct = autos.product || null;
  const autoBusiness = autos.business || null;
  const autoFaq = autos.faq || null;

  let mergedProduct = false;
  let mergedBusiness = false;
  let mergedFaq = false;

  const mergeProduct = (node: Record<string, unknown>) => {
    if (!autoProduct) return node;
    mergedProduct = true;
    const merged = mergeMissingSchemaFields(node, autoProduct);
    return finalizeProduct ? finalizeProduct(merged, autoProduct) : merged;
  };

  const mergeBusiness = (node: Record<string, unknown>) => {
    if (!autoBusiness) return node;
    mergedBusiness = true;
    return mergeMissingSchemaFields(node, autoBusiness);
  };

  const mergeFaq = (node: Record<string, unknown>) => {
    if (!autoFaq) return node;
    mergedFaq = true;
    return mergeMissingSchemaFields(node, autoFaq);
  };

  const walkEntry = (entry: unknown): unknown => {
    if (!isPlainObject(entry)) return entry;
    if (isProductSchemaNode(entry)) return mergeProduct(entry);
    if (isBusinessSchemaNode(entry)) {
      mergedBusiness = true;
      return mergeAutoBusiness && autoBusiness ? mergeBusiness(entry) : entry;
    }
    if (isFaqPageSchemaNode(entry)) return mergeFaq(entry);
    if (Array.isArray(entry["@graph"])) return mapGraph(entry, walkEntry);

    const nestedKeys = ["about", "publisher", "mainEntity", "provider"] as const;
    let next: Record<string, unknown> = entry;
    for (const key of nestedKeys) {
      const nested = next[key];
      if (isBusinessSchemaNode(nested)) {
        mergedBusiness = true;
        next =
          mergeAutoBusiness && autoBusiness
            ? { ...next, [key]: mergeBusiness(nested) }
            : next;
      } else if (isProductSchemaNode(nested) && autoProduct) {
        next = { ...next, [key]: mergeProduct(nested) };
      } else if (isFaqPageSchemaNode(nested) && autoFaq) {
        next = { ...next, [key]: mergeFaq(nested) };
      }
    }
    return next;
  };

  const resolved = adminObjects.map((node) => walkEntry(node) as Record<string, unknown>);

  const extras: Record<string, unknown>[] = [];
  if (autoProduct && appendAutoProduct && !mergedProduct) {
    extras.push(
      finalizeProduct ? finalizeProduct(autoProduct, autoProduct) : autoProduct
    );
  }
  if (autoBusiness && appendAutoBusiness && !mergedBusiness) {
    extras.push(autoBusiness);
  }
  if (autoFaq && appendAutoFaq && !mergedFaq) {
    extras.push(autoFaq);
  }

  if (!adminObjects.length) return extras;
  return [...extras.filter((e) => isProductSchemaNode(e)), ...resolved, ...extras.filter((e) => !isProductSchemaNode(e))];
}
