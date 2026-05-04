import { cmsServerFetchJson } from "@/app/lib/cmsServerFetch";
import { DEFAULT_FOOTER } from "@/app/components/footer/footerDefaults";
import type {
  FooterSection2,
  FooterSettings,
} from "@/app/components/footer/footerTypes";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

/** Last successful footer (per Node / lambda). Used when CMS fetch fails or returns empty. */
let lastGoodFooterSettings: FooterSettings | null = null;

function rememberFooterSnapshot(snapshot: FooterSettings) {
  lastGoodFooterSettings = JSON.parse(JSON.stringify(snapshot)) as FooterSettings;
}

function footerFallback(): FooterSettings {
  return lastGoodFooterSettings ?? DEFAULT_FOOTER;
}

/**
 * CMS documents may omit sections after partial PATCH/legacy saves.
 * Merge with defaults so we never drop valid sections (old guard required section1+section2).
 */
export function mergePartialFooterFromApi(
  apiData: Partial<FooterSettings> | null | undefined
): FooterSettings {
  const d = JSON.parse(JSON.stringify(DEFAULT_FOOTER)) as FooterSettings;
  if (!apiData || typeof apiData !== "object") {
    return d;
  }
  const s = apiData as FooterSettings;
  const s1 = s.section1 ?? {};
  const logo =
    typeof s1.logo === "object" && s1.logo != null && !Array.isArray(s1.logo)
      ? { ...(typeof d.section1.logo === "object" ? d.section1.logo : {}), ...s1.logo }
      : s1.logo !== undefined
        ? s1.logo
        : d.section1.logo;

  return {
    ...d,
    ...s,
    section1: {
      ...d.section1,
      ...s1,
      ...(logo !== undefined ? { logo } : {}),
      socialMedia: Array.isArray(s1.socialMedia)
        ? s1.socialMedia
        : d.section1.socialMedia,
    },
    section2: {
      ...d.section2,
      ...(s.section2 ?? {}),
      links: Array.isArray(s.section2?.links)
        ? s.section2.links
        : d.section2.links,
    },
    section3: {
      ...d.section3,
      ...(s.section3 ?? {}),
      links: Array.isArray(s.section3?.links)
        ? s.section3.links
        : d.section3.links,
    },
    section4: {
      ...d.section4,
      ...(s.section4 ?? {}),
      links: Array.isArray(s.section4?.links)
        ? s.section4.links
        : d.section4.links,
    },
    section5: {
      ...d.section5,
      ...(s.section5 ?? {}),
      paymentMethods: {
        ...d.section5.paymentMethods,
        ...(s.section5?.paymentMethods ?? {}),
        logos: Array.isArray(s.section5?.paymentMethods?.logos)
          ? s.section5.paymentMethods.logos
          : d.section5.paymentMethods.logos,
      },
    },
    sectionNewsletter: {
      ...d.sectionNewsletter!,
      ...(s.sectionNewsletter ?? {}),
    },
    bottomBar: {
      ...d.bottomBar,
      ...(s.bottomBar ?? {}),
    },
  };
}

export function normalizeFooterApiData(raw: FooterSettings): FooterSettings {
  const data: FooterSettings = JSON.parse(JSON.stringify(raw)) as FooterSettings;

  if (data.section1?.socialMedia) {
    data.section1.socialMedia = data.section1.socialMedia
      .filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order);
  }

  (["section2", "section3", "section4"] as const).forEach((sectionKey) => {
    const section = data[sectionKey] as FooterSection2;
    if (section?.links) {
      section.links = section.links
        .filter((link) => link.isActive)
        .sort((a, b) => a.order - b.order);
    }
  });

  if (data.section5?.paymentMethods?.logos) {
    data.section5.paymentMethods.logos = data.section5.paymentMethods.logos
      .filter((logo) => logo.isActive)
      .sort((a, b) => a.order - b.order);
  }

  data.bottomBar = {
    ...DEFAULT_FOOTER.bottomBar,
    ...(data.bottomBar ?? {}),
  };

  return data;
}

/**
 * Footer CMS fetch with warm in-memory cache (per server instance).
 * On network/CMS errors or empty payloads, returns the last successful snapshot when available.
 */
export async function getFooterSettingsCached(): Promise<FooterSettings> {
  const base = apiBase();
  if (!base) return footerFallback();

  try {
    const responseJson = await cmsServerFetchJson<{
      data?: FooterSettings;
      success?: boolean;
    }>(`${base}/footer/settings`);

    const apiData = responseJson.data;
    if (!apiData || typeof apiData !== "object") {
      console.warn("[footerPublicService] empty footer payload, using warm cache or defaults");
      return footerFallback();
    }
    const merged = mergePartialFooterFromApi(
      apiData as Partial<FooterSettings>
    );
    const normalized = normalizeFooterApiData(merged);
    rememberFooterSnapshot(normalized);
    return normalized;
  } catch (e) {
    console.warn("[footerPublicService] fetch failed, using warm cache or defaults:", e);
    return footerFallback();
  }
}
