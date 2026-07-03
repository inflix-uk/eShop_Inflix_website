"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { bookingService, BookingPackage } from "../../services/bookingService";
import { hasRichDescription } from "../../utils/description";

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
        <main className="min-h-[50vh] flex items-center justify-center bg-bodyBg">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        </main>
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
            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="font-medium text-sm">Back to Services</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-10 items-start">
            {/* Main content */}
            <article className="bg-bookingCardBg rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden min-w-0">
              <div className="px-6 sm:px-10 py-8 sm:py-10 border-b border-gray-100 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3">
                  {bookingService.getTypeLabel(pkg.type)}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                  {capitalizeWords(pkg.name)}
                </h1>
              </div>

              {hasRichDescription(pkg.detailPage) ? (
                <div className="px-6 sm:px-10 py-8 sm:py-10">
                  <div
                    className="prose prose-sm sm:prose-lg max-w-none blog-content text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: pkg.detailPage }}
                  />
                </div>
              ) : (
                <div className="px-6 sm:px-10 py-10 text-center">
                  <p className="text-gray-500">No additional details for this service yet.</p>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-bookingCardBg rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 sm:p-7">
                <p className="text-sm font-medium text-gray-500 mb-1">Price</p>
                <p className="text-4xl font-bold text-gray-900 mb-4">
                  {bookingService.formatPrice(pkg.price)}
                </p>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-100">
                  <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{pkg.durationMinutes} minute session</span>
                </div>

                {features.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                      Included
                    </p>
                    <ul className="space-y-2.5">
                      {features.map((feature, index) => (
                        <li
                          key={`${pkg._id}-feature-${index}`}
                          className="flex items-start gap-2.5 text-sm text-gray-700"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                            <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="flex w-full items-center justify-center bg-white text-gray-700 py-3 px-6 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
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
