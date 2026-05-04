"use client";

import BlogSliderWidget from "@/app/(routes)/blogs/new/[slug]/BlogSliderWidget";
import BlogVideoWidget from "@/app/(routes)/blogs/new/[slug]/BlogVideoWidget";
import BlogMapWidget from "@/app/(routes)/blogs/new/[slug]/BlogMapWidget";
import BlogGalleryWidget from "@/app/(routes)/blogs/new/[slug]/BlogGalleryWidget";
import BlogIconBoxWidget from "@/app/(routes)/blogs/new/[slug]/BlogIconBoxWidget";
import BlogTestimonialsWidget from "@/app/(routes)/blogs/new/[slug]/BlogTestimonialsWidget";
import BlogTrustpilotEmbedWidget from "@/app/(routes)/blogs/new/[slug]/BlogTrustpilotEmbedWidget";
import BlogSiteBannersWidget from "@/app/(routes)/blogs/new/[slug]/BlogSiteBannersWidget";
import BlogCategoryCardsWidget from "@/app/(routes)/blogs/new/[slug]/BlogCategoryCardsWidget";
import BlogPromotionalSectionsWidget from "@/app/(routes)/blogs/new/[slug]/BlogPromotionalSectionsWidget";
import BlogLatestBlogsWidget from "@/app/(routes)/blogs/new/[slug]/BlogLatestBlogsWidget";
import BlogHtmlCssWidget from "@/app/(routes)/blogs/new/[slug]/BlogHtmlCssWidget";
import BlogContactUsWidget from "@/app/(routes)/blogs/new/[slug]/BlogContactUsWidget";
import NewsletterSignupWidget from "@/app/(routes)/blogs/new/[slug]/NewsletterSignupWidget";
import FaqWidget from "@/app/(routes)/blogs/new/[slug]/FaqWidget";
import DealsDiscountCardsWidget from "@/app/components/deals/DealsDiscountCardsWidget";
import ContentProductSlider from "@/app/components/ContentProductSlider";

function getFullImageUrl(imagePath?: string | null): string {
  if (imagePath == null || imagePath === "") return "";
  const trimmed = String(imagePath).trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const normalized = trimmed.replace(/^\/?uploads\//, "");
  return `${apiBase}/uploads/${normalized}`;
}

export default function ProfileBlocksRenderer({ blocks = [] }: { blocks: any[] }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((row, rowIndex) => (
        <div key={row?.id || `profile-row-${rowIndex}`} className="flex flex-col lg:flex-row gap-4">
          {(row?.columns || []).map((column: any, colIndex: number) => {
            const width = Number(column?.width || 0);
            const hasWidth = Number.isFinite(width) && width > 0;
            const widthPct = Math.min(100, Math.max(1, width));

            return (
              <div
                key={column?.id || `profile-col-${rowIndex}-${colIndex}`}
                className="space-y-4"
                style={{
                  width: "100%",
                  ...(hasWidth
                    ? {
                        flex: `0 0 ${widthPct}%`,
                        maxWidth: `${widthPct}%`,
                      }
                    : { flex: 1 }),
                }}
              >
                {(column?.blocks || []).map((block: any, blockIndex: number) => {
                  const blockKey =
                    block?.id || `profile-block-${rowIndex}-${colIndex}-${blockIndex}`;

                  if (block?.type === "text" && typeof block?.content === "string") {
                    return (
                      <div
                        key={blockKey}
                        className="prose prose-sm sm:prose-base max-w-none"
                        dangerouslySetInnerHTML={{ __html: block.content }}
                      />
                    );
                  }

                  if (block?.type === "image" && block?.content && typeof block.content === "object") {
                    const imageUrl = getFullImageUrl(block.content?.url);
                    if (!imageUrl) return null;
                    return (
                      <div key={blockKey} className="space-y-2">
                        <img
                          src={imageUrl}
                          alt={block.content?.alt || "Profile content image"}
                          className="w-full h-auto rounded-lg border border-gray-200 object-cover"
                        />
                        {block.content?.heading ? (
                          <p className="text-sm font-medium text-gray-800">
                            {block.content.heading}
                          </p>
                        ) : null}
                      </div>
                    );
                  }

                  if (block?.type === "products") {
                    return <ContentProductSlider key={blockKey} content={block.content || {}} />;
                  }

                  if (block?.type === "widget") {
                    const widgetType = block?.content?.widgetType;

                    if (widgetType === "slider") {
                      return (
                        <BlogSliderWidget
                          key={blockKey}
                          slides={block.content.slides || []}
                          sectionHeading={block.content.sectionHeading}
                          sectionDescription={block.content.sectionDescription}
                        />
                      );
                    }
                    if (widgetType === "newsletter") {
                      return (
                        <NewsletterSignupWidget
                          key={blockKey}
                          heading={block.content.heading}
                          description={block.content.description}
                          placeholder={block.content.placeholder}
                          buttonLabel={block.content.buttonLabel}
                          imageUrl={block.content.imageUrl}
                        />
                      );
                    }
                    if (widgetType === "faq") {
                      return (
                        <FaqWidget
                          key={blockKey}
                          sectionHeading={block.content.sectionHeading}
                          items={block.content.items}
                        />
                      );
                    }
                    if (widgetType === "video") {
                      return (
                        <BlogVideoWidget
                          key={blockKey}
                          videoUrl={block.content.videoUrl}
                          heading={block.content.heading}
                          caption={block.content.caption}
                        />
                      );
                    }
                    if (widgetType === "map") {
                      return (
                        <BlogMapWidget
                          key={blockKey}
                          embedUrl={block.content.embedUrl}
                          heading={block.content.heading}
                          heightPx={block.content.heightPx}
                        />
                      );
                    }
                    if (widgetType === "gallery") {
                      return (
                        <BlogGalleryWidget
                          key={blockKey}
                          items={block.content.items || []}
                          heading={block.content.heading}
                        />
                      );
                    }
                    if (widgetType === "iconBox") {
                      return (
                        <BlogIconBoxWidget
                          key={blockKey}
                          items={block.content.items || []}
                          heading={block.content.heading}
                        />
                      );
                    }
                    if (widgetType === "testimonials") {
                      return (
                        <BlogTestimonialsWidget
                          key={blockKey}
                          items={block.content.items || []}
                          heading={block.content.heading}
                          description={block.content.description}
                          resolveImageUrl={(path) => getFullImageUrl(path) || ""}
                        />
                      );
                    }
                    if (widgetType === "trustpilot") {
                      return (
                        <BlogTrustpilotEmbedWidget
                          key={blockKey}
                          embedScript={block.content.embedScript}
                        />
                      );
                    }
                    if (widgetType === "siteBanners") {
                      return <BlogSiteBannersWidget key={blockKey} items={block.content.items || []} />;
                    }
                    if (widgetType === "categoryCards") {
                      return (
                        <BlogCategoryCardsWidget
                          key={blockKey}
                          headingText={block.content.headingText}
                          headingColor={block.content.headingColor}
                          dividerColor={block.content.dividerColor}
                          sectionBackgroundColor={block.content.sectionBackgroundColor}
                          items={block.content.items || []}
                        />
                      );
                    }
                    if (widgetType === "promotionalSections") {
                      return (
                        <BlogPromotionalSectionsWidget
                          key={blockKey}
                          buyNowPayLater={block.content.buyNowPayLater}
                          sellBuyCards={block.content.sellBuyCards}
                          tinyPhoneBanner={block.content.tinyPhoneBanner}
                          resolveImageUrl={(path) => getFullImageUrl(path) || ""}
                        />
                      );
                    }
                    if (widgetType === "latestBlogs") {
                      return (
                        <BlogLatestBlogsWidget
                          key={blockKey}
                          sectionHeading={block.content.sectionHeading}
                          maxPosts={block.content.maxPosts}
                          viewAllLabel={block.content.viewAllLabel}
                        />
                      );
                    }
                    if (widgetType === "dealsDiscountCards") {
                      return (
                        <DealsDiscountCardsWidget
                          key={blockKey}
                          sectionHeading={block.content.sectionHeading}
                          items={block.content.items || []}
                        />
                      );
                    }
                    if (widgetType === "contactUs") {
                      return <BlogContactUsWidget key={blockKey} content={block.content} />;
                    }
                    if (widgetType === "htmlCss") {
                      return (
                        <BlogHtmlCssWidget
                          key={blockKey}
                          html={block.content.html}
                          css={block.content.css}
                        />
                      );
                    }
                  }

                  return null;
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
