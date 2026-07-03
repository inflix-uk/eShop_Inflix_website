import {
  BookingPackage,
  BookingSettings,
  BookingPageContent,
  DEFAULT_BOOKING_PAGE_CONTENT,
  mergeBookingPageContent,
} from "./bookingService";

const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").trim();
const API_URL: string = rawApiUrl.endsWith("/") ? rawApiUrl : `${rawApiUrl}/`;

async function fetchJson(path: string): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function getBookingSettingsServer(): Promise<BookingSettings | null> {
  try {
    const data = await fetchJson("booking/settings/public");
    return data?.settings ?? null;
  } catch (error) {
    console.error("[SSR] Error fetching booking settings:", error);
    return null;
  }
}

export async function getBookingPackagesServer(): Promise<BookingPackage[]> {
  try {
    const data = await fetchJson("get/booking/packages");
    return data?.packages || [];
  } catch (error) {
    console.error("[SSR] Error fetching booking packages:", error);
    return [];
  }
}

export async function getBookingPageContentServer(): Promise<BookingPageContent> {
  try {
    const data = await fetchJson("booking/settings/public/content");
    if (data?.success && data?.data?.content) {
      return mergeBookingPageContent(data.data.content);
    }
  } catch (error) {
    console.error("[SSR] Error fetching booking page content:", error);
  }
  return DEFAULT_BOOKING_PAGE_CONTENT;
}
