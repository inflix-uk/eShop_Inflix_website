"use client";

import { CmsWidgetAndProductBlock } from "@/app/components/cms/CmsWidgetAndProductBlock";
import type { ContentBlock } from "@/app/services/homepageDataService";
import { getImageUrl } from "@/app/services/footerPageService";
import type { SiteWidgetVisibility } from "@/app/services/siteWidgetSettingsService";
import { DEFAULT_SITE_WIDGET_VISIBILITY } from "@/app/services/siteWidgetSettingsService";

type GenericSection = Record<string, unknown> & { type: string };

function Hero({ heading = "", description = "" }: { heading?: string; description?: string }) {
  return (
    <section className="my-6">
      {heading ? <h1 className="text-3xl font-semibold mb-2">{heading}</h1> : null}
      {description ? <p className="text-gray-700">{description}</p> : null}
    </section>
  );
}

function ProductGrid({ items = [] }: { items?: unknown[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section className="my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <div key={idx} className="border rounded p-4 bg-white">
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(item, null, 2)}</pre>
        </div>
      ))}
    </section>
  );
}

function RowSection({
  section,
  widgetVisibility,
}: {
  section: GenericSection;
  widgetVisibility: SiteWidgetVisibility;
}) {
  const columns = Array.isArray(section.columns) ? section.columns : [];
  if (columns.length === 0) return null;

  return (
    <section className="my-6 flex flex-col sm:flex-row gap-4 sm:gap-6">
      {columns.map((col, colIndex) => {
        const c = (col ?? {}) as { width?: number; blocks?: unknown[] };
        const blocks = Array.isArray(c.blocks) ? c.blocks : [];
        const width = typeof c.width === "number" ? c.width : 100;

        return (
          <div key={colIndex} className="flex-1 w-full" style={{ maxWidth: `${width}%` }}>
            <div className="space-y-4">
              {blocks.map((block, blockIndex) => {
                const b = (block ?? {}) as { type?: string; content?: unknown };
                if (b.type === "text") {
                  return (
                    <div
                      key={blockIndex}
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: typeof b.content === "string" ? b.content : "",
                      }}
                    />
                  );
                }
                if (b.type === "image") {
                  const img = (b.content ?? {}) as { url?: string; alt?: string };
                  const src = getImageUrl(img.url);
                  return src ? (
                    <img key={blockIndex} src={src} alt={img.alt || ""} className="w-full h-auto rounded" />
                  ) : null;
                }
                if (b.type === "widget" || b.type === "products") {
                  return (
                    <CmsWidgetAndProductBlock
                      key={blockIndex}
                      block={b as ContentBlock}
                      widgetVisibility={widgetVisibility}
                      resolveImageUrl={(path) => getImageUrl(path ?? undefined)}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function RenderSections({ sections }: { sections: GenericSection[] }) {
  const widgetVisibility = DEFAULT_SITE_WIDGET_VISIBILITY;

  return (
    <>
      {sections.map((section, index) => {
        switch (section.type) {
          case "hero":
            return (
              <Hero
                key={index}
                heading={typeof section.heading === "string" ? section.heading : ""}
                description={typeof section.description === "string" ? section.description : ""}
              />
            );
          case "products":
            return (
              <ProductGrid
                key={index}
                items={Array.isArray(section.items) ? section.items : []}
              />
            );
          case "row":
            return <RowSection key={index} section={section} widgetVisibility={widgetVisibility} />;
          default:
            return null;
        }
      })}
    </>
  );
}
