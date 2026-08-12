import FooterWrapper from "@/app/components/footer/FooterWrapper";
import { getFooterSettingsCached } from "@/app/services/footerPublicService";
import { getNavbarVariantTestPublicServer } from "@/app/services/navbarVariantTestPublicService";

function hostLooksLocal(host: string): boolean {
  const h = host.toLowerCase().split(":")[0] ?? "";
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".local") ||
    h.startsWith("192.168.") ||
    h.startsWith("10.")
  );
}

/** Avoid `headers()` here — it forces dynamic HTML and breaks bfcache (Lighthouse). */
function inferSiteHostIsLocalFromEnv(): boolean {
  const raw = String(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.FRONTEND_URL ||
      ""
  ).trim();
  if (raw) {
    try {
      const hostname = new URL(
        /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      ).hostname;
      return hostLooksLocal(hostname);
    } catch {
      /* fall through */
    }
  }
  return process.env.NODE_ENV === "development";
}

export default async function FooterShell() {
  const siteHostIsLocal = inferSiteHostIsLocalFromEnv();
  const copyrightYear = new Date().getFullYear();
  const [initialFooterSettings, navbarConfig] = await Promise.all([
    getFooterSettingsCached(),
    getNavbarVariantTestPublicServer(),
  ]);

  return (
    <FooterWrapper
      initialFooterSettings={initialFooterSettings}
      siteHostIsLocal={siteHostIsLocal}
      copyrightYear={copyrightYear}
      navbarVariant={navbarConfig?.variant}
    />
  );
}
