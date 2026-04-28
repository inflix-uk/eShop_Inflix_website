import { notFound, redirect } from "next/navigation";
import PropTypes from "prop-types";
import { getFullImageUrl } from "./blogUtils";
import { getCanonical } from "@/lib/getCanonical";

// Server-side data fetching function
async function getBlogPostBySlugWithoutCache(slug) {
  try {
    const response = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/newblog/blog/postsBySlugWithoutCache/${slug}`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error getting blog post:', error);
    return null;
  }
}

function toCategorySlug(value) {
  if (!value || typeof value !== "string") return "general";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getCategoryName(blog) {
  if (typeof blog?.blogCategory === "string" && blog.blogCategory.trim()) {
    return blog.blogCategory;
  }
  if (Array.isArray(blog?.categories) && blog.categories.length > 0) {
    const first = blog.categories[0];
    if (typeof first === "string" && first.trim()) return first;
    if (first && typeof first === "object" && typeof first.name === "string" && first.name.trim()) {
      return first.name;
    }
  }
  return "general";
}

// Generate metadata for SEO (CMS fields only; no hardcoded brand copy)
export async function generateMetadata({ params }) {
  const { slug } = await params;

  if (!slug || slug.trim() === "") {
    return {
      title: "",
      description: "",
      robots: "noindex, nofollow",
    };
  }

  const blog = await getBlogPostBySlugWithoutCache(slug);

  if (!blog) {
    return {
      title: "",
      description: "",
      robots: "noindex, nofollow",
    };
  }

  const categorySlug = toCategorySlug(getCategoryName(blog));
  const canonicalUrl = await getCanonical(`/blogs/${categorySlug}/${slug}`);
  const metaTitle =
    typeof blog.metaTitle === "string" ? blog.metaTitle.trim() : "";
  const displayTitle = metaTitle || "";
  const metaDesc =
    typeof blog.metaDescription === "string"
      ? blog.metaDescription.trim()
      : "";
  const description = metaDesc || "";
  const banner =
    typeof blog.bannerImage === "string" ? blog.bannerImage : "";
  const featured =
    typeof blog.featuredImage === "string" ? blog.featuredImage : "";
  const rawImg = banner || featured;
  const ogImage = rawImg ? getFullImageUrl(rawImg) : undefined;
  const keywords =
    Array.isArray(blog.metaTags) && blog.metaTags.length
      ? blog.metaTags
          .filter((t) => typeof t === "string")
          .join(", ")
      : undefined;

  return {
    title: displayTitle,
    description,
    ...(keywords ? { keywords } : {}),
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    openGraph: {
      title: displayTitle,
      description,
      type: "article",
      publishedTime: blog.publishDate,
      modifiedTime: blog.updatedAt,
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

// Main Component
export default async function BlogPreviewPage({ params }) {
  const { slug } = await params;

  // Validate slug exists
  if (!slug || slug.trim() === "") {
    notFound();
  }

  const blog = await getBlogPostBySlugWithoutCache(slug);

  // If blog not found, show 404
  if (!blog) {
    notFound();
  }
  
  const categorySlug = toCategorySlug(getCategoryName(blog));
  redirect(`/blogs/${categorySlug}/${slug}`);
  return null;
}

BlogPreviewPage.propTypes = {
  params: PropTypes.shape({
    slug: PropTypes.string.isRequired,
  }).isRequired,
};
