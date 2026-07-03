import { metaSchemaEntryToJsonLdString } from "@/app/lib/homepageJsonLd";

export { metaSchemaEntryToJsonLdString };

const SCHEMA_CONTEXT = "https://schema.org";

export function getDefaultBookingPageJsonLdString(
  pageUrl: string,
  siteName = ""
): string {
  const url = pageUrl.endsWith("/") ? pageUrl : `${pageUrl}/`;
  return JSON.stringify({
    "@context": SCHEMA_CONTEXT,
    "@type": "WebPage",
    name: siteName ? `Book an appointment | ${siteName}` : "Book an appointment",
    description:
      "Online booking for services. Choose a time slot and confirm your appointment.",
    url,
    isPartOf: siteName
      ? {
          "@type": "WebSite",
          name: siteName,
        }
      : undefined,
  });
}

export function bookingJsonLdStringsFromSeo(
  metaSchema: string[],
  canonicalUrl: string,
  siteName: string
): string[] {
  const fromAdmin = metaSchema
    .map((entry) => metaSchemaEntryToJsonLdString(entry))
    .filter((s): s is string => Boolean(s && s.length > 0));

  if (fromAdmin.length > 0) return fromAdmin;

  return [getDefaultBookingPageJsonLdString(canonicalUrl, siteName)];
}
