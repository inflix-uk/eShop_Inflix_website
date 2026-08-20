import { normalizeMetaSchemaJsonLdStrings } from "@/app/lib/homepageJsonLd";
import {
  buildBusinessOrganizationJsonLdString,
  shouldSkipAutoBusinessOrganization,
} from "@/app/lib/businessJsonLd";
import { fetchFooterPageBySlug } from "@/app/services/footerPageService";

/**
 * Admin metaSchema JSON-LD + auto Organization only when neither
 * page admin nor site-wide schema already provides a business Organization.
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
  const out = [...adminJsonLdStrings];

  const skipAuto = await shouldSkipAutoBusinessOrganization(adminJsonLdStrings);
  if (!skipAuto) {
    const business = await buildBusinessOrganizationJsonLdString();
    if (business) out.push(business);
  }

  return out;
}
