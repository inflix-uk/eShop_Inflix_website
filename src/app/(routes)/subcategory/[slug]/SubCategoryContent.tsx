import {
  sanitizeEditorHeadings,
  stripLeadingH1IfMatchesMeta,
} from "@/app/lib/sanitizeEditorHeadings";

export default function SubCategoryContent({
  content,
  metaTitle,
  metaDescription: _metaDescription,
  metaSchemas,
}: {
  content: string;
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

  return (
    <div className="category-content mt-8">
      {metaSchemas?.length > 0 && (
        <div style={{ display: "none" }}>
          {metaSchemas.map((schema, index) => renderSchema(schema, index))}
        </div>
      )}

      <div
        className="prose prose-lg max-w-none prose-ul:list-disc prose-ol:list-decimal prose-li:my-1 prose-ul:pl-6 prose-ol:pl-6"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </div>
  );
}
