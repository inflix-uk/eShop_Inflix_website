"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchProducts } from "@/app/lib/features/products/getProductSlice";
import {
  fetchProductCategory,
  fetchCategoryCounts,
} from "@/app/lib/features/categories/categoriesSlice";
import { useAppDispatch, useAppSelector } from "./lib/hooks";
import { useStore } from "react-redux";
import type { RootState } from "./lib/store";
import {
  getHomepageData,
  type HomepageBlock,
} from "./services/homepageDataService";
import {
  getSiteWidgetSettingsPublic,
  DEFAULT_SITE_WIDGET_VISIBILITY,
  type SiteWidgetVisibility,
} from "./services/siteWidgetSettingsService";
import { useAuth } from "@/app/context/Auth";
import { useBackendAvailability } from "@/app/context/BackendAvailabilityContext";
import { scheduleIdle } from "./lib/scheduleIdle";
import type { HomeServerCmsBundle } from "./lib/homeServerCms";

const HomepageContent = dynamic(
  () => import("./components/HomepageContent"),
  {
    loading: () => (
      <div className="animate-pulse space-y-4 mt-8" aria-hidden>
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    ),
  }
);

const CookieConsent = dynamic(
  () => import("./components/common/ConsentCookie")
);

const NewsletterSuccessModal = dynamic(
  () => import("./components/common/NewsletterSuccessModal"),
  { ssr: false }
);

export default function HomeClient({
  cmsPrefetch,
  backendAvailable: cmsApiAvailable = true,
}: {
  cmsPrefetch?: HomeServerCmsBundle;
  /**
   * SSR `GET {api}/health` result. When false, show “service unavailable” for this block.
   * When true and blocks are empty, show “no homepage content” instead.
   */
  backendAvailable?: boolean;
}) {
  const prefetched = cmsPrefetch !== undefined;
  const hasPrefetchBlocks = Boolean(cmsPrefetch?.homepageBlocks?.length);
  const dispatch = useAppDispatch();
  const store = useStore();
  const auth = useAuth();
  const { products } = useAppSelector((state) => state.products);
  const newCategories = useAppSelector((state) => state.categories);
  const { categoryCounts, isCountsLoading } = useAppSelector(
    (state) => state.categories
  );
  const [showThankYou, setShowThankYou] = useState(false);
  const [showConsent, setShowConsent] = useState<boolean>(false);
  const backendAvailable = useBackendAvailability();
  const [mounted, setMounted] = useState(false);
  const category = "";
  const pricingGroupId = auth?.user?.pricingGroup
    ? String(auth.user.pricingGroup)
    : "";

  /** Avoid re-dispatching thunks when lists stay empty — `isCountsLoading` toggles re-ran the effect and caused request storms. */
  const homeBootstrapRef = useRef({
    categories: false,
    counts: false,
  });
  const lastFetchedGroupIdRef = useRef<string | null>(null);

  const [homepageBlocks, setHomepageBlocks] = useState<HomepageBlock[]>(() =>
    prefetched ? cmsPrefetch!.homepageBlocks : []
  );
  /**
   * Skeleton only while we expect a client refetch. If SSR already knows the API is
   * unreachable, skip loading so we never flash “no content” after a failed fetch.
   */
  const [homepageBlocksLoading, setHomepageBlocksLoading] = useState(
    () => (cmsApiAvailable === false ? false : !hasPrefetchBlocks)
  );
  const [widgetVisibility, setWidgetVisibility] = useState<SiteWidgetVisibility>(
    () =>
      prefetched ? cmsPrefetch!.widgetVisibility : DEFAULT_SITE_WIDGET_VISIBILITY
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Revalidate on mount when the API is reachable (same origin as /health). */
  useEffect(() => {
    if (cmsApiAvailable === false) {
      return;
    }
    let cancelled = false;
    const cancelSchedule = scheduleIdle(() => {
      void (async () => {
        if (!hasPrefetchBlocks) {
          setHomepageBlocksLoading(true);
        }
        try {
          const data = await getHomepageData();
          if (!cancelled) {
            setHomepageBlocks(data?.blocks?.length ? data.blocks : []);
          }
        } catch (err) {
          console.error("Error fetching homepage data:", err);
          if (!cancelled && !hasPrefetchBlocks) {
            setHomepageBlocks([]);
          }
        } finally {
          if (!cancelled) {
            setHomepageBlocksLoading(false);
          }
        }
        try {
          const v = await getSiteWidgetSettingsPublic();
          if (!cancelled) {
            setWidgetVisibility(v);
          }
        } catch (err) {
          console.error("Error fetching site widget settings:", err);
        }
      })();
    });
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [cmsApiAvailable, hasPrefetchBlocks]);

  /**
   * Product/category Redux loads are below-the-fold for most users. Defer with
   * `scheduleIdle` so hydration + hero/nav work stays unblocked (TBT).
   * Re-reads `getState()` inside the callback so dispatches stay correct if auth
   * or lists change before the idle task runs.
   */
  useEffect(() => {
    const normalizedGroupId = pricingGroupId || null;
    const shouldRefetchProducts =
      products.length === 0 ||
      lastFetchedGroupIdRef.current !== normalizedGroupId;
    const needCategories =
      !newCategories.categories.length && !homeBootstrapRef.current.categories;
    const needCounts =
      !categoryCounts.length &&
      !isCountsLoading &&
      !homeBootstrapRef.current.counts;

    if (!shouldRefetchProducts && !needCategories && !needCounts) {
      return;
    }

    const cancel = scheduleIdle(
      () => {
        const state = store.getState() as RootState;
        const pg = state.auth.user?.pricingGroup
          ? String(state.auth.user.pricingGroup)
          : "";
        const norm = pg || null;
        const productsList = state.products.products;
        const refetchProducts =
          productsList.length === 0 ||
          lastFetchedGroupIdRef.current !== norm;

        if (refetchProducts) {
          lastFetchedGroupIdRef.current = norm;
          dispatch(fetchProducts(pg ? { groupId: pg } : undefined));
        }
        if (
          !state.categories.categories.length &&
          !homeBootstrapRef.current.categories
        ) {
          homeBootstrapRef.current.categories = true;
          dispatch(fetchProductCategory(category));
        }
        if (
          !state.categories.categoryCounts.length &&
          !state.categories.isCountsLoading &&
          !homeBootstrapRef.current.counts
        ) {
          homeBootstrapRef.current.counts = true;
          dispatch(fetchCategoryCounts());
        }
      },
      { timeout: 2200 }
    );
    return cancel;
  }, [
    dispatch,
    store,
    category,
    pricingGroupId,
    products.length,
    newCategories.categories.length,
    categoryCounts.length,
    isCountsLoading,
  ]);

  const handleClose = () => {
    setShowThankYou(false);
  };

  useEffect(() => {
    if (mounted) {
      const consent = localStorage.getItem("cookieConsent");
      setShowConsent(backendAvailable && (!consent || consent === "rejected"));
    }
  }, [mounted, backendAvailable]);

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {cmsApiAvailable === false && (
          <div
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left"
            role="alert"
            aria-live="polite"
          >
            <h2 className="text-sm font-semibold text-amber-950">
              Service temporarily unavailable
            </h2>
            <p className="mt-1 text-xs text-amber-900/90">
              Some live sections may be outdated while we reconnect to backend services.
            </p>
          </div>
        )}

        {homepageBlocksLoading ? (
          <div>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        ) : homepageBlocks.length > 0 ? (
          <HomepageContent
            blocks={homepageBlocks}
            widgetVisibility={widgetVisibility}
          />
        ) : cmsApiAvailable === false ? null : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-10 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              No homepage content configured yet
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This section will appear once homepage widgets or CMS blocks are published.
            </p>
          </div>
        )}
      </section>

      {showThankYou && (
        <NewsletterSuccessModal onClose={handleClose} />
      )}
      {showConsent && <CookieConsent />}
    </>
  );
}
