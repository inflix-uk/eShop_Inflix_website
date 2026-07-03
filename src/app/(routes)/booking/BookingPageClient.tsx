"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  bookingService,
  BookingPackage,
  BookingSettings,
  BookingPageContent,
} from "./services/bookingService";
import { getDescriptionPreview } from "./utils/description";

function capitalizeWords(value: string): string {
  if (!value) return value;
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

interface BookingPageClientProps {
  settings: BookingSettings | null;
  packages: BookingPackage[];
  content: BookingPageContent;
}

export default function BookingPageClient({
  settings,
  packages,
  content,
}: BookingPageClientProps) {
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredPackages =
    selectedType === "all"
      ? packages
      : packages.filter((pkg) => pkg.type === selectedType);

  const packageTypes = ["all", ...Array.from(new Set(packages.map((p) => p.type)))];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "service":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "consultation":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case "studio":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  if (!settings?.isEnabled) {
    return (
      <main className="bg-bodyBg flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Booking Currently Unavailable</h1>
          <p className="text-gray-600 mb-6">Our booking system is temporarily offline. Please check back later or contact us directly.</p>
          <Link href="/" className="inline-flex items-center text-primary hover:underline font-medium">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="bg-bodyBg pb-16">
        {/* Hero Section */}
        <section className="relative border-b border-gray-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="text-center max-w-5xl mx-auto">
              {/* Badge */}
              {content.hero.badgeText ? (
                <div className="inline-flex items-center gap-2 bg-bookingCardBg backdrop-blur-sm border border-primary/20 rounded-full px-4 py-2 mb-6 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <span className="text-sm font-medium text-gray-700">{content.hero.badgeText}</span>
                </div>
              ) : null}

              {/* Main Heading */}
              {content.hero.title ? (
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  {content.hero.title}
                </h1>
              ) : null}

              {/* Subtitle */}
              {content.hero.subtitle ? (
                <p className="text-sm sm:text-base text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
                  {content.hero.subtitle}
                </p>
              ) : null}

              {/* Stats */}
              {content.hero.statsEnabled ? (
                <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-gray-900">{packages.length}+</div>
                    <div className="text-sm text-gray-500 mt-1">{content.hero.stat1Label}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-gray-900">{content.hero.stat2Value}</div>
                    <div className="text-sm text-gray-500 mt-1">{content.hero.stat2Label}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-gray-900">{content.hero.stat3Value}</div>
                    <div className="text-sm text-gray-500 mt-1">{content.hero.stat3Label}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" aria-labelledby="booking-services-heading">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12">
            <div>
              <h2 id="booking-services-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">{content.services.heading}</h2>
              {content.services.subheading ? (
                <p className="text-gray-500 mt-2">{content.services.subheading}</p>
              ) : null}
            </div>

            {/* Type Filter */}
            {packageTypes.length > 2 && (
              <div className="flex gap-2 flex-wrap">
                {packageTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`group relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                      selectedType === type
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-primary/30 hover:text-primary"
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {type !== "all" && getTypeIcon(type)}
                      {type === "all" ? "All Services" : bookingService.getTypeLabel(type)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Packages Grid */}
          {filteredPackages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Available</h3>
              <p className="text-gray-500">Check back later for new services.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredPackages.map((pkg, index) => {
                const features = Array.isArray(pkg.features)
                  ? pkg.features.filter((item) => item.trim().length > 0)
                  : [];

                return (
                  <article
                    key={pkg._id}
                    className="flex flex-col bg-bookingCardBg rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow duration-300 p-6 sm:p-7"
                    style={{
                      animationDelay: `${index * 80}ms`,
                      animation: "fadeInUp 0.6s ease-out forwards",
                    }}
                  >
                    <Link
                      href={`/booking/details/${pkg._id}`}
                      className="flex flex-col flex-1 group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors">
                          {capitalizeWords(pkg.name)}
                        </h3>
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 shrink-0 pt-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {pkg.durationMinutes}m
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 leading-relaxed mb-6 min-h-[2.5rem] line-clamp-3">
                        {capitalizeWords(
                          getDescriptionPreview(
                            pkg.description,
                            `Perfect for ${bookingService.getTypeLabel(pkg.type).toLowerCase()} bookings with instant confirmation.`
                          )
                        )}
                      </p>

                      <div className="border-t border-gray-200 pt-6 mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-gray-900 tracking-tight">
                            {bookingService.formatPrice(pkg.price)}
                          </span>
                        </div>
                      </div>

                      {features.length > 0 && (
                        <ul className="space-y-3.5 flex-1 mb-6">
                          {features.map((feature, featureIndex) => (
                            <li key={`${pkg._id}-feature-${featureIndex}`} className="flex items-center gap-3 text-sm text-gray-600">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200">
                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                              {capitalizeFirst(feature)}
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors text-center">
                        View details &gt;
                      </p>
                    </Link>

                    <Link
                      href={`/booking/${pkg._id}`}
                      className="flex w-full items-center justify-center bg-primary text-white py-3.5 px-6 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors mt-6"
                    >
                      Book Now
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Trust Section — h2 section + h3 per benefit (proper outline under page h1) */}
        <section className="py-16 mt-16" aria-labelledby="booking-trust-heading">
          <h2 id="booking-trust-heading" className="sr-only">
            Why book with us
          </h2>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="p-6">
                <div className="w-14 h-14 bg-bookingCardBg border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.trust[0]?.title}</h3>
                <p className="text-gray-600 text-sm">{content.trust[0]?.description}</p>
              </div>

              <div className="p-6">
                <div className="w-14 h-14 bg-bookingCardBg border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.trust[1]?.title}</h3>
                <p className="text-gray-600 text-sm">{content.trust[1]?.description}</p>
              </div>

              <div className="p-6">
                <div className="w-14 h-14 bg-bookingCardBg border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.trust[2]?.title}</h3>
                <p className="text-gray-600 text-sm">{content.trust[2]?.description}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
