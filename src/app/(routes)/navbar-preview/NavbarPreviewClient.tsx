"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import NavbarVariantTestBar from "@/app/components/navbar/NavbarVariantTestBar";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";

export default function NavbarPreviewClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [config, setConfig] = useState<NavbarVariantTestConfig | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Missing preview link. Use Preview from the admin navbar page.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/navbar-preview-draft/${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json?.success) {
          setError(
            String(
              json?.message ||
                "Preview expired or not found. Open preview again from admin."
            )
          );
          return;
        }
        setConfig(json.data?.config || null);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load preview. Restart the website dev server and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading navbar preview…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-gray-500">
        No preview data found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        Draft preview — not saved to the live storefront yet. Close this tab when done.
      </div>
      <NavbarVariantTestBar config={config} forcePreview />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-gray-400">
        Sample page content below the navbar
      </div>
      <div className="mx-auto mb-16 h-48 max-w-4xl rounded-xl bg-gradient-to-r from-slate-100 to-slate-200" />
    </div>
  );
}
