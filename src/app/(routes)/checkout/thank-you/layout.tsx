import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/pageMetadata";
import Nav from "@/app/components/navbar/Nav";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import { getHomeNavbarCriticalServer } from "@/app/services/navbarCriticalServer";

export async function generateMetadata(): Promise<Metadata> {
  return buildStorePageMetadata({
    path: "/checkout/thank-you",
    fallbackTitle: "Thank you",
    fallbackDescription: "Your order has been received.",
  });
}

/**
 * Same chrome as `/checkout`: the admin-managed navbar (Product Central > Navbar),
 * falling back to the classic `Nav` when no variant config exists, and the
 * `checkout-themed` wrapper so CMS body-bg-derived surfaces apply and site-wide
 * tag colours (h1/p/span…) don't bleed into the confirmation card.
 */
export default async function ThankYouLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [navbarConfig, navServerBootstrap] = await Promise.all([
    getNavbarVariantTestPublicServer().catch(() => null),
    getHomeNavbarCriticalServer().catch(() => null),
  ]);

  return (
    <>
      <header className="relative">
        {navbarConfig ? (
          <NavbarVariantTestBar
            config={navbarConfig}
            serverBootstrapLogo={
              navServerBootstrap
                ? {
                    logoUrl: navServerBootstrap.logoUrl,
                    logoAlt: navServerBootstrap.logoAlt,
                  }
                : null
            }
          />
        ) : (
          <Nav />
        )}
      </header>
      <div
        className={`checkout-themed${
          navbarConfig?.variant === "podcast" ? " checkout-podcast" : ""
        }`}
      >
        {children}
      </div>
    </>
  );
}
