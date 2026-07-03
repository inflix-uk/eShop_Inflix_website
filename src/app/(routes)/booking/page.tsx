import BookingPageClient from "./BookingPageClient";
import {
  getBookingSettingsServer,
  getBookingPackagesServer,
  getBookingPageContentServer,
} from "./services/bookingServerData";

// Always render on the server per request so admin content/settings changes
// (e.g. toggling the hero stats) reflect immediately without stale caching.
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [settings, packages, content] = await Promise.all([
    getBookingSettingsServer(),
    getBookingPackagesServer(),
    getBookingPageContentServer(),
  ]);

  return (
    <BookingPageClient
      settings={settings}
      packages={packages}
      content={content}
    />
  );
}
