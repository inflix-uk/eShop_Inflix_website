import BlogPage, { generateMetadata as generateBlogMetadata } from "../page";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { slug, postSlug } = await params;
  return generateBlogMetadata({
    params: Promise.resolve({ category: slug, slug: postSlug }),
  });
}

export default async function CategoryBlogPage({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}) {
  const { slug, postSlug } = await params;
  return BlogPage({
    params: Promise.resolve({ category: slug, slug: postSlug }),
  });
}
