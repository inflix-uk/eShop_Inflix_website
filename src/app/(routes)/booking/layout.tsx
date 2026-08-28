import type { Metadata } from "next";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import { bookingJsonLdStringsFromSeo } from "@/app/lib/bookingJsonLd";
import { mergeAdminJsonLdWithAutoBusiness } from "@/app/lib/businessJsonLd";
import { getHomeNavbarCriticalServer } from "@/app/services/navbarCriticalServer";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";
import { getBookingPublicSeo } from "@/app/services/bookingSeoService";
import { getCanonical } from "@/lib/getCanonical";
import { getStoreIdentity } from "@/lib/storeIdentity";

const DEFAULT_BOOKING_TITLE = "Book an Appointment | Online Booking";
const DEFAULT_BOOKING_DESCRIPTION =
  "Choose from our premium services and book your preferred time slot online. Quick, easy, and secure booking.";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, canonicalUrl] = await Promise.all([
    getBookingPublicSeo(),
    getCanonical("/booking"),
  ]);

  const title = seo?.metaTitle?.trim() || DEFAULT_BOOKING_TITLE;
  const description = seo?.metaDescription?.trim() || DEFAULT_BOOKING_DESCRIPTION;

  return {
    title,
    description,
    robots: "index, follow",
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "en-gb": canonicalUrl },
    },
  };
}

export default async function BookingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [
    navbarVariantTestConfig,
    navServerBootstrap,
    seo,
    canonicalUrl,
    storeIdentity,
  ] = await Promise.all([
    getNavbarVariantTestPublicServer(),
    getHomeNavbarCriticalServer(),
    getBookingPublicSeo(),
    getCanonical("/booking"),
    getStoreIdentity(),
  ]);

  const showNavbar = navbarVariantTestConfig?.showOnStorefront !== false;
  const jsonLdStrings = await mergeAdminJsonLdWithAutoBusiness(
    bookingJsonLdStringsFromSeo(
      seo?.metaSchema ?? [],
      canonicalUrl,
      storeIdentity.siteName
    )
  );

  return (
    <>
      {jsonLdStrings.map((json, index) => (
        <script
          key={`booking-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      {showNavbar ? (
        <NavbarVariantTestBar
          config={navbarVariantTestConfig}
          serverBootstrapLogo={{
            logoUrl: navServerBootstrap.logoUrl,
            logoAlt: navServerBootstrap.logoAlt,
          }}
        />
      ) : null}
      {children}
    </>
  );
}
