import { cache } from "react";
import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch, isCmsFetchAbortError } from "@/app/lib/cmsTimedFetch";

export type BookingPageHero = {
  badgeText: string;
  title: string;
  subtitle: string;
  statsEnabled: boolean;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
};

export type BookingPageServices = {
  heading: string;
  subheading: string;
};

export type BookingTrustBlock = {
  title: string;
  description: string;
};

export type BookingPageContent = {
  hero: BookingPageHero;
  services: BookingPageServices;
  trust: BookingTrustBlock[];
};

export const DEFAULT_BOOKING_PAGE_CONTENT: BookingPageContent = {
  hero: {
    badgeText: "Online Booking Available",
    title: "Book Your Perfect Appointment",
    subtitle:
      "Choose from our range of premium services and book your preferred time slot. Quick, easy, and secure online booking.",
    statsEnabled: true,
    stat1Label: "Services",
    stat2Value: "24/7",
    stat2Label: "Online Booking",
    stat3Value: "100%",
    stat3Label: "Secure Payment",
  },
  services: {
    heading: "Our Services",
    subheading: "Select a service to begin booking",
  },
  trust: [
    {
      title: "Secure Booking",
      description: "Your data is protected with industry-leading encryption",
    },
    {
      title: "Instant Confirmation",
      description: "Receive immediate booking confirmation via email",
    },
    {
      title: "Flexible Payment",
      description: "Pay securely with card, Apple Pay, or Google Pay",
    },
  ],
};

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

function pick(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function mergeContent(raw: unknown): BookingPageContent {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const heroSrc =
    src.hero && typeof src.hero === "object" ? (src.hero as Record<string, unknown>) : {};
  const servicesSrc =
    src.services && typeof src.services === "object"
      ? (src.services as Record<string, unknown>)
      : {};
  const trustSrc = Array.isArray(src.trust) ? src.trust : [];

  const heroDefaults = DEFAULT_BOOKING_PAGE_CONTENT.hero;
  let title = pick(heroSrc.title, "");
  if (!title) {
    const legacy = [heroSrc.titleBefore, heroSrc.titleHighlight, heroSrc.titleAfter]
      .map((p) => pick(p, ""))
      .filter(Boolean)
      .join(" ");
    title = legacy || heroDefaults.title;
  }
  const hero: BookingPageHero = {
    badgeText: pick(heroSrc.badgeText, heroDefaults.badgeText),
    title,
    subtitle: pick(heroSrc.subtitle, heroDefaults.subtitle),
    statsEnabled:
      typeof heroSrc.statsEnabled === "boolean"
        ? heroSrc.statsEnabled
        : heroDefaults.statsEnabled,
    stat1Label: pick(heroSrc.stat1Label, heroDefaults.stat1Label),
    stat2Value: pick(heroSrc.stat2Value, heroDefaults.stat2Value),
    stat2Label: pick(heroSrc.stat2Label, heroDefaults.stat2Label),
    stat3Value: pick(heroSrc.stat3Value, heroDefaults.stat3Value),
    stat3Label: pick(heroSrc.stat3Label, heroDefaults.stat3Label),
  };

  const servicesDefaults = DEFAULT_BOOKING_PAGE_CONTENT.services;
  const services: BookingPageServices = {
    heading: pick(servicesSrc.heading, servicesDefaults.heading),
    subheading: pick(servicesSrc.subheading, servicesDefaults.subheading),
  };

  const trust: BookingTrustBlock[] = DEFAULT_BOOKING_PAGE_CONTENT.trust.map((defaults, index) => {
    const entry =
      trustSrc[index] && typeof trustSrc[index] === "object"
        ? (trustSrc[index] as Record<string, unknown>)
        : {};
    return {
      title: pick(entry.title, defaults.title),
      description: pick(entry.description, defaults.description),
    };
  });

  return { hero, services, trust };
}

export const getBookingPageContentPublic = cache(
  async (): Promise<BookingPageContent> => {
    const base = apiBase();
    if (!base) return DEFAULT_BOOKING_PAGE_CONTENT;

    try {
      const res = await cmsTimedFetch(`${base}/booking/settings/public/content`, {
        headers: { Accept: "application/json" },
        ...cmsPublicFetchInit({ next: { revalidate: 120 } }),
      });

      if (!res.ok) return DEFAULT_BOOKING_PAGE_CONTENT;

      const json = await res.json();
      if (!json?.success || !json?.data) return DEFAULT_BOOKING_PAGE_CONTENT;
      return mergeContent(json.data.content);
    } catch (e) {
      if (!isCmsFetchAbortError(e)) {
        console.error("[bookingPageContentService] public fetch:", e);
      }
      return DEFAULT_BOOKING_PAGE_CONTENT;
    }
  }
);
