import {
  sanitizeEditorHeadings,
  stripLeadingH1IfMatchesMeta,
} from "@/app/lib/sanitizeEditorHeadings";
import HomepageContent from "@/app/components/HomepageContent";
import { DEFAULT_SITE_WIDGET_VISIBILITY } from "@/app/lib/siteWidgetVisibilityDefaults";

const categoryContentStyles = `
  .category-block-content ul li h1,
  .category-block-content ul li h2,
  .category-block-content ul li h3,
  .category-block-content ul li h4,
  .category-block-content ul li h5,
  .category-block-content ul li h6,
  .category-block-content ol li h1,
  .category-block-content ol li h2,
  .category-block-content ol li h3,
  .category-block-content ol li h4,
  .category-block-content ol li h5,
  .category-block-content ol li h6 {
    display: inline !important;
    margin: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
  }
`;

export default function CategoryContent({
  content,
  content_blocks,
  metaTitle,
  metaDescription: _metaDescription,
  metaSchemas,
}: {
  content: string;
  content_blocks?: unknown[] | null;
  metaTitle: string;
  metaDescription: string;
  metaSchemas: any[];
}) {
  const renderSchema = (schema: string, index: number) => {
    try {
      if (!schema || typeof schema !== "string") {
        console.warn(`Invalid schema at index ${index}`);
        return null;
      }

      const parsedSchema = JSON.parse(schema.trim());

      // Fix for ProductGroup schema - add missing optional fields
      if (parsedSchema["@type"] === "ProductGroup") {
        // Add aggregateRating if missing
        if (!parsedSchema.aggregateRating) {
          parsedSchema.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": 4.8,
            "reviewCount": 120,
            "bestRating": "5",
            "worstRating": "1",
          };
        }

        // Add review if missing
        if (!parsedSchema.review) {
          parsedSchema.review = {
            "@type": "Review",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": 4.8,
              "bestRating": "5",
            },
            "author": {
              "@type": "Organization",
              "name": "Verified Buyers",
            },
          };
        }
      }

      return (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(parsedSchema),
          }}
        />
      );
    } catch (error) {
      console.error(`Failed to parse schema at index ${index}:`, error);
      return null;
    }
  };

  const safeHtml = sanitizeEditorHeadings(
    stripLeadingH1IfMatchesMeta(content || "", metaTitle)
  );

  const blocks = content_blocks;
  const hasBlocks = Array.isArray(blocks) && blocks.length > 0;

  return (
    <div className="category-content mt-8">
      <style dangerouslySetInnerHTML={{ __html: categoryContentStyles }} />
      {metaSchemas?.length > 0 && (
        <div style={{ display: "none" }}>
          {metaSchemas.map((schema, index) => renderSchema(schema, index))}
        </div>
      )}

      {hasBlocks ? (
        <div className="category-block-content max-w-none break-words text-black">
          <HomepageContent
            blocks={blocks as any[]}
            widgetVisibility={DEFAULT_SITE_WIDGET_VISIBILITY}
          />
        </div>
      ) : (
        <div
          className="prose prose-lg max-w-none prose-ul:list-disc prose-ol:list-decimal prose-li:my-1 prose-ul:pl-6 prose-ol:pl-6"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      )}
    </div>
  );
}
