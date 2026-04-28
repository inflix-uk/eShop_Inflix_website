import DynamicPageClient from "@/app/[slug]/DynamicPageClient";
import { notFound } from "next/navigation";
import { isDisabledRootSlug } from "@/app/lib/disabledRootSlugs";

export const dynamic = "force-dynamic";

async function hasPublishedPageWithSections(slug: string): Promise<boolean> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) return false;
  try {
    const res = await fetch(
      `${base}/footer-pages/pagesBySlug/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) return false;
    const json = await res.json();
    const page = json?.data;
    if (!json?.success || !page || page.publishStatus !== "published") {
      return false;
    }
    return Array.isArray(page.blocks) && page.blocks.length > 0;
  } catch {
    return false;
  }
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
  const exists = await hasPublishedPageWithSections(slug);
  if (!exists) {
    notFound();
  }
  return <DynamicPageClient slug={slug} />;
}
