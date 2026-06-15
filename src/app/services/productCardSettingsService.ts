import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch, isCmsFetchAbortError } from "@/app/lib/cmsTimedFetch";

export type ProductCardDesign = "classic" | "modern";

export type ProductCardSettings = {
  activeDesign: ProductCardDesign;
};

const DEFAULT_SETTINGS: ProductCardSettings = {
  activeDesign: "classic",
};

/**
 * Server-side fetch for public product card settings.
 * Used to determine which card design to render on storefront.
 */
export async function getProductCardSettingsPublic(): Promise<ProductCardSettings> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) {
    return DEFAULT_SETTINGS;
  }

  try {
    const res = await cmsTimedFetch(`${base}/product-card/settings/public`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return DEFAULT_SETTINGS;
    }

    const json = await res.json();
    if (!json?.success || !json?.data) {
      return DEFAULT_SETTINGS;
    }

    return {
      activeDesign: json.data.activeDesign || "classic",
    };
  } catch (error) {
    if (!isCmsFetchAbortError(error)) {
      console.error("[productCardSettingsService] fetch error:", error);
    }
    return DEFAULT_SETTINGS;
  }
}
