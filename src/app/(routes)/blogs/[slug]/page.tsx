import { cache } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import TableOfContentsWrapper from "./TableOfContentsWrapper";
import DateDisplay from "./DateDisplay";
import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import ClientBlogPage from "../new/[slug]/ClientBlogPage";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import { getFullImageUrl } from "../new/[slug]/blogUtils";
import { metaSchemaEntryToJsonLdString } from "@/app/lib/homepageJsonLd";
import { getCanonical } from "@/lib/getCanonical";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import CategoryBlogsClient from "../CategoryBlogsClient";
import {
  blogListHasCategorySlug,
  fetchAllStorefrontBlogs,
  slugMatchesBlogCategory,
} from "../lib/blogCategorySlug";
import { fetchNewBlogBySlug } from "../lib/fetchNewBlogBySlug";
import {
  extractBlogArticlePlainText,
  getBlogSchemaDates,
  getBlogOpenGraphTimes,
} from "../lib/blogSchemaUtils";
import {
  fetchNestedFooterPage,
  FooterPageShell,
  isPublishedFooterPage,
} from "@/app/lib/footerPagePublic";

interface BlogData {
  _id: string;
  name: string;
  slug: string;
  content: string;
  blogImage: string;
  blogImageAlt?: string;
  blogShortDescription: string;
  blogCategory: string;
  createdAt: string;
  updatedAt: string;
  blogpublisheddate: string;
  metaschemas?: string[];
  // SEO overrides from backend
  metaTitle?: string;
  metaDescription?: string;
  metakeywords?: string;
  metaImage?: string;
  metaImageAlt?: string;
}

function toCategorySlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getNewBlogCategorySlugs(post: Record<string, unknown>): string[] {
  const names: string[] = [];
  if (typeof post.blogCategory === "string" && post.blogCategory.trim()) {
    names.push(post.blogCategory);
  }
  if (Array.isArray(post.categories) && post.categories.length > 0) {
    for (const entry of post.categories) {
      if (typeof entry === "string" && entry.trim()) {
        names.push(entry);
      } else if (
        entry &&
        typeof entry === "object" &&
        "name" in entry &&
        typeof entry.name === "string" &&
        entry.name.trim()
      ) {
        names.push(entry.name);
      }
    }
  }
  const slugs = Array.from(
    new Set(names.map((name) => toCategorySlug(name)).filter(Boolean))
  );
  return slugs.length > 0 ? slugs : ["general"];
}

function getLegacyBlogCategorySlugs(blog: BlogData): string[] {
  const primary = toCategorySlug(blog.blogCategory || "general");
  return primary ? [primary] : ["general"];
}

export const dynamic = "force-dynamic";

const getLegacyBlog = cache(async (slug: string): Promise<BlogData | null> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get/blog/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.status === 201 ? (data.blog as BlogData) : null;
  } catch {
    return null;
  }
});

function getStaticContent(html: string): string {
  if (!html) return "<p>No content available</p>";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

function formatDateGB(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`; // deterministic SSR/CSR
}

// Return YYYY-MM-DD in UTC, suitable for schema.org date fields (date-only)
function formatDateISO(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // fallback: best-effort slice if already a string
    return (dateStr || "").slice(0, 10);
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildNewBlogBlogPostingJsonLd(
  post: Record<string, unknown>,
  canonicalPostUrl: string
): Record<string, unknown> {
  const title = typeof post.title === "string" ? post.title : "";
  const metaTitle =
    typeof post.metaTitle === "string" ? post.metaTitle.trim() : "";
  const headline = metaTitle || title;
  const excerpt = typeof post.excerpt === "string" ? post.excerpt : "";
  const metaDesc =
    typeof post.metaDescription === "string" ? post.metaDescription.trim() : "";
  const description = metaDesc || excerpt;
  const articleBody = extractBlogArticlePlainText(post);
  const { datePublished, dateModified } = getBlogSchemaDates(post);
  const banner =
    typeof post.bannerImage === "string" ? post.bannerImage : "";
  const featured =
    typeof post.featuredImage === "string" ? post.featuredImage : "";
  const imagePath = banner || featured;
  const imageUrl = imagePath ? getFullImageUrl(imagePath) : undefined;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    ...(imageUrl ? { image: imageUrl } : {}),
    datePublished,
    dateModified,
    ...(articleBody
      ? {
          articleBody,
          wordCount: articleBody.split(/\s+/).filter(Boolean).length,
        }
      : {}),
    url: canonicalPostUrl,
  };

  return jsonLd;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; category?: string }>;
}): Promise<Metadata> {
  const { slug, category } = await params;
  if (!category && slug !== "new") {
    const newBlogProbe = await fetchNewBlogBySlug(slug);
    const legacyProbe = newBlogProbe ? null : await getLegacyBlog(slug);
    if (!newBlogProbe && !legacyProbe) {
      const isCategory = await slugMatchesBlogCategory(slug);
      if (isCategory) {
        const canonicalUrl = await getCanonical(`/blogs/${slug}`);
        return {
          title: `Blog category: ${slug}`,
          description: `Browse blog posts in the ${slug} category.`,
          robots: "index, follow",
          openGraph: {
            title: `Blog category: ${slug}`,
            url: canonicalUrl,
            type: "website",
          },
          alternates: { canonical: canonicalUrl },
        };
      }
    }
  }
  const routePath = category ? `/blogs/${category}/${slug}` : `/blogs/${slug}`;
  const canonicalUrl = await getCanonical(routePath);
  const navbarVariantTestConfig = await getNavbarVariantTestPublicServer();
  const newBlog = await fetchNewBlogBySlug(slug);
  if (newBlog && typeof newBlog.title === "string") {
    if (category) {
      const allowedCategorySlugs = getNewBlogCategorySlugs(newBlog);
      if (!allowedCategorySlugs.includes(category)) {
        return {
          title: "",
          description: "",
          robots: "noindex, nofollow",
        };
      }
    }
    const metaTitle =
      typeof newBlog.metaTitle === "string" ? newBlog.metaTitle.trim() : "";
    const displayTitle = metaTitle || "";
    const metaDesc =
      typeof newBlog.metaDescription === "string"
        ? newBlog.metaDescription.trim()
        : "";
    const description = metaDesc || "";
    const banner =
      typeof newBlog.bannerImage === "string" ? newBlog.bannerImage : "";
    const featured =
      typeof newBlog.featuredImage === "string" ? newBlog.featuredImage : "";
    const rawImg = banner || featured;
    const ogImage = rawImg ? getFullImageUrl(rawImg) : undefined;
    const keywords =
      Array.isArray(newBlog.metaTags) && newBlog.metaTags.length
        ? newBlog.metaTags
            .filter((t): t is string => typeof t === "string")
            .join(", ")
        : undefined;

    const ogTimes = getBlogOpenGraphTimes(newBlog);

    return {
      title: displayTitle,
      description,
      ...(keywords ? { keywords } : {}),
      robots: "index, follow, max-image-preview:large, max-snippet:-1",
      openGraph: {
        title: displayTitle,
        description,
        type: "article",
        publishedTime: ogTimes.publishedTime,
        modifiedTime: ogTimes.modifiedTime,
        url: canonicalUrl,
        images: ogImage ? [ogImage] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: displayTitle,
        description,
        images: ogImage ? [ogImage] : [],
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  const blog = await getLegacyBlog(slug);

  if (!blog) {
    return {
      title: "",
      description: "",
      robots: "noindex, nofollow",
    };
  }
  if (category) {
    const allowedCategorySlugs = getLegacyBlogCategorySlugs(blog);
    if (!allowedCategorySlugs.includes(category)) {
      return {
        title: "",
        description: "",
        robots: "noindex, nofollow",
      };
    }
  }

  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;
  const rawOgImage = (blog.metaImage && blog.metaImage) || blog.blogImage;
  const ogImage = rawOgImage?.startsWith("http")
    ? rawOgImage
    : `${baseUrl}/${rawOgImage}`;
  const ogImageAlt = blog.metaImageAlt || blog.blogImageAlt || blog.name;

  // SEO field fallbacks
  const seoTitle = blog.metaTitle || "";
  const seoDesc = blog.metaDescription || "";
  const seoKeywords = blog.metakeywords || blog.blogCategory;
  const publishedISO = (blog.blogpublisheddate || blog.createdAt);

  return {
    title: seoTitle,
    description: seoDesc,
    ...(seoKeywords ? { keywords: seoKeywords } : {}),
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      type: "article",
      publishedTime: publishedISO,
      modifiedTime: blog.updatedAt,
      locale: "en_GB",
      url: canonicalUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDesc,
      images: [ogImage],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ slug: string; category?: string }>;
}) {
  const { slug, category } = await params;

  if (!category && slug !== "new") {
    const decodedSlug = decodeURIComponent(slug).toLowerCase().trim();
    const [footerPage, navbarVariantTestConfig] = await Promise.all([
      fetchNestedFooterPage("blogs", decodedSlug),
      getNavbarVariantTestPublicServer(),
    ]);
    if (isPublishedFooterPage(footerPage)) {
      return (
        <FooterPageShell
          page={footerPage}
          navbarVariantTestConfig={navbarVariantTestConfig}
        />
      );
    }
  }

  if (!category && slug !== "new") {
    const newBlogProbe = await fetchNewBlogBySlug(slug);
    const legacyProbe = newBlogProbe ? null : await getLegacyBlog(slug);
    if (!newBlogProbe && !legacyProbe) {
      const allBlogs = await fetchAllStorefrontBlogs();
      if (blogListHasCategorySlug(allBlogs, slug)) {
        return (
          <CategoryBlogsClient
            categorySlug={slug.toLowerCase()}
            initialBlogs={allBlogs as never}
          />
        );
      }
    }
  }

  const routePath = category ? `/blogs/${category}/${slug}` : `/blogs/${slug}`;
  const canonicalUrl = await getCanonical(routePath);
  const navbarVariantTestConfig = await getNavbarVariantTestPublicServer();

  const newBlog = await fetchNewBlogBySlug(slug);
  if (newBlog) {
    const allowedCategorySlugs = getNewBlogCategorySlugs(newBlog);
    const canonicalCategorySlug = allowedCategorySlugs[0];
    if (!category) {
      redirect(`/blogs/${canonicalCategorySlug}/${slug}`);
    }
    if (category) {
      if (!allowedCategorySlugs.includes(category)) {
        notFound();
      }
    }
    const blogPostingLd = buildNewBlogBlogPostingJsonLd(newBlog, canonicalUrl);
    const metaSchemaRaw = newBlog.metaSchema;
    const metaSchemaList = Array.isArray(metaSchemaRaw)
      ? metaSchemaRaw.filter((x): x is string => typeof x === "string")
      : [];
    const extraJsonLdStrings = metaSchemaList
      .map((entry) => metaSchemaEntryToJsonLdString(entry))
      .filter((s): s is string => s != null && s.length > 0);

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(blogPostingLd),
          }}
        />
        {extraJsonLdStrings.map((json, i) => (
          <script
            key={`blog-meta-schema-${i}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
          />
        ))}
        <ClientBlogPage
          blog={newBlog as never}
          navbarVariantTestConfig={navbarVariantTestConfig}
        />
      </>
    );
  }

  const blog = await getLegacyBlog(slug);
  if (!blog) notFound();
  const legacyCategorySlug = getLegacyBlogCategorySlugs(blog)[0];
  if (!category) {
    redirect(`/blogs/${legacyCategorySlug}/${slug}`);
  }
  if (category) {
    const allowedCategorySlugs = getLegacyBlogCategorySlugs(blog);
    if (!allowedCategorySlugs.includes(category)) {
      notFound();
    }
  }

  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;
  const heroImage = blog.blogImage.startsWith("http")
    ? blog.blogImage
    : `${baseUrl}/${blog.blogImage}`;

  const staticContent = getStaticContent(blog.content);
  const publishedRaw = blog.blogpublisheddate || blog.createdAt;
  const dateDisplay = formatDateGB(publishedRaw);
  const { datePublished, dateModified } = getBlogSchemaDates({
    publishDate: publishedRaw,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  });

  const plainBody = staticContent.replace(/<[^>]*>/g, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.metaTitle || blog.name,
    description: blog.metaDescription || blog.blogShortDescription,
    image: heroImage,
    datePublished,
    dateModified,
    articleBody: plainBody,
    wordCount: plainBody.split(/\s+/).filter(Boolean).length,
    url: canonicalUrl,
  };

  // Parse any backend-provided metaschemas (array of JSON strings)
  const extraSchemas = Array.isArray(blog.metaschemas)
    ? blog.metaschemas
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch {
            return null; // skip invalid JSON to avoid injecting malformed data
          }
        })
        .filter(Boolean)
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {extraSchemas.map((schema: unknown, idx: number) => (
        <script
          key={`ldjson-extra-${idx}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {/* <TopBar />
      <Nav /> */}
      <NavbarVariantTestBar config={navbarVariantTestConfig} />

      <article
        className={`blogs-themed px-3 sm:px-4 py-6 sm:py-10 min-w-0${
          navbarVariantTestConfig?.variant === "podcast" ? " blogs-podcast" : ""
        }`}
      >
        {/* HERO (server-rendered) */}
        <header className="max-w-7xl mx-auto bg-white rounded-lg overflow-hidden shadow-lg">
          <div className="relative">
            <Image
              src={heroImage}
              alt={blog.blogImageAlt || blog.name}
              className="w-full h-[14rem] xs:h-[18rem] sm:h-[22rem] md:h-[28rem] lg:h-[35rem] object-cover"
              width={1200}
              height={700}
              fetchPriority="high"
              priority
              quality={90}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
            {blog.blogCategory && (
              <div className="absolute top-3 right-3 sm:top-5 sm:right-6 md:right-10 max-w-[calc(100%-1.5rem)]">
                <span className="relative z-10 inline-block max-w-full truncate rounded-full bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
                  {blog.blogCategory}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-4 sm:p-6">
              <div className="text-white max-w-screen-md min-w-0">
                <DateDisplay 
                  dateString={publishedRaw}
                  dateTime={publishedRaw}
                  className="text-white"
                  fallbackText={dateDisplay}
                />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mt-3">
                  {blog.name}
                </h1>
                <p className="mt-3 text-md sm:text-lg text-gray-200">
                  {blog.metaDescription || blog.blogShortDescription}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* LAYOUT: ToC (client) + Content (server) */}
        <div className="w-full max-w-screen-xl mx-auto my-5 md:flex md:flex-row gap-4 md:gap-6 min-w-0">
          {/* Table of Contents - Client Component */}
          <TableOfContentsWrapper content={staticContent} />

          {/* Main Content - Server Rendered */}
          <main
            id="blog-content"
            className="flex-1 min-w-0 p-4 sm:p-6 space-y-6 shadow-lg border rounded-lg bg-white"
          >
            <div
              className="prose prose-lg max-w-none blog-content
                prose-headings:scroll-mt-20
                prose-h1:text-3xl prose-h1:font-bold
                prose-h2:text-2xl prose-h2:font-semibold
                prose-h3:text-xl prose-h3:font-medium
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800
                prose-img:rounded-lg prose-img:shadow-md
                prose-ul:list-disc prose-ul:pl-6
                prose-ol:list-decimal prose-ol:pl-6
                prose-li:text-gray-700
                prose-blockquote:border-l-4 prose-blockquote:border-gray-300
                prose-blockquote:pl-4 prose-blockquote:italic
                prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
                prose-pre:bg-gray-900 prose-pre:text-gray-100"
              dangerouslySetInnerHTML={{ __html: staticContent }}
            />
          </main>
        </div>
      </article>

      </>
  );
}