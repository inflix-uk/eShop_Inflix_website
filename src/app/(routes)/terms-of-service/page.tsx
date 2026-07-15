import Nav from "@/app/components/navbar/Nav";
import Link from "next/link";
import FooterPageContent from "@/app/components/footer-pages/FooterPageContent";
import {
  fetchFooterPageBySlug,
  type FooterPage,
} from "@/app/services/footerPageService";
import { getSiteWidgetSettingsPublic } from "@/app/services/siteWidgetSettingsService";
import { notFound } from "next/navigation";

const TERMS_SLUG = "terms-of-service";

export default async function TermsOfServicePage() {
  let page: FooterPage | null = null;
  let widgetVisibility;
  try {
    [page, widgetVisibility] = await Promise.all([
      fetchFooterPageBySlug(TERMS_SLUG),
      getSiteWidgetSettingsPublic(),
    ]);
  } catch {
    notFound();
  }

  if (!page) {
    notFound();
  }

  return (
    <>
      <header className="relative">
        <Nav />
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </nav>

        <FooterPageContent page={page} initialWidgetVisibility={widgetVisibility} />
      </div>
    </>
  );
}
