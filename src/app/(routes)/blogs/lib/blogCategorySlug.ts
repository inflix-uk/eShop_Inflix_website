export function toCategorySlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractBlogCategoryName(blog: Record<string, unknown>): string {
  if (typeof blog.blogCategory === "string" && blog.blogCategory.trim()) {
    return blog.blogCategory;
  }
  const categories = blog.categories;
  if (Array.isArray(categories) && categories.length > 0) {
    const first = categories[0];
    if (typeof first === "string" && first.trim()) return first;
    if (
      first &&
      typeof first === "object" &&
      "name" in first &&
      typeof (first as { name?: string }).name === "string"
    ) {
      const name = (first as { name: string }).name.trim();
      if (name) return name;
    }
  }
  return "";
}

/** Server-side fetch of merged legacy + new blogs (cached). */
export async function fetchAllStorefrontBlogs(): Promise<Record<string, unknown>[]> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) return [];
  try {
    const res = await fetch(`${base}/get/blog`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

export function blogListHasCategorySlug(
  blogs: Record<string, unknown>[],
  categorySlug: string
): boolean {
  const normalized = categorySlug.toLowerCase();
  return blogs.some((blog) => {
    const name = extractBlogCategoryName(blog);
    return name && toCategorySlug(name) === normalized;
  });
}

export async function slugMatchesBlogCategory(categorySlug: string): Promise<boolean> {
  if (!categorySlug) return false;
  const blogs = await fetchAllStorefrontBlogs();
  return blogListHasCategorySlug(blogs, categorySlug);
}
