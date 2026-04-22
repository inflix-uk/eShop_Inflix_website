// app/layout.tsx or app/RootLayout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";
import StoreProvider from "@/app/StoreProvider";
import { AuthProvider } from "@/app/context/Auth";
import "react-toastify/dist/ReactToastify.css";
import Script from "next/script";
import DeferredGoogleTagManager from "@/app/components/analytics/DeferredGoogleTagManager";
import FacebookPixelBlock from "@/app/components/analytics/FacebookPixelBlock";
import SiteBrandColors from "@/app/components/SiteBrandColors";
import SiteThemeInlineStyles from "@/app/components/SiteThemeInlineStyles";
import TypographyThemeStyles from "@/app/components/TypographyThemeStyles";
import { HTML_FONT_VARIABLE_CLASSES } from "@/app/lib/fonts";
import SiteScriptsRaw from "@/app/components/SiteScriptsRaw";
import FooterShell from "@/app/components/footer/FooterShell";
import DeferredLayoutWidgets from "@/app/components/DeferredLayoutWidgets";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import { getAnnouncementBannerPublic } from "@/app/services/announcementBannerService";
import { getSiteThemePublic } from "@/app/services/siteThemeService";
import { getGoogleVerificationCode } from "@/app/services/googleVerificationService";
import { extractGoogleSiteVerificationFromHtml } from "@/app/lib/extractGoogleVerificationFromHtml";
import {
  combineBodyEndScripts,
  combineBodyStartScripts,
  combineHeadScripts,
  getSiteScriptsPublic,
} from "@/app/services/siteScriptsService";
import {
  getLogoSettingsPublic,
  type LogoSettings,
} from "@/app/services/logoService";
import FaviconRuntimeSync from "@/app/components/FaviconRuntimeSync";
import { getSiteWideSchemaPublic } from "@/app/services/siteWideSchemaService";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

function buildStaticFaviconHref(branding: LogoSettings | null): string | null {
  const raw = branding?.faviconUrl?.trim();
  const v = branding?.faviconVersion;
  if (!raw) return null;
  return `${raw}${raw.includes("?") ? "&" : "?"}v=${v ?? ""}`;
}

export async function generateMetadata(): Promise<Metadata> {
  let verificationCode: string | null = null;
  try {
    const siteScripts = await getSiteScriptsPublic();
    const fromSiteScriptsHtml = extractGoogleSiteVerificationFromHtml(
      siteScripts?.googleSearchConsoleScript
    );

    if (fromSiteScriptsHtml) {
      console.log(
        "[Layout] Google site verification will come from Site scripts (head HTML)"
      );
    } else {
      console.log(
        "[Layout] Fetching Google Search Console verification from legacy API…"
      );
      verificationCode = await getGoogleVerificationCode();
      if (verificationCode) {
        console.log(
          "[Layout] Verification code received, metadata.verification will be set"
        );
      } else {
        console.log(
          "[Layout] No verification code from legacy API or site scripts"
        );
      }
    }
  } catch (error) {
    console.error("[Layout] Error resolving Google verification:", error);
  }

  const siteBranding = await getLogoSettingsPublic();
  const faviconHrefRaw = siteBranding?.faviconUrl?.trim();
  const faviconVersion = siteBranding?.faviconVersion;
  const faviconHref =
    faviconHrefRaw && faviconHrefRaw.length > 0
      ? `${faviconHrefRaw}${faviconHrefRaw.includes("?") ? "&" : "?"}v=${faviconVersion ?? ""}`
      : null;
  const faviconIcons =
    faviconHref && faviconHrefRaw
      ? {
          icons: {
            icon: [
              {
                url: faviconHref,
                type: faviconHrefRaw
                  .toLowerCase()
                  .split("?")[0]
                  .endsWith(".ico")
                  ? "image/x-icon"
                  : "image/png",
              },
            ],
            shortcut: faviconHref,
            apple: faviconHref,
          },
        }
      : {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://zextons.co.uk";
  const ogImage = `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`;

  const metadata: Metadata = {
    robots: "index, follow",
    openGraph: {
      url: baseUrl,
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      images: [{ url: ogImage }],
    },
    alternates: {
      canonical: baseUrl,
      languages: { "en-gb": baseUrl },
    },
    // Skip metadata.verification when GSC meta is injected via Site scripts head HTML (avoids duplicate tags)
    ...(verificationCode && {
      verification: {
        google: verificationCode,
      },
    }),
    ...faviconIcons,
  };

  return metadata;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [siteScripts, siteThemeBundle, announcementBanner, siteWideSchemas, siteBranding] =
    await Promise.all([
      getSiteScriptsPublic(),
      getSiteThemePublic(),
      getAnnouncementBannerPublic(),
      getSiteWideSchemaPublic(),
      getLogoSettingsPublic(),
    ]);

  const ssrFaviconHref = buildStaticFaviconHref(siteBranding);
  const faviconHeadScriptLiteral = JSON.stringify(ssrFaviconHref);
  const combinedHeadScripts = combineHeadScripts(siteScripts);
  const combinedBodyStart = combineBodyStartScripts(siteScripts);
  const combinedBodyEnd = combineBodyEndScripts(siteScripts);

  return (
    <html
      lang="en"
      className={HTML_FONT_VARIABLE_CLASSES}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var href=${faviconHeadScriptLiteral};var sel='link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"]';if(href){document.querySelectorAll(sel).forEach(function(n){n.remove();});["icon","shortcut icon","apple-touch-icon"].forEach(function(rel){var l=document.createElement("link");l.rel=rel;l.href=href;document.head.appendChild(l);});try{localStorage.setItem("favicon",href);}catch(e2){}}else{document.querySelectorAll(sel).forEach(function(n){n.remove();});try{localStorage.removeItem("favicon");}catch(e3){}}}catch(e){}})();`,
          }}
        />
        <meta
          name="ahrefs-site-verification"
          content="e104a647a256b0215a2711b55f63420f2e8a84bf449ced9c3e942a98bccef408"
        />
        {/* Flaticon uicons for product features icons */}
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-bold-rounded/css/uicons-bold-rounded.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-rounded/css/uicons-solid-rounded.css"
        />
        <FacebookPixelBlock />
        <DeferredGoogleTagManager />
        {/* Hardcoded Organization schema — kept as fallback reference
        <Script
          id="organization-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Zextons",
              alternateName: "Zextons",
              url: "https://zextons.co.uk/",
              logo: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
            }),
          }}
        />
        */}
        {/* Dynamic site-wide schemas from admin panel */}
        {siteWideSchemas.map((jsonStr, i) => (
          <script
            key={`site-schema-${i}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonStr }}
          />
        ))}
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="uvqeroCgZqjugCBgl++DGQ"
          strategy="lazyOnload"
        />
        <SiteScriptsRaw html={combinedHeadScripts} />
        {/* Microsoft Clarity Integration */}
        <Script
          id="microsoft-clarity-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);
                t.defer=true;
                t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];
                y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "ok17wd71hr");
            `,
          }}
        />
        {/* Klarna Web SDK */}
        <Script
          id="klarna-sdk"
          src="https://js.klarna.com/web-sdk/v1/klarna.js"
          data-environment="production"
          data-client-id="klarna_live_client_KVRVI2UlR2pJMWd6dko5OHBnZlNraSR4SSQhQjQ2IyosYjUyOWRmNTItNjQ5ZC00MjEwLTlmNmItNGVmN2ZiMDc5YmY3LDEsZlg3ZjJmeXRvL1NqR0lYemJteTZmZkFQT3pUY3NXQWNEZHd2LzRpenlKVT0"
          strategy="lazyOnload"
        />
        {/* PayPal SDK */}
        <Script
          id="paypal-sdk"
          src="https://www.paypal.com/sdk/js?client-id=Aft9jSD19fVZmU7VJd1je7hCfZ-JyG6WDhqCpJsCENqXlQuRpZYyJYqc7zP20_U0H_vB0NK_ZU407K3F&currency=GBP&components=messages"
          data-namespace="PayPalSDK"
          strategy="lazyOnload"
        />
        <SiteThemeInlineStyles theme={siteThemeBundle.colors} />
        <TypographyThemeStyles typography={siteThemeBundle.typography} />
      </head>

      <body
        className="bg-white font-sans antialiased"
        suppressHydrationWarning
      >
        <FaviconRuntimeSync
          ssrFaviconResolvedUrl={siteBranding?.faviconUrl?.trim() ?? null}
          ssrFaviconVersion={siteBranding?.faviconVersion ?? null}
        />
        <SiteScriptsRaw html={combinedBodyStart} />
        <StoreProvider>
          <AuthProvider>
            <SiteBrandColors />
            <AnnouncementBar initial={announcementBanner} />
            {children}
            <FooterShell />
            <DeferredLayoutWidgets />
          </AuthProvider>
        </StoreProvider>
        <SiteScriptsRaw html={combinedBodyEnd} />
      </body>
    </html>
  );
}
