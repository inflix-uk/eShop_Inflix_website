"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Loader from "@/app/[slug]/components/Loader";
import ServerDown from "@/app/[slug]/components/ServerDown";
import RenderSections from "@/app/[slug]/components/RenderSections";

type Section = Record<string, unknown> & { type: string };

type PageResponse = {
  slug: string;
  title: string;
  sections: Section[];
};

export default function DynamicPageClient({
  slug,
  parentSlug,
}: {
  slug: string;
  /** When set, resolves CMS page at /parentSlug/slug */
  parentSlug?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [data, setData] = useState<PageResponse | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(false);
    setIsNotFound(false);

    try {
      const qs =
        parentSlug && String(parentSlug).trim()
          ? `?parentSlug=${encodeURIComponent(String(parentSlug).trim())}`
          : "";
      const res = await fetch(
        `/api/page/${encodeURIComponent(slug)}${qs}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (res.status === 404) {
        setData(null);
        setIsNotFound(true);
        return;
      }

      if (!res.ok) {
        throw new Error("API failed");
      }

      const json = (await res.json()) as PageResponse;
      if (!json?.sections?.length) {
        setData(null);
        setIsNotFound(true);
        return;
      }
      setData(json);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, parentSlug]);

  useEffect(() => {
    loadPage();
  }, [loadPage, retryTick]);

  if (isNotFound) notFound();
  if (loading) return <Loader />;
  if (error) return <ServerDown onRetry={() => setRetryTick((v) => v + 1)} />;
  if (!data || data.sections.length === 0) notFound();

  return <RenderSections sections={data.sections} />;
}
