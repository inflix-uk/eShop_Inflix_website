import Link from "next/link";
import SlugRouteHeader from "@/app/components/slug-route/SlugRouteHeader";
import FooterPageContent from "@/app/components/footer-pages/FooterPageContent";
import { fetchFooterPageBySlug } from "@/app/services/footerPageService";
import DealsAndDiscountsFallback from "./DealsAndDiscountsFallback";

const SLUG = "deals-and-discounts";

export default async function DealsAndDiscountsPage() {
  const page = await fetchFooterPageBySlug(SLUG);
  const useCms = page && page.publishStatus === "published";

  if (useCms && page) {
    return (
      <>
        <SlugRouteHeader />
        <div className="max-w-7xl mx-auto p-6">
          <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">»</span>
            <span className="text-gray-900">{page.title}</span>
          </nav>
          <FooterPageContent page={page} />
        </div>
      </>
    );
  }

  return <DealsAndDiscountsFallback />;
}
