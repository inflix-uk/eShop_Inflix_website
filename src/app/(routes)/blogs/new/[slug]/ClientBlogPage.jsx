"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import PropTypes from "prop-types";
import Link from "next/link";
import TableOfContents from "../TableOfContents";
import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";

import { getFullImageUrl } from "./blogUtils";
import {
  blogHasHtmlCssPrimaryContent,
  normalizeBlogBlockColumns,
} from "../../lib/blogHtmlCssUtils";
import BlogSliderWidget from "./BlogSliderWidget";
import BlogVideoWidget from "./BlogVideoWidget";
import BlogMapWidget from "./BlogMapWidget";
import BlogGalleryWidget from "./BlogGalleryWidget";
import BlogIconBoxWidget from "./BlogIconBoxWidget";
import BlogTestimonialsWidget from "./BlogTestimonialsWidget";
import BlogTrustpilotEmbedWidget from "./BlogTrustpilotEmbedWidget";
import BlogSiteBannersWidget from "./BlogSiteBannersWidget";
import BlogCategoryCardsWidget from "./BlogCategoryCardsWidget";
import BlogPromotionalSectionsWidget from "./BlogPromotionalSectionsWidget";
import BlogLatestBlogsWidget from "./BlogLatestBlogsWidget";
import BlogHtmlCssWidget from "./BlogHtmlCssWidget";
import BlogContactUsWidget from "./BlogContactUsWidget";
import BlogNavbarWidget from "./BlogNavbarWidget";
import DealsDiscountCardsWidget from "@/app/components/deals/DealsDiscountCardsWidget";
import NewsletterSignupWidget from "./NewsletterSignupWidget";
import FaqWidget from "./FaqWidget";
import { getSiteWidgetSettingsPublic } from "@/app/services/siteWidgetSettingsService";
import ContentProductSlider from "@/app/components/ContentProductSlider";

/**
 * @typedef {import("@/app/services/navbarVariantTestPublicService").NavbarVariantTestConfig} NavbarVariantTestConfig
 */

// Enhanced responsive CSS for blog content
const blogContentStyles = `
  /* Critical fixes for lists with paragraphs */
  .blog-content ul li p,
  .blog-content ol li p {
    display: inline !important;
    margin: 0 !important;
  }
  
  /* Critical fixes for tables - Enhanced for mobile */
  .blog-content table {
    display: table !important;
    width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
    margin: 1.25rem 0 !important;
    border: 1px solid #e5e7eb !important;
    font-size: 0.875rem !important;
  }
  
  @media (max-width: 640px) {
    .blog-content table {
      font-size: 0.75rem !important;
      display: block !important;
      overflow-x: auto !important;
      white-space: nowrap !important;
    }
  }
  
  .blog-content table td,
  .blog-content table th {
    padding: 0.5rem !important;
    border: 1px solid #e5e7eb !important;
    vertical-align: top !important;
    word-break: break-word !important;
  }
  
  @media (max-width: 640px) {
    .blog-content table td,
    .blog-content table th {
      padding: 0.25rem !important;
      min-width: 80px !important;
    }
  }
  
  /* Critical fixes for lists */
  .blog-content ul,
  .blog-content ol {
    list-style-position: outside !important;
    margin: 1rem 0 !important;
    padding-left: 1.5rem !important;
  }
  
  @media (max-width: 640px) {
    .blog-content ul,
    .blog-content ol {
      padding-left: 1rem !important;
    }
  }
  
  .blog-content ul {
    list-style-type: disc !important;
  }
  
  .blog-content ol {
    list-style-type: decimal !important;
  }
  
  .blog-content li {
    display: list-item !important;
    margin: 0.375rem 0 !important;
  }
  
  /* Nested lists */
  .blog-content ul ul,
  .blog-content ol ol,
  .blog-content ul ol,
  .blog-content ol ul {
    margin: 0.25rem 0 !important;
  }
  
  /* Fix headings inside list items - align with bullet/number marker */
  .blog-content li > h1,
  .blog-content li > h2,
  .blog-content li > h3,
  .blog-content li > h4,
  .blog-content li > h5,
  .blog-content li > h6,
  .blog-content li h1,
  .blog-content li h2,
  .blog-content li h3,
  .blog-content li h4,
  .blog-content li h5,
  .blog-content li h6,
  .blog-content ul li h1, .blog-content ul li h2, .blog-content ul li h3, .blog-content ul li h4, .blog-content ul li h5, .blog-content ul li h6,
  .blog-content ol li h1, .blog-content ol li h2, .blog-content ol li h3, .blog-content ol li h4, .blog-content ol li h5, .blog-content ol li h6 {
    display: inline !important;
    margin: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
    font-size: inherit !important;
    line-height: inherit !important;
  }
  
  /* Responsive images in content */
  .blog-content img {
    max-width: 100% !important;
    height: auto !important;
  }
  
  /* Responsive text */
  @media (max-width: 640px) {
    .blog-content {
      font-size: 0.875rem !important;
      line-height: 1.5 !important;
    }
    
    .blog-content h1,
    .blog-content h2,
    .blog-content h3,
    .blog-content h4,
    .blog-content h5,
    .blog-content h6 {
      font-size: 1.125rem !important;
      line-height: 1.4 !important;
      margin: 1rem 0 0.5rem 0 !important;
    }
  }

  /* Block rows: stack on small screens; apply editor column % only from lg (avoids window.innerWidth + SSR mismatch) */
  .blog-layout-col {
    width: 100%;
    min-width: 0;
  }
  @media (min-width: 1024px) {
    .blog-layout-col--sized {
      flex: 0 0 var(--blog-col-pct, 50%);
      max-width: var(--blog-col-pct, 50%);
    }
    .blog-layout-col--fluid {
      flex: 1 1 0%;
      min-width: 0;
    }
  }
`;

// Format date
const formatDate = (dateString) => {
  if (!dateString) return "Not published";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getPersonData = (person) => {
  if (!person) return null;
  if (typeof person === "string") {
    return { name: person };
  }
  if (typeof person === "object") {
    return {
      name: person.name || person.fullName || "",
      designation: person.designation || "",
      image: person.image || person.profileImage || "",
      bio: person.bio || person.description || "",
    };
  }
  return null;
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const getPersonDetailsHref = (person, roleLabel) => {
  const roleSegment = roleLabel === "reviewer" ? "reviewer" : "author";
  const personSlug = slugify(person?.name || "");
  if (!personSlug) return "#";
  return `/${roleSegment}/${personSlug}/`;
};

// Status badge
const StatusBadge = ({ status }) => {
  const statusStyles = {
    published: "bg-green-100 text-green-800",
    draft: "bg-yellow-100 text-yellow-800",
    archived: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || ""}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft"}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
};

// Blog Content Component
const BlogContent = ({ content }) => {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: blogContentStyles }} />
      <div
        className="prose prose-sm sm:prose-base lg:prose-lg max-w-none blog-content"
        style={{
          width: "100%",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          overflowX: "auto",
          margin: 0,
          padding: "0 0 0 0",
        }}
        dangerouslySetInnerHTML={{ __html: content || "" }}
      />
    </>
  );
};

BlogContent.propTypes = {
  content: PropTypes.string,
};

// Main Client Component
/**
 * @param {{ blog: Record<string, unknown>, navbarVariantTestConfig?: NavbarVariantTestConfig | null }} props
 */
export default function ClientBlogPage({ blog, navbarVariantTestConfig = null }) {
  const [showTOC, setShowTOC] = useState(false);
  const [isButtonFixed, setIsButtonFixed] = useState(false);
  const [widgetVisibility, setWidgetVisibility] = useState({
    sliderEnabled: true,
    newsletterEnabled: true,
    faqEnabled: true,
    videoEnabled: true,
    mapEnabled: true,
    galleryEnabled: true,
    iconBoxEnabled: true,
    testimonialsEnabled: true,
    trustpilotWidgetEnabled: true,
    siteBannersEnabled: true,
    categoryCardsEnabled: true,
    promotionalSectionsEnabled: true,
    latestBlogsEnabled: true,
    htmlCssEnabled: true,
    contactUsEnabled: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getSiteWidgetSettingsPublic();
      if (!cancelled) setWidgetVisibility(v);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll event listener for button positioning
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const triggerPoint = 300; // Adjust this value as needed
      setIsButtonFixed(scrollPosition > triggerPoint);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const contentBlockStyles = {
    width: "100%",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  };

  const toggleTOC = () => {
    setShowTOC(!showTOC);
  };

  const author = getPersonData(blog?.author);
  const reviewer = getPersonData(blog?.reviewer);
  const htmlCssPrimary = blogHasHtmlCssPrimaryContent(blog);
  const showPeopleSection =
    !htmlCssPrimary &&
    ((author && author.name) || (reviewer && reviewer.name));
  const endCards = [author, reviewer].filter((person) => person && person.name);

  return (
    <>
      {/* <TopBar />
      <Nav /> */}
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      
      <div
        className={`min-h-screen relative overflow-x-hidden blogs-themed${
          navbarVariantTestConfig?.variant === "podcast" ? " blogs-podcast" : ""
        }`}
      >
        {/* TOC Toggle Button - Better positioned with scroll behavior */}
        <button
          onClick={toggleTOC}
          className={`xl:hidden bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 z-50 ${
            isButtonFixed 
              ? 'fixed bottom-6 right-6 animate-pulse' 
              : 'absolute top-4 right-4'
          }`}
          style={{
            transform: isButtonFixed ? 'none' : 'none'
          }}
          aria-label="Toggle Table of Contents"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {showTOC ? (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            )}
          </svg>
        </button>

        <main className="py-2 sm:py-5">
          <div className="container mx-auto py-4 sm:py-8 max-w-[1600px] px-3 sm:px-4 min-w-0">
            <div className="max-w-[1500px] mx-auto min-w-0">
              {blog ? (
                <>
                  {/* Featured Image Banner - skip when HTML/CSS widget owns the layout */}
                  {!htmlCssPrimary && blog.bannerImage && (
                    <div className="w-full h-[14rem] xs:h-[18rem] sm:h-[22rem] md:h-[28rem] lg:h-[35rem] rounded-lg overflow-hidden bg-gray-100 mb-4 sm:mb-6 mx-2 sm:mx-0 relative">
                      <Image
                        src={getFullImageUrl(blog.bannerImage) || "/placeholder.svg"}
                        alt={blog.bannerImageAlt || blog.title}
                        title={blog.bannerImageDescription || undefined}
                        className="w-full h-full object-cover"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                        priority
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-col xl:flex-row-reverse gap-4 sm:gap-6 relative min-w-0">
                    {/* Blog content first in DOM for correct heading outline (H1 before TOC chrome); xl:flex-row-reverse keeps TOC visually on the left */}
                    <div
                      id="blog-content"
                      className={`flex-1 min-w-0 relative ${htmlCssPrimary ? "" : "mx-2 sm:mx-0"}`}
                      style={contentBlockStyles}
                    >
                      {/* Initial TOC Button Placeholder - helps with positioning */}
                      <div className="xl:hidden h-12 w-full mb-4 relative">
                        <div className="text-sm text-gray-500 flex items-center justify-end pr-16">
                          <span>Scroll down for Table of Contents</span>
                        </div>
                      </div>

                      {/* Title - hidden when Custom HTML/CSS block provides the hero */}
                      {!htmlCssPrimary && (
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                        {blog.title}
                      </h1>
                      )}
                      
{/* Meta Section */}
{showPeopleSection && (
  <div className="mb-6 space-y-5 border-b border-gray-100 pb-4">

    {/* Author + Reviewer Row */}
    <div className="flex flex-wrap items-center gap-6 sm:gap-10">

      {/* Author */}
      {author?.name ? (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
            {author.image ? (
              <img
                src={getFullImageUrl(author.image) || author.image}
                alt={author.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-semibold">
                {(author.name || "A").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">
              Author
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate capitalize">
              {author.name}
            </p>
          </div>
        </div>
      ) : null}

      {/* Reviewer */}
      {reviewer?.name ? (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
            {reviewer.image ? (
              <img
                src={getFullImageUrl(reviewer.image) || reviewer.image}
                alt={reviewer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-semibold">
                {(reviewer.name || "R").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">
              Reviewer
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate capitalize">
              {reviewer.name}
            </p>
          </div>
        </div>
      ) : null}

    </div>

    {/* Blog Meta Info Row */}
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">

      {blog.updatedAt && (
        <div>
          <span className="text-gray-700 font-medium">Updated:</span>{" "}
          {formatDate(blog.updatedAt)}
        </div>
      )}

      {blog.publishDate && (
        <div>
          <span className="text-gray-700 font-medium">Published:</span>{" "}
          {formatDate(blog.publishDate)}
        </div>
      )}

      {blog.tags?.length > 0 && (
        <div className="max-w-full">
          <span className="text-gray-700 font-medium">Tags:</span>{" "}
          <span className="break-words">
            {blog.tags.join(", ")}
          </span>
        </div>
      )}

      {blog.categories?.length > 0 && (
        <div className="max-w-full">
          <span className="text-gray-700 font-medium">Categories:</span>{" "}
          <span className="break-words">
            {blog.categories.map((cat) =>
              typeof cat === "object" ? cat.name : cat
            ).join(", ")}
          </span>
        </div>
      )}

    </div>

  </div>
)}
                      
                      {/* Excerpt - skip when HTML/CSS widget owns intro copy */}
                      {!htmlCssPrimary && blog.excerpt && (
                        <div className="bg-gray-50 border-l-4 border-gray-200 p-3 sm:p-4 italic text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">
                          {blog.excerpt}
                        </div>
                      )}
                      
                      {/* Content Blocks - Enhanced responsive layout */}
                      {blog.blocks && blog.blocks.length > 0 && (
                        <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6 min-w-0" style={contentBlockStyles}>
                          {blog.blocks.map((row, rowIndex) => (
                            <div key={`row-${rowIndex}`} className="flex flex-col lg:flex-row gap-3 sm:gap-4 min-w-0">
                              {normalizeBlogBlockColumns(row).map((column, colIndex, columns) => {
                                const rawW = column.width;
                                const n = Number(rawW);
                                const hasSized =
                                  rawW != null &&
                                  rawW !== "" &&
                                  !Number.isNaN(n) &&
                                  n > 0;
                                const pct = hasSized ? Math.min(100, Math.max(1, n)) : null;
                                return (
                                <div
                                  key={`col-${rowIndex}-${colIndex}`}
                                  className={`blog-layout-col relative space-y-3 sm:space-y-4 ${
                                    hasSized ? "blog-layout-col--sized" : "blog-layout-col--fluid"
                                  }`}
                                  style={
                                    hasSized
                                      ? {
                                          "--blog-col-pct": `${pct}%`,
                                          zIndex: columns.length - colIndex,
                                        }
                                      : { zIndex: columns.length - colIndex }
                                  }
                                >
                                  {column.blocks.map((block, blockIndex) => {
                                    switch (block.type) {
                                      case "heading":
                                        return (
                                          <h2
                                            key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                            className="text-lg sm:text-xl md:text-2xl font-bold leading-tight"
                                            style={contentBlockStyles}
                                          >
                                            {block.content?.text}
                                          </h2>
                                        );
                                      case "paragraph":
                                        return (
                                          <p
                                            key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                            className="text-gray-700 text-sm sm:text-base leading-relaxed"
                                            style={contentBlockStyles}
                                          >
                                            {block.content?.text}
                                          </p>
                                        );
                                      case "image":
                                        return (
                                          <div
                                            key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                            className="rounded-lg overflow-hidden"
                                            style={contentBlockStyles}
                                          >
                                            {block.content?.url && (
                                              <div className="w-full flex justify-center items-center">
                                                <Image
                                                  src={getFullImageUrl(block.content.url) || "/placeholder.svg"}
                                                  alt={block.content?.alt || ""}
                                                  height={block.content?.height || 400}
                                                  width={block.content?.width || 600}
                                                  className="max-w-full h-auto object-contain"
                                                  style={{
                                                    maxWidth: "100%",
                                                    height: "auto",
                                                    display: "block",
                                                    margin: "0 auto"
                                                  }}
                                                />
                                              </div>
                                            )}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-2">
                                              {block.content?.heading && (
                                                <h3 className="text-base sm:text-lg font-semibold">
                                                  {block.content.heading}
                                                </h3>
                                              )}
                                              {block.content?.externalLink && (
                                                <a
                                                  href={block.content.externalLink}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-block bg-[rgb(22,163,74)] hover:bg-[rgb(22,163,74,0.8)] text-white font-medium py-2 px-3 sm:px-4 rounded-md transition-colors text-xs sm:text-sm whitespace-nowrap self-start sm:self-auto"
                                                >
                                                  Buy Now
                                                </a>
                                              )}
                                            </div>
                                            {block.content?.caption && (
                                              <p className="text-xs sm:text-sm text-gray-500 mt-1 text-center">
                                                {block.content.caption}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      case "text":
                                        return (
                                          <BlogContent
                                            key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                            content={block.content || ""}
                                          />
                                        );
                                      case "products":
                                        return (
                                          <ContentProductSlider
                                            key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                            content={block.content || {}}
                                          />
                                        );
                                      case "widget":
                                        if (block.content?.widgetType === "slider") {
                                          if (!widgetVisibility.sliderEnabled) return null;
                                          return (
                                            <BlogSliderWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              slides={block.content.slides || []}
                                              sectionHeading={block.content.sectionHeading}
                                              sectionDescription={block.content.sectionDescription}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "newsletter") {
                                          if (!widgetVisibility.newsletterEnabled) return null;
                                          return (
                                            <NewsletterSignupWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              heading={block.content.heading}
                                              description={block.content.description}
                                              placeholder={block.content.placeholder}
                                              buttonLabel={block.content.buttonLabel}
                                              imageUrl={block.content.imageUrl}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "faq") {
                                          if (!widgetVisibility.faqEnabled) return null;
                                          return (
                                            <FaqWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              sectionHeading={block.content.sectionHeading}
                                              items={block.content.items}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "video") {
                                          if (!widgetVisibility.videoEnabled) return null;
                                          return (
                                            <BlogVideoWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              videoUrl={block.content.videoUrl}
                                              items={block.content.items}
                                              aspectRatio={block.content.aspectRatio}
                                              playerWidthPx={block.content.playerWidthPx}
                                              playerHeightPx={block.content.playerHeightPx}
                                              playbackMuted={block.content.playbackMuted}
                                              heading={block.content.heading}
                                              caption={block.content.caption}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "map") {
                                          if (!widgetVisibility.mapEnabled) return null;
                                          return (
                                            <BlogMapWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              embedUrl={block.content.embedUrl}
                                              heading={block.content.heading}
                                              heightPx={block.content.heightPx}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "gallery") {
                                          if (!widgetVisibility.galleryEnabled) return null;
                                          return (
                                            <BlogGalleryWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              items={block.content.items || []}
                                              heading={block.content.heading}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "iconBox") {
                                          if (!widgetVisibility.iconBoxEnabled) return null;
                                          return (
                                            <BlogIconBoxWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              items={block.content.items || []}
                                              heading={block.content.heading}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "testimonials") {
                                          if (!widgetVisibility.testimonialsEnabled) return null;
                                          return (
                                            <BlogTestimonialsWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              items={block.content.items || []}
                                              heading={block.content.heading}
                                              description={block.content.description}
                                              resolveImageUrl={(path) => getFullImageUrl(path) || ""}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "trustpilot") {
                                          if (!widgetVisibility.trustpilotWidgetEnabled) return null;
                                          return (
                                            <BlogTrustpilotEmbedWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              embedScript={block.content.embedScript}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "siteBanners") {
                                          if (!widgetVisibility.siteBannersEnabled) return null;
                                          return (
                                            <BlogSiteBannersWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              items={block.content.items || []}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "categoryCards") {
                                          if (!widgetVisibility.categoryCardsEnabled) return null;
                                          return (
                                            <BlogCategoryCardsWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              headingText={block.content.headingText}
                                              headingColor={block.content.headingColor}
                                              dividerColor={block.content.dividerColor}
                                              sectionBackgroundColor={block.content.sectionBackgroundColor}
                                              items={block.content.items || []}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "promotionalSections") {
                                          if (!widgetVisibility.promotionalSectionsEnabled) return null;
                                          return (
                                            <BlogPromotionalSectionsWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              buyNowPayLater={block.content.buyNowPayLater}
                                              sellBuyCards={block.content.sellBuyCards}
                                              tinyPhoneBanner={block.content.tinyPhoneBanner}
                                              resolveImageUrl={(path) => getFullImageUrl(path) || ""}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "latestBlogs") {
                                          if (!widgetVisibility.latestBlogsEnabled) return null;
                                          return (
                                            <BlogLatestBlogsWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              sectionHeading={block.content.sectionHeading}
                                              maxPosts={block.content.maxPosts}
                                              viewAllLabel={block.content.viewAllLabel}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "dealsDiscountCards") {
                                          return (
                                            <DealsDiscountCardsWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              sectionHeading={block.content.sectionHeading}
                                              items={block.content.items || []}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "contactUs") {
                                          if (!widgetVisibility.contactUsEnabled) return null;
                                          return (
                                            <BlogContactUsWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              content={block.content}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "navbar") {
                                          return (
                                            <BlogNavbarWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              content={block.content}
                                            />
                                          );
                                        }
                                        if (block.content?.widgetType === "htmlCss") {
                                          if (!widgetVisibility.htmlCssEnabled) return null;
                                          return (
                                            <BlogHtmlCssWidget
                                              key={`block-${rowIndex}-${colIndex}-${blockIndex}`}
                                              html={block.content.html}
                                              css={block.content.css}
                                            />
                                          );
                                        }
                                        return null;
                                      default:
                                        return null;
                                    }
                                  })}
                                </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}

               {/* End cards: Author / Reviewer */}
{endCards.length > 0 && (
  <div className="mt-10 pt-6 border-t border-gray-100">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

      {/* AUTHOR CARD */}
      {author?.name ? (
        <div className="group relative rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6">

          {/* Header */}
          <div className="flex items-center gap-4 mb-5">
            {author.image ? (
              <img
                src={getFullImageUrl(author.image) || author.image}
                alt={author.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-50"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-700 flex items-center capitalize justify-center font-semibold ring-2 ring-indigo-100">
                {(author.name || "A").charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Author
              </p>
              <h3 className="text-base font-semibold capitalize text-gray-900 truncate">
                {author.name}
              </h3>
              <p className="text-sm text-gray-500 capitalize truncate">
                {author.designation || "Content writer"}
              </p>
            </div>
          </div>

          {/* Bio */}
          <p className="text-sm text-gray-600 leading-6 line-clamp-6">
            {author.bio || "No bio available for this author yet."}
          </p>

          {/* Footer CTA */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              href={getPersonDetailsHref(author, "author")}
              className="text-sm font-medium text-primary hover:text-secondary transition inline-flex items-center gap-1 capitalize group-hover:gap-2"
            >
              More about {author.name}
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </div>
      ) : null}

      {/* REVIEWER CARD */}
      {reviewer?.name ? (
        <div className="group relative rounded-2xl bg-white shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6">

          {/* Header */}
          <div className="flex items-center gap-4 mb-5">
            {reviewer.image ? (
              <img
                src={getFullImageUrl(reviewer.image) || reviewer.image}
                alt={reviewer.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-50"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-semibold ring-2 ring-emerald-100">
                {(reviewer.name || "R").charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Reviewer
              </p>
              <h3 className="text-base font-semibold capitalize text-gray-900 truncate">
                {reviewer.name}
              </h3>
              <p className="text-sm text-gray-500 truncate capitalize">
                {reviewer.designation || "Content reviewer"}
              </p>
            </div>
          </div>

          {/* Bio */}
          <p className="text-sm text-gray-600 leading-6 line-clamp-6">
            {reviewer.bio || "No bio available for this reviewer yet."}
          </p>

          {/* Footer CTA */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              href={getPersonDetailsHref(reviewer, "reviewer")}
              className="text-sm font-medium text-primary hover:text-secondary transition inline-flex items-center gap-1 capitalize group-hover:gap-2"
            >
              More about {reviewer.name}
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </div>
      ) : null}

    </div>
  </div>
)}
                    </div>

                    <aside
                      className="hidden xl:block w-72 min-w-[16rem] max-w-xs shrink-0 bg-white border border-gray-200 rounded-lg shadow p-4 h-fit sticky top-8 self-start"
                      aria-label="Table of contents"
                    >
                      <TableOfContents />
                    </aside>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-12 text-sm sm:text-base">No blog post found.</div>
              )}
            </div>
          </div>
        </main>

        {/* After <main> in DOM so article headings precede TOC when overlay is open (SEO / outline order) */}
        {showTOC && (
          <div className="fixed inset-0 z-40 xl:hidden">
            <div
              className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={toggleTOC}
            ></div>

            <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <p className="m-0 text-lg font-semibold text-gray-900">Table of Contents</p>
                <button
                  onClick={toggleTOC}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close Table of Contents"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto h-full pb-20">
                <TableOfContents />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

ClientBlogPage.propTypes = {
  blog: PropTypes.object.isRequired,
  navbarVariantTestConfig: PropTypes.object,
};
