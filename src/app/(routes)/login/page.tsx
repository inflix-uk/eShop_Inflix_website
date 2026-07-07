import LoginPageClient from "./LoginPageClient";
import { getLogoSettingsPublic } from "@/app/services/logoService";
import { DEFAULT_LOGO_ALT } from "@/lib/storeIdentity";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const branding = await getLogoSettingsPublic();

  return (
    <LoginPageClient
      logoSrc={branding?.logoUrl?.trim() || null}
      logoAlt={branding?.altText?.trim() || DEFAULT_LOGO_ALT}
    />
  );
}
