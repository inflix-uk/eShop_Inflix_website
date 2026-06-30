/** Card-only fields for /api/blogs/latest (smaller JSON, faster homepage). */
export function slimBlogForCard(b: Record<string, unknown>): Record<string, unknown> {
  const categories = b.categories;
  let slimCategories: unknown = categories;
  if (Array.isArray(categories)) {
    slimCategories = categories.map((c) => {
      if (c && typeof c === "object") {
        const o = c as Record<string, unknown>;
        return { _id: o._id, name: o.name };
      }
      return c;
    });
  }

  return {
    _id: b._id,
    title: b.title,
    name: b.name,
    slug: b.slug,
    permalink: b.permalink,
    isNewBlog: b.isNewBlog,
    featuredImage: b.featuredImage,
    thumbnailImage: b.thumbnailImage,
    featuredImageAlt: b.featuredImageAlt,
    blogthumbnailImageAlt: b.blogthumbnailImageAlt,
    featuredImageDescription: b.featuredImageDescription,
    blogCategory: b.blogCategory,
    categories: slimCategories,
    publishDate: b.publishDate,
    blogpublisheddate: b.blogpublisheddate,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    blogShortDescription: b.blogShortDescription,
    excerpt: b.excerpt,
  };
}
