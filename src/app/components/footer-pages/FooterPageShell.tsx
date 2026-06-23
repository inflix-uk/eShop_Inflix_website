import FooterPageContent from "@/app/components/footer-pages/FooterPageContent";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import type { FooterPage } from "@/app/services/footerPageService";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";

export function FooterPageShell({
  page,
  navbarVariantTestConfig = null,
}: {
  page: FooterPage;
  navbarVariantTestConfig?: NavbarVariantTestConfig | null;
}) {
  return (
    <>
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      <div className="max-w-7xl mx-auto p-6">
        <FooterPageContent page={page} />
      </div>
    </>
  );
}
