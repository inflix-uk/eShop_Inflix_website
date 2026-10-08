import { notFound } from "next/navigation";
import { isDisabledRootSlug } from "@/app/lib/disabledRootSlugs";
import { FooterPageShell, isPublishedFooterPage } from "@/app/lib/footerPagePublic";
import { fetchFooterPageBySlugFresh } from "@/app/services/footerPageService";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import { CART_PAGE_SLUG, resolveCartPage } from "@/app/lib/cartPage";

export const dynamic = "force-dynamic";

function isPublishedWithBlocks(page: {
  publishStatus?: string;
  blocks?: unknown[];
}): boolean {
  return isPublishedFooterPage(page as never);
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
  const [page, navbarVariantTestConfig] = await Promise.all([
    fetchFooterPageBySlugFresh(slugNorm, null),
    getNavbarVariantTestPublicServer(),
  ]);
  if (slugNorm === CART_PAGE_SLUG) {
    return (
      <FooterPageShell
        page={resolveCartPage(page && isPublishedWithBlocks(page) ? page : null)}
        navbarVariantTestConfig={navbarVariantTestConfig}
      />
    );
  }
  if (!page || !isPublishedWithBlocks(page)) {
    notFound();
  }
  return (
    <FooterPageShell
      page={page}
      navbarVariantTestConfig={navbarVariantTestConfig}
    />
  );
}
