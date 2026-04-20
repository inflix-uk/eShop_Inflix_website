import {
  sanitizeEditorHeadings,
  stripLeadingH1IfMatchesMeta,
} from "@/app/lib/sanitizeEditorHeadings";
import HomepageContent from "@/app/components/HomepageContent";
import {
  DEFAULT_SITE_WIDGET_VISIBILITY,
} from "@/app/services/siteWidgetSettingsService";

const subcategoryContentStyles = `
  .subcategory-block-content ul li h1,
  .subcategory-block-content ul li h2,
  .subcategory-block-content ul li h3,
  .subcategory-block-content ul li h4,
  .subcategory-block-content ul li h5,
  .subcategory-block-content ul li h6,
  .subcategory-block-content ol li h1,
  .subcategory-block-content ol li h2,
  .subcategory-block-content ol li h3,
  .subcategory-block-content ol li h4,
  .subcategory-block-content ol li h5,
  .subcategory-block-content ol li h6 {
    display: inline !important;
    margin: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
  }
`;

export default function SubCategoryContent({
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
      <style dangerouslySetInnerHTML={{ __html: subcategoryContentStyles }} />
      {metaSchemas?.length > 0 && (
        <div style={{ display: "none" }}>
          {metaSchemas.map((schema, index) => renderSchema(schema, index))}
        </div>
      )}

      {hasBlocks ? (
        <div className="subcategory-block-content max-w-none break-words text-black">
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
