import { ProductData, SelectedVariant } from "../../../../../types";

/**
 * Update page metadata from CMS fields only (aligned with `products/[...slug]/page.tsx` generateMetadata).
 */
export const updatePageMetadata = (
  product: ProductData,
  selectedVariant: SelectedVariant,
  _options: Record<string, string>
): void => {
  if (!product || !selectedVariant) return;
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const pathParts = window.location.pathname
    .replace(/^\/products\//, "")
    .split("/")
    .filter(Boolean);
  const isVariantUrl = pathParts.length > 1;

  const cmsTitle = isVariantUrl
    ? String(selectedVariant.metaTitle || "")
    : String(product.Seo_Meta?.metaTitle || "");
  const cmsDescription = isVariantUrl
    ? String(selectedVariant.metaDescription || "")
    : String(product.Seo_Meta?.metaDescription || "");
  const cmsKeywords = isVariantUrl
    ? String(selectedVariant.metaKeywords || "")
    : String(product.Seo_Meta?.metaKeywords || "");

  document.title = cmsTitle;

  let metaTitleTag = document.querySelector('meta[property="og:title"]');
  if (!metaTitleTag) {
    metaTitleTag = document.createElement("meta");
    metaTitleTag.setAttribute("property", "og:title");
    document.head.appendChild(metaTitleTag);
  }
  metaTitleTag.setAttribute("content", cmsTitle);

  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement("meta");
    metaDescription.setAttribute("name", "description");
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute("content", cmsDescription);

  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (!metaKeywords) {
    metaKeywords = document.createElement("meta");
    metaKeywords.setAttribute("name", "keywords");
    document.head.appendChild(metaKeywords);
  }
  metaKeywords.setAttribute("content", cmsKeywords);
};

/**
 * Update JSON-LD schema markup in the document
 */
export const updateSchemaMarkup = (schemas: any[]): void => {
  if (!schemas || schemas.length === 0) return;
  if (typeof document === "undefined") return;
  
  // Remove existing schema scripts
  const existingSchemas = document.querySelectorAll('script[type="application/ld+json"]');
  existingSchemas.forEach(script => script.remove());
  
  // Add new schema scripts
  schemas.forEach((schema, index) => {
    try {
      const parsedSchema = typeof schema === "string" ? JSON.parse(schema) : schema;
      
      // Ensure parsedSchema is a valid object
      if (parsedSchema && typeof parsedSchema === "object" && Object.keys(parsedSchema).length > 0) {
        const scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.textContent = JSON.stringify(parsedSchema);
        document.head.appendChild(scriptTag);
      }
    } catch (error) {
      console.error(`Error parsing schema at index ${index}:`, error);
    }
  });
};
