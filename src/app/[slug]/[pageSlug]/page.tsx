import { notFound } from "next/navigation";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import FooterPageContent from "@/app/components/footer-pages/FooterPageContent";
import { isDisabledRootSlug } from "@/app/lib/disabledRootSlugs";
import {
  fetchNestedFooterPage,
  FooterPageShell,
  isPublishedFooterPage,
  normalizeFooterSlug,
} from "@/app/lib/footerPagePublic";
import { fetchFooterPageBySlugFresh } from "@/app/services/footerPageService";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";

export const dynamic = "force-dynamic";

/**
 * Two-segment CMS footer URLs: /{parentSlug}/{pageSlug}
 * First param must be named `slug` (same as parent `app/[slug]`) for Next.js 15;
 * second is `pageSlug` to avoid duplicate param names.
 */
export default async function CategoryFooterDynamicPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const decodedParentSlug = normalizeFooterSlug(slug);
  const decodedPageSlug = normalizeFooterSlug(pageSlug);

  if (!decodedParentSlug || isDisabledRootSlug(decodedPageSlug)) {
    notFound();
  }

  const [page, navbarVariantTestConfig] = await Promise.all([
    fetchNestedFooterPage(decodedParentSlug, decodedPageSlug).then(
      (resolved) =>
        resolved ??
        fetchFooterPageBySlugFresh(decodedPageSlug, decodedParentSlug)
    ),
    getNavbarVariantTestPublicServer(),
  ]);

  if (!isPublishedFooterPage(page)) {
    notFound();
  }

  return <FooterPageShell page={page} navbarVariantTestConfig={navbarVariantTestConfig} />;
}
