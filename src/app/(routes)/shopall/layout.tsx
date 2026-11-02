import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  buildStorePageMetadata,
  fetchStaticMetaByPath,
} from "@/lib/pageMetadata";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await fetchStaticMetaByPath("/shopall");
  return buildStorePageMetadata({
    path: "/shopall",
    fallbackTitle: "Shop All Products",
    fallbackDescription: "Browse all products in our store.",
    cmsMeta: metaData,
  });
}

// Same navbar as every other page (managed in admin: Product Central > Navbar).
export default async function ShopAllLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navbarVariantTestConfig = await getNavbarVariantTestPublicServer().catch(() => null);
  return (
    <>
      <SpeedInsights />
      <NavbarVariantTestBar config={navbarVariantTestConfig} />
      {children}
    </>
  );
}
