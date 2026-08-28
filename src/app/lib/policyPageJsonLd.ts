import { normalizeMetaSchemaJsonLdStrings } from "@/app/lib/homepageJsonLd";
import { mergeAdminJsonLdWithAutoBusiness } from "@/app/lib/businessJsonLd";
import { fetchFooterPageBySlug } from "@/app/services/footerPageService";

/**
 * Admin metaSchema JSON-LD with auto Organization fields merged in
 * (admin filled keys win). Extra auto business node is not appended —
 * root layout already emits site-wide / auto business except on blogs.
 */
export async function getPolicyPageJsonLdStrings(
  footerPageSlug: string
): Promise<string[]> {
  let page = null;
  try {
    page = await fetchFooterPageBySlug(footerPageSlug);
  } catch {
    /* ignore */
  }

  const adminJsonLdStrings = normalizeMetaSchemaJsonLdStrings(page?.metaSchema);
  return mergeAdminJsonLdWithAutoBusiness(adminJsonLdStrings);
}
