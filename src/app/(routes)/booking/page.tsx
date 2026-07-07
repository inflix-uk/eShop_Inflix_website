import BookingPageClient from "./BookingPageClient";
import {
  getBookingSettingsServer,
  getBookingPackagesServer,
  getBookingPageContentServer,
} from "./services/bookingServerData";
import { getSiteThemePublic } from "@/app/services/siteThemeService";

// Always render on the server per request so admin content/settings changes
// (e.g. toggling the hero stats) reflect immediately without stale caching.
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [settings, packages, content, theme] = await Promise.all([
    getBookingSettingsServer(),
    getBookingPackagesServer(),
    getBookingPageContentServer(),
    getSiteThemePublic(),
  ]);

  return (
    <BookingPageClient
      settings={settings}
      packages={packages}
      content={content}
      bookingModuleUi={theme.bookingModuleUi}
    />
  );
}
