import FooterPageContent from "@/app/components/footer-pages/FooterPageContent";
import PolicyCmsPageClient from "@/app/components/footer-pages/PolicyCmsPageClient";
import {
  fetchFooterPageBySlugFresh,
  type FooterPage,
} from "@/app/services/footerPageService";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import { getSiteWidgetSettingsPublic } from "@/app/services/siteWidgetSettingsService";
import { notFound } from "next/navigation";

const SHIPPING_SLUG = "shipping-policy";

export const dynamic = "force-dynamic";

export default async function ShippingPolicyPage() {
  let page: FooterPage | null = null;
  let navbarVariantTestConfig = null;
  let widgetVisibility;
  try {
    [page, navbarVariantTestConfig, widgetVisibility] = await Promise.all([
      fetchFooterPageBySlugFresh(SHIPPING_SLUG),
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
    <PolicyCmsPageClient navbarVariantTestConfig={navbarVariantTestConfig}>
      <FooterPageContent
        page={page}
        initialWidgetVisibility={widgetVisibility}
      />
    </PolicyCmsPageClient>
  );
}
