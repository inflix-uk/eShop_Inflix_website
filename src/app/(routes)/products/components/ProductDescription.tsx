import React from "react";
import HomepageContent from "@/app/components/HomepageContent";
import { DEFAULT_SITE_WIDGET_VISIBILITY } from "@/app/lib/siteWidgetVisibilityDefaults";
import { cleanCmsText } from "@/app/lib/cleanCmsText";

/**
 * NEXT_PUBLIC_PRODUCT_DESCRIPTION_FONT=zextons shows the description in the
 * font used for descriptions on zextons.co.uk (the device's system UI font)
 * instead of the store's CMS typography. Set per store: every store is built
 * from this code, and the others keep their own fonts.
 */
const ZEXTONS_DESCRIPTION_FONT =
  (process.env.NEXT_PUBLIC_PRODUCT_DESCRIPTION_FONT || "").trim().toLowerCase() === "zextons";

const productContentStyles = `
  /* !important: must win over the CMS typography rules and fonts pasted in
     with the text. Icon fonts (<i>) are left alone. */
  .product-description-zextons,
  .product-description-zextons :where(p, li, h1, h2, h3, h4, h5, h6, span, strong, em, b, u, a, td, th, blockquote, div) {
    font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" !important;
  }
  /* The CMS typography can set whole paragraphs or headings italic; emphasis
     inside them (<em>, <i>) keeps its own italics. */
  .product-description-zextons :where(p, li, h1, h2, h3, h4, h5, h6) {
    font-style: normal !important;
  }
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
  const descriptionHtml = cleanCmsText(product?.Product_description);
  const fontClass = ZEXTONS_DESCRIPTION_FONT ? " product-description-zextons" : "";

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
              <div className={`product-content max-w-none rounded-xl break-words text-black${fontClass}`}>
                <HomepageContent
                  blocks={blocks}
                  widgetVisibility={DEFAULT_SITE_WIDGET_VISIBILITY}
                />
              </div>
            ) : (
              <div
                className={`prose prose-sm sm:prose-base max-w-none text-justify rounded-xl break-words !text-black product-content${fontClass}`}
                dangerouslySetInnerHTML={{
                  __html: descriptionHtml || "<p>No content provided</p>",
                }}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}