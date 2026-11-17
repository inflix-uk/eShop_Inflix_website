"use client";

import Image from "next/image";
import {
  getHomepageImageUrl,
  type HomepageBlock,
  type ContentBlock,
  type ImageContent,
} from "@/app/services/homepageDataService";
import type { SiteWidgetVisibility } from "@/app/lib/siteWidgetVisibilityDefaults";
import { DEFAULT_SITE_WIDGET_VISIBILITY } from "@/app/lib/siteWidgetVisibilityDefaults";
import { CmsWidgetAndProductBlock } from "@/app/components/cms/CmsWidgetAndProductBlock";
import type { Product } from "../../../types";
import type { Blog } from "../../../types";

/**
 * Renders a text block with HTML content
 */
function TextBlock({ content }: { content: string }) {
  return (
    <div
      className="prose prose-lg max-w-none prose-headings:text-primary prose-a:text-primary prose-strong:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

/**
 * Renders an image block with optional heading and external link
 */
function ImageBlock({
  block,
}: {
  block: {
    content: ImageContent;
  };
}) {
  const imageUrl = getHomepageImageUrl(block.content.url);
  const hasLink = block.content.externalLink;

  const imageElement = (
    <div className="my-6">
      {block.content.heading && (
        <h3 className="text-xl font-semibold mb-3 text-gray-900">
          {block.content.heading}
        </h3>
      )}
      {imageUrl ? (
        <div className="relative w-full aspect-[2/1] overflow-hidden rounded-lg shadow-md bg-gray-100">
          <Image
            src={imageUrl}
            alt={block.content.alt || block.content.heading || "Image"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            quality={70}
            loading="lazy"
            unoptimized={imageUrl.startsWith("http://localhost")}
          />
        </div>
      ) : (
        <div className="w-full aspect-[2/1] bg-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-500">Image not available</span>
        </div>
      )}
    </div>
  );

  if (hasLink) {
    return (
      <a
        href={hasLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-90 transition-opacity"
      >
        {imageElement}
      </a>
    );
  }

  return imageElement;
}

/**
 * Renders a single block based on its type
 */
function BlockRenderer({
  block,
  widgetVisibility,
  initialProducts,
  initialBlogs,
}: {
  block: ContentBlock;
  widgetVisibility: SiteWidgetVisibility;
  initialProducts?: Product[];
  initialBlogs?: Blog[];
}) {
  if (block.type === "text") {
    return (
      <TextBlock
        content={typeof block.content === "string" ? block.content : ""}
      />
    );
  }

  if (block.type === "image") {
    return <ImageBlock block={{ content: block.content as ImageContent }} />;
  }

  if (block.type === "products" || block.type === "widget") {
    return (
      <CmsWidgetAndProductBlock
        block={block}
        widgetVisibility={widgetVisibility}
        initialProducts={initialProducts}
        initialBlogs={initialBlogs}
      />
    );
  }

  return null;
}

/**
 * Renders a column with its blocks
 */
function ColumnRenderer({
  column,
  widgetVisibility,
  rowIndex,
  colIndex,
  prefetchedProductsMap,
  prefetchedBlogsMap,
}: {
  column: { width: number; blocks?: ContentBlock[] };
  widgetVisibility: SiteWidgetVisibility;
  rowIndex: number;
  colIndex: number;
  prefetchedProductsMap?: Record<string, Product[]>;
  prefetchedBlogsMap?: Record<string, Blog[]>;
}) {
  const columnBlocks = column.blocks ?? [];
  return (
    <div
      className="min-w-0 w-full flex-[1_1_100%] sm:flex-1 sm:basis-0 sm:w-auto sm:min-w-[250px] sm:max-w-[var(--homepage-col-max)]"
      style={{ ["--homepage-col-max" as string]: `${column.width}%` }}
    >
      <div className="space-y-4">
        {columnBlocks.map((block, blockIndex) => {
          const key = `${rowIndex}-${colIndex}-${blockIndex}`;
          const initialProducts = prefetchedProductsMap?.[key];
          const initialBlogs = prefetchedBlogsMap?.[key];
          return (
            <BlockRenderer
              key={blockIndex}
              block={block}
              widgetVisibility={widgetVisibility}
              initialProducts={initialProducts}
              initialBlogs={initialBlogs}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renders a row with its columns
 */
function RowRenderer({
  row,
  widgetVisibility,
  rowIndex,
  prefetchedProductsMap,
  prefetchedBlogsMap,
}: {
  row: HomepageBlock;
  widgetVisibility: SiteWidgetVisibility;
  rowIndex: number;
  prefetchedProductsMap?: Record<string, Product[]>;
  prefetchedBlogsMap?: Record<string, Blog[]>;
}) {
  const rowColumns = row.columns ?? [];
  return (
    <div className="flex flex-wrap gap-4 sm:gap-6 my-6 sm:my-8">
      {rowColumns.map((column, colIndex) => (
        <ColumnRenderer
          key={colIndex}
          column={column}
          widgetVisibility={widgetVisibility}
          rowIndex={rowIndex}
          colIndex={colIndex}
          prefetchedProductsMap={prefetchedProductsMap}
          prefetchedBlogsMap={prefetchedBlogsMap}
        />
      ))}
    </div>
  );
}

/**
 * Homepage Content Component
 * Renders the dynamic content blocks from the admin panel
 */
export default function HomepageContent({
  blocks,
  widgetVisibility = DEFAULT_SITE_WIDGET_VISIBILITY,
  prefetchedProductsMap,
  prefetchedBlogsMap,
}: {
  blocks: HomepageBlock[];
  widgetVisibility?: SiteWidgetVisibility;
  prefetchedProductsMap?: Record<string, Product[]>;
  prefetchedBlogsMap?: Record<string, Blog[]>;
}) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <>
      {blocks.map((row, rowIndex) => (
        <RowRenderer
          key={row.id ?? `homepage-row-${rowIndex}`}
          row={row}
          widgetVisibility={widgetVisibility}
          rowIndex={rowIndex}
          prefetchedProductsMap={prefetchedProductsMap}
          prefetchedBlogsMap={prefetchedBlogsMap}
        />
      ))}
    </>
  );
}
