import type { Metadata } from "next";
import {
  buildStorePageMetadata,
  fetchStaticMetaByPath,
} from "@/lib/pageMetadata";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await fetchStaticMetaByPath("/search");
  return buildStorePageMetadata({
    path: "/searchproduct",
    fallbackTitle: "Search",
    fallbackDescription: "Search for products in our store.",
    cmsMeta: metaData,
  });
}

// Same navbar as every other page (managed in admin: Product Central > Navbar).
// The search page used to render the old TopBar + Nav, which showed the red category bar
// and its own hard-coded links instead of the site's header.
export default async function SearchProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const navbarVariantTestConfig = await getNavbarVariantTestPublicServer().catch(() => null);
  return (
    <>
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      {children}
    </>
  );
}
