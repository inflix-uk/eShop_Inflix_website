"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchProducts } from "@/app/lib/features/products/getProductSlice";
import {
  fetchProductCategory,
  fetchCategoryCounts,
} from "@/app/lib/features/categories/categoriesSlice";
import { useAppDispatch, useAppSelector } from "./lib/hooks";
import {
  getHomepageData,
  type HomepageBlock,
} from "./services/homepageDataService";
import {
  getSiteWidgetSettingsPublic,
  DEFAULT_SITE_WIDGET_VISIBILITY,
  type SiteWidgetVisibility,
} from "./services/siteWidgetSettingsService";
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
}: {
  cmsPrefetch?: HomeServerCmsBundle;
}) {
  const prefetched = cmsPrefetch !== undefined;
  const hasPrefetchBlocks = Boolean(cmsPrefetch?.homepageBlocks?.length);
  const dispatch = useAppDispatch();
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

  /** Avoid re-dispatching thunks when lists stay empty — `isCountsLoading` toggles re-ran the effect and caused request storms. */
  const homeBootstrapRef = useRef({
    products: false,
    categories: false,
    counts: false,
  });

  const [homepageBlocks, setHomepageBlocks] = useState<HomepageBlock[]>(() =>
    prefetched ? cmsPrefetch!.homepageBlocks : []
  );
  /** Show skeleton until we have at least one network response when SSR had no rows (admin may add content after build). */
  const [homepageBlocksLoading, setHomepageBlocksLoading] = useState(
    () => !hasPrefetchBlocks
  );
  const [widgetVisibility, setWidgetVisibility] = useState<SiteWidgetVisibility>(
    () =>
      prefetched ? cmsPrefetch!.widgetVisibility : DEFAULT_SITE_WIDGET_VISIBILITY
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Revalidate on mount so admin homepage rows / widget toggles apply without waiting on ISR prefetch. */
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!products.length && !homeBootstrapRef.current.products) {
      homeBootstrapRef.current.products = true;
      dispatch(fetchProducts());
    }
    if (
      !newCategories.categories.length &&
      !homeBootstrapRef.current.categories
    ) {
      homeBootstrapRef.current.categories = true;
      dispatch(fetchProductCategory(category));
    }
    if (
      !categoryCounts.length &&
      !isCountsLoading &&
      !homeBootstrapRef.current.counts
    ) {
      homeBootstrapRef.current.counts = true;
      dispatch(fetchCategoryCounts());
    }
  }, [
    dispatch,
    products.length,
    newCategories.categories.length,
    category,
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
        ) : (
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
