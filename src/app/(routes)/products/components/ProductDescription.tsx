import React from "react";
import HomepageContent from "@/app/components/HomepageContent";
import {
  DEFAULT_SITE_WIDGET_VISIBILITY,
} from "@/app/services/siteWidgetSettingsService";

const productContentStyles = `
  .product-content ul li h1,
  .product-content ul li h2,
  .product-content ul li h3,
  .product-content ul li h4,
  .product-content ul li h5,
  .product-content ul li h6,
  .product-content ol li h1,
  .product-content ol li h2,
  .product-content ol li h3,
  .product-content ol li h4,
  .product-content ol li h5,
  .product-content ol li h6 {
    display: inline !important;
    margin: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
  }
  .product-content li > h1:first-child,
  .product-content li > h2:first-child,
  .product-content li > h3:first-child,
  .product-content li > h4:first-child,
  .product-content li > h5:first-child,
  .product-content li > h6:first-child {
    display: inline !important;
    margin: 0 !important;
  }
  /* Hide br tags inside li before headings */
  .product-content li > br:first-child,
  .product-content li br:first-child {
    display: none !important;
  }
  /* Ensure li children don't have top margin */
  .product-content li > *:first-child {
    margin-top: 0 !important;
    padding-top: 0 !important;
  }
  .product-content li {
    padding-top: 0 !important;
  }
`;

export default function ProductDescription({
  product,
}: {
  product: any;
}) {
  const blocks = product?.Product_description_blocks;
  const hasBlocks = Array.isArray(blocks) && blocks.length > 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: productContentStyles }} />
      <section className="relative z-10">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Product Description :
            </h2>
          </div>
          <div className="relative z-10 flex-1">
            {hasBlocks ? (
              <div className="product-content max-w-none rounded-xl break-words text-black">
                <HomepageContent
                  blocks={blocks}
                  widgetVisibility={DEFAULT_SITE_WIDGET_VISIBILITY}
                />
              </div>
            ) : (
              <div
                className="prose prose-sm sm:prose-base max-w-none text-justify rounded-xl break-words !text-black product-content"
                dangerouslySetInnerHTML={{
                  __html: product?.Product_description || "<p>No content provided</p>",
                }}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}