import {
  cmsLivePublicFetchInit,
  cmsPublicFetchInit,
} from "@/app/lib/cmsPublicFetchInit";
import {
  cmsTimedFetch,
  isCmsFetchAbortError,
  isCmsUnreachableFetchError,
} from "@/app/lib/cmsTimedFetch";
import { resolveCmsApiBase } from "@/app/lib/cmsApiBase";

export interface TrustpilotSettings {
  productPageTopScript: string;
  productPageScript: string;
  homePageScript: string;
}

export const getTrustpilotSettings = async (options?: {
  live?: boolean;
}): Promise<TrustpilotSettings | null> => {
  const cacheInit = options?.live ? cmsLivePublicFetchInit() : cmsPublicFetchInit();
  const base = resolveCmsApiBase();
  if (!base) return null;
  try {
    const response = await cmsTimedFetch(`${base}/trustpilot/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...cacheInit,
    });

    if (!response.ok) {
      console.error('Failed to fetch Trustpilot settings');
      return null;
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    if (
      isCmsFetchAbortError(error) ||
      isCmsUnreachableFetchError(error)
    ) {
      return null;
    }
    console.error("Error fetching Trustpilot settings:", error);
    return null;
  }
};
