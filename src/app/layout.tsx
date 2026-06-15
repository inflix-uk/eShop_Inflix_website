// app/layout.tsx or app/RootLayout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";
import StoreProvider from "@/app/StoreProvider";
import { AuthProvider } from "@/app/context/Auth";
import DeferredGoogleTagManagerGate from "@/app/components/analytics/DeferredGoogleTagManagerGate";
import FacebookPixelBlock from "@/app/components/analytics/FacebookPixelBlock";
import SiteBrandColors from "@/app/components/SiteBrandColors";
import SiteThemeInlineStyles from "@/app/components/SiteThemeInlineStyles";
import TypographyThemeStyles from "@/app/components/TypographyThemeStyles";
import { HTML_FONT_VARIABLE_CLASSES } from "@/app/lib/fonts";
import SiteScriptsRaw from "@/app/components/SiteScriptsRaw";
import FooterShell from "@/app/components/footer/FooterShell";
import DeferredLayoutWidgets from "@/app/components/DeferredLayoutWidgets";
import AnnouncementBarWrapper from "@/app/components/AnnouncementBarWrapper";
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
import { getSiteWideSchemaPublic } from "@/app/services/siteWideSchemaService";
import { isBackendAvailable } from "@/app/lib/backendAvailability";
import { BackendAvailabilityProvider } from "@/app/context/BackendAvailabilityContext";
import { ProductCardDesignProvider } from "@/app/context/ProductCardDesignContext";
import { getProductCardSettingsPublic } from "@/app/services/productCardSettingsService";
import { DEFAULT_SITE_THEME, resolveSiteTheme } from "@/app/lib/siteThemeUtils";
import { cloneTypographyDefaults } from "@/app/lib/typographyThemeUtils";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Next.js 15 defaults `fetch` to uncached (`no-store`), which keeps RSC pages fully dynamic
 * and sends `Cache-Control: no-store` on HTML — Lighthouse reports bfcache blocked.
 * `default-cache` restores opt-in caching unless a fetch explicitly sets `cache: 'no-store'`.
 */
export const fetchCache = "default-cache";

function buildStaticFaviconHref(branding: LogoSettings | null): string | null {
  const raw = branding?.faviconUrl?.trim();
  const v = branding?.faviconVersion;
  if (!raw) return null;
  return `${raw}${raw.includes("?") ? "&" : "?"}v=${v ?? ""}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const backendAvailable = await isBackendAvailable();
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

  const siteBranding = backendAvailable ? await getLogoSettingsPublic() : null;
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

  const ogImage = `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`;

  const metadata: Metadata = {
    robots: "index, follow",
    // Do not set alternates.openGraph.url here: without a per-route path, every
    // page would inherit the homepage canonical. Use getCanonical in each
    // route's generateMetadata (see app/page.tsx for "/").
    openGraph: {
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      images: [{ url: ogImage }],
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
  const [backendAvailable, siteScripts, siteThemeBundle, announcementBanner, siteWideSchemas, siteBranding, productCardSettings] =
    await Promise.all([
      isBackendAvailable(),
      getSiteScriptsPublic(),
      getSiteThemePublic().catch(() => ({
        colors: resolveSiteTheme(
          DEFAULT_SITE_THEME.primaryColor,
          DEFAULT_SITE_THEME.secondaryColor
        ),
        typography: cloneTypographyDefaults(),
      })),
      getAnnouncementBannerPublic(),
      getSiteWideSchemaPublic(),
      getLogoSettingsPublic(),
      getProductCardSettingsPublic(),
    ]);

  const effectiveBranding = backendAvailable ? siteBranding : null;
  const ssrFaviconHref = buildStaticFaviconHref(effectiveBranding);
  const faviconHeadScriptLiteral = JSON.stringify(ssrFaviconHref);
  const combinedHeadScripts = combineHeadScripts(siteScripts);
  const combinedBodyStart = combineBodyStartScripts(siteScripts);
  const combinedBodyEnd = combineBodyEndScripts(siteScripts);
  const backendAvailableLiteral = backendAvailable ? "true" : "false";

  return (
    <html
      lang="en"
      className={HTML_FONT_VARIABLE_CLASSES}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var backendUp=${backendAvailableLiteral};var href=${faviconHeadScriptLiteral};var sel='link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"],link[rel="mask-icon"]';document.querySelectorAll(sel).forEach(function(n){n.remove();});if(!backendUp||!href){["icon","shortcut icon","apple-touch-icon"].forEach(function(rel){var l=document.createElement("link");l.rel=rel;l.href='data:,';document.head.appendChild(l);});return;}["icon","shortcut icon","apple-touch-icon"].forEach(function(rel){var l=document.createElement("link");l.rel=rel;l.href=href;document.head.appendChild(l);});}catch(e){}})();`,
          }}
        />
        <meta
          name="ahrefs-site-verification"
          content="e104a647a256b0215a2711b55f63420f2e8a84bf449ced9c3e942a98bccef408"
        />
        <FacebookPixelBlock />
        <DeferredGoogleTagManagerGate />
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
        <SiteScriptsRaw html={combinedHeadScripts} forHead />
        <SiteThemeInlineStyles theme={siteThemeBundle.colors} />
        <TypographyThemeStyles typography={siteThemeBundle.typography} />
      </head>

      <body
        className="bg-white font-sans antialiased"
        suppressHydrationWarning
      >
        <SiteScriptsRaw html={combinedBodyStart} />
        <StoreProvider>
          <AuthProvider>
            <BackendAvailabilityProvider backendAvailable={backendAvailable}>
              <ProductCardDesignProvider design={productCardSettings.activeDesign}>
                {backendAvailable && <SiteBrandColors />}
                {backendAvailable && <AnnouncementBarWrapper initial={announcementBanner} />}
                {children}
                <FooterShell />
                {backendAvailable && <DeferredLayoutWidgets />}
              </ProductCardDesignProvider>
            </BackendAvailabilityProvider>
          </AuthProvider>
        </StoreProvider>
        <SiteScriptsRaw html={combinedBodyEnd} />
      </body>
    </html>
  );
}
