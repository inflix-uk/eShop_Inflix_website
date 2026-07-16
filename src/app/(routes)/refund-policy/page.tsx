import PolicyCmsPageClient from "@/app/components/footer-pages/PolicyCmsPageClient";
import {
  fetchFooterPageBySlugFresh,
  type FooterPage,
} from "@/app/services/footerPageService";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import { getSiteWidgetSettingsPublic } from "@/app/services/siteWidgetSettingsService";
import { notFound } from "next/navigation";

const REFUND_SLUG = "refund-policy";

export const dynamic = "force-dynamic";

export default async function RefundPolicyPage() {
  let page: FooterPage | null = null;
  let navbarVariantTestConfig = null;
  let widgetVisibility;
  try {
    [page, navbarVariantTestConfig, widgetVisibility] = await Promise.all([
      fetchFooterPageBySlugFresh(REFUND_SLUG),
      getNavbarVariantTestPublicServer(),
      getSiteWidgetSettingsPublic(),
    ]);
  } catch {
    notFound();
  }

  if (!page) {
    notFound();
  }

  return (
    <PolicyCmsPageClient
      page={page}
      navbarVariantTestConfig={navbarVariantTestConfig}
      widgetVisibility={widgetVisibility}
    />
  );
}
