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

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isDisabledRootSlug(slug)) {
    notFound();
  }
  const slugNorm = decodeURIComponent(slug).toLowerCase().trim();
  const page = await fetchFooterPageBySlugFresh(slugNorm, null);
  if (!page || !isPublishedWithBlocks(page)) {
    notFound();
  }
  return <DynamicPageClient slug={slugNorm} />;
}
