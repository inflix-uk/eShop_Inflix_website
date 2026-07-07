import RegisterPageClient from "./RegisterPageClient";
import { getLogoSettingsPublic } from "@/app/services/logoService";
import { DEFAULT_LOGO_ALT } from "@/lib/storeIdentity";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const branding = await getLogoSettingsPublic();

  return (
    <RegisterPageClient
      logoSrc={branding?.logoUrl?.trim() || null}
      logoAlt={branding?.altText?.trim() || DEFAULT_LOGO_ALT}
    />
  );
}
