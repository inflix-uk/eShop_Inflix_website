"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { bookingService, BookingPackage } from "../../services/bookingService";
import { hasRichDescription } from "../../utils/description";
import { formatDuration } from "../../utils/formatDuration";

const LoadingBar = dynamic(() => import("react-top-loading-bar"), { ssr: false });

function capitalizeWords(value: string): string {
  if (!value) return value;
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export default function BookingPackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const packageId = params.packageId as string;

  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState<BookingPackage | null>(null);

  useEffect(() => {
    loadPackage();
  }, [packageId]);

  const loadPackage = async () => {
    setProgress(30);
    try {
      const settings = await bookingService.getSettings();
      if (!settings?.isEnabled) {
        router.push("/booking");
        return;
      }

      const data = await bookingService.getPackageById(packageId);
      setPkg(data);
    } catch (error) {
      console.error("Error loading package:", error);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const features = Array.isArray(pkg?.features)
    ? pkg.features.filter((item) => item.trim().length > 0)
    : [];

  if (loading) {
    return (
      <>
        <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => setProgress(0)} />
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-bodyBg"
          role="status"
          aria-busy="true"
        >
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        </div>
      </>
    );
  }

  if (!pkg) {
    return (
      <>
        <main className="max-w-4xl mx-auto px-4 py-16 text-center bg-bodyBg">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Service Not Found</h1>
          <p className="text-gray-600 mb-6">This booking package is no longer available.</p>
          <Link href="/booking" className="text-primary font-medium hover:underline">
            Back to Services
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => setProgress(0)} />

      <main className="bg-bodyBg py-8 sm:py-12 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => router.push("/booking")}
            className="group flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
          >
            <div className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 group-hover:border-gray-300 group-hover:bg-gray-50 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="font-medium text-sm">Back to Services</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-10 items-start">
            {/* Main content */}
            <article className="min-w-0">
              {/* Header with title */}
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3">
                  {bookingService.getTypeLabel(pkg.type)}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                  {capitalizeWords(pkg.name)}
                </h1>
              </div>

              {/* HTML/CSS Widget - prioritized over detailPage */}
              {pkg.detailPageHtml?.trim() ? (
                <div>
                  {pkg.detailPageCss?.trim() && (
                    <style
                      dangerouslySetInnerHTML={{
                        __html: `/* Booking package widget styles - scoped to container only */
.booking-widget-container { all: initial; display: block; font-family: inherit; }
.booking-widget-container * { box-sizing: border-box; }
${pkg.detailPageCss.replace(/([^{}]+)(\{[^{}]*\})/g, (match, selector, rules) => {
  const scopedSelectors = selector
    .split(',')
    .map((s: string) => {
      const trimmed = s.trim();
      if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('.booking-widget-container')) return trimmed;
      return `.booking-widget-container ${trimmed}`;
    })
    .join(', ');
  return scopedSelectors + rules;
})}`,
                      }}
                    />
                  )}
                  <div
                    className="booking-widget-container"
                    dangerouslySetInnerHTML={{ __html: pkg.detailPageHtml }}
                  />
                </div>
              ) : hasRichDescription(pkg.detailPage) ? (
                <div className="bg-bookingCardBg rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] px-6 sm:px-10 py-8 sm:py-10">
                  <div
                    className="prose prose-sm sm:prose-lg max-w-none blog-content text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: pkg.detailPage }}
                  />
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-gray-500">No additional details for this service yet.</p>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-4">
              <div className="booking-card-themed bg-bookingCardBg rounded-2xl border shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 sm:p-7" style={{ borderColor: "var(--booking-card-divider)" }}>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--booking-card-fg-muted)" }}>Price</p>
                <p className="text-4xl font-bold mb-4" style={{ color: "var(--booking-card-fg)" }}>
                  {bookingService.formatPrice(pkg.price)}
                </p>

                <div className="flex items-center gap-2 text-sm mb-6 pb-6 border-b" style={{ color: "var(--booking-card-fg-muted)", borderColor: "var(--booking-card-divider)" }}>
                  <svg className="w-4 h-4 shrink-0" style={{ color: "var(--booking-card-fg)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {formatDuration(pkg.durationMinutes, pkg.durationDisplayUnit, {
                      short: false,
                    })}{" "}
                    session
                  </span>
                </div>

                {features.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--booking-card-fg-muted)" }}>
                      Included
                    </p>
                    <ul className="space-y-2.5">
                      {features.map((feature, index) => (
                        <li
                          key={`${pkg._id}-feature-${index}`}
                          className="flex items-start gap-2.5 text-sm"
                          style={{ color: "var(--booking-card-fg)" }}
                        >
                          <span 
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5"
                            style={{ backgroundColor: "var(--booking-card-surface)" }}
                          >
                            <svg className="w-3 h-3" style={{ color: "var(--booking-card-fg)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Link
                  href={`/booking/${pkg._id}`}
                  className="flex w-full items-center justify-center bg-primary text-white py-3.5 px-6 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors mb-3"
                >
                  Book This Service
                </Link>
                <Link
                  href="/booking"
                  className="flex w-full items-center justify-center py-3 px-6 rounded-xl text-sm font-medium border transition-colors hover:opacity-80"
                  style={{ 
                    backgroundColor: "var(--booking-card-surface)", 
                    color: "var(--booking-card-fg)",
                    borderColor: "var(--booking-card-surface-border)"
                  }}
                >
                  View All Services
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
