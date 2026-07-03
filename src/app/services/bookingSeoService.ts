import { cache } from "react";
import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch, isCmsFetchAbortError } from "@/app/lib/cmsTimedFetch";

export type BookingPublicSeo = {
  metaTitle: string;
  metaDescription: string;
  metaSchema: string[];
  seoUpdatedAt: string | null;
};

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

export const getBookingPublicSeo = cache(
  async (): Promise<BookingPublicSeo | null> => {
    const base = apiBase();
    if (!base) return null;

    try {
      const res = await cmsTimedFetch(`${base}/booking/settings/public/seo`, {
        headers: { Accept: "application/json" },
        ...cmsPublicFetchInit({ next: { revalidate: 120 } }),
      });

      if (!res.ok) return null;

      const json = await res.json();
      if (!json?.success || !json?.data) return null;

      const d = json.data;
      return {
        metaTitle: typeof d.metaTitle === "string" ? d.metaTitle : "",
        metaDescription:
          typeof d.metaDescription === "string" ? d.metaDescription : "",
        metaSchema: Array.isArray(d.metaSchema)
          ? d.metaSchema.map(String).filter(Boolean)
          : [],
        seoUpdatedAt: d.seoUpdatedAt ?? null,
      };
    } catch (e) {
      if (!isCmsFetchAbortError(e)) {
        console.error("[bookingSeoService] public fetch:", e);
      }
      return null;
    }
  }
);
