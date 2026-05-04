import DynamicPageClient from "@/app/[slug]/DynamicPageClient";
import { notFound } from "next/navigation";
import { isDisabledRootSlug } from "@/app/lib/disabledRootSlugs";
import { fetchFooterPageBySlugFresh } from "@/app/services/footerPageService";

export const dynamic = "force-dynamic";

function isPublishedWithBlocks(page: {
  publishStatus?: string;
  blocks?: unknown[];
}): boolean {
  const pub = String(page.publishStatus ?? "").toLowerCase().trim();
  if (pub !== "published") return false;
  return Array.isArray(page.blocks) && page.blocks.length > 0;
}

/**
 * Two-segment CMS footer URLs: /{categorySlug}/{pageSlug}
 * First param must be named `slug` (same as parent `app/[slug]`) for Next.js 15;
 * second is `pageSlug` to avoid duplicate param names.
 */
export default async function CategoryFooterDynamicPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const decodedCategory = decodeURIComponent(slug).toLowerCase().trim();
  const decodedPageSlug = decodeURIComponent(pageSlug).toLowerCase().trim();

  if (!decodedCategory || isDisabledRootSlug(decodedPageSlug)) {
    notFound();
  }

  const page = await fetchFooterPageBySlugFresh(decodedPageSlug, decodedCategory);
  if (!page || !isPublishedWithBlocks(page)) {
    notFound();
  }

  return (
    <DynamicPageClient slug={decodedPageSlug} categorySlug={decodedCategory} />
  );
}
