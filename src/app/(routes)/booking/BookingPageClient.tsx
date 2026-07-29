"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  bookingService,
  BookingPackage,
  BookingSettings,
  BookingPageContent,
} from "./services/bookingService";
import BookingPackageCard from "./components/BookingPackageCard";
import "./components/booking-package-cards.css";
import BlogHtmlCssWidget from "@/app/(routes)/blogs/new/[slug]/BlogHtmlCssWidget";
import {
  bookingModuleRootStyle,
  type BookingModuleUi,
} from "@/app/lib/bookingModuleThemeUtils";

interface BookingPageClientProps {
  settings: BookingSettings | null;
  packages: BookingPackage[];
  content: BookingPageContent;
  bookingModuleUi: BookingModuleUi;
}

export default function BookingPageClient({
  settings,
  packages,
  content,
  bookingModuleUi,
}: BookingPageClientProps) {
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredPackages =
    selectedType === "all"
      ? packages
      : packages.filter((pkg) => pkg.type === selectedType);

  const packageTypes = ["all", ...Array.from(new Set(packages.map((p) => p.type)))];

  const inlineWidgetsByCount = new Map<number, typeof content.inlineWidgets>();
  for (const widget of content.inlineWidgets || []) {
    if (!widget?.enabled || !widget.html?.trim()) continue;
    const count = Number(widget.afterPackageCount);
    if (!Number.isFinite(count) || count < 1) continue;
    const key = Math.floor(count);
    const list = inlineWidgetsByCount.get(key) || [];
    list.push(widget);
    inlineWidgetsByCount.set(key, list);
  }

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
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 shadow-sm"
                  style={{
                    backgroundColor: bookingModuleUi.buttonBgColor || "#c2fc12",
                    border: `1px solid ${bookingModuleUi.buttonBgColor || "#c2fc12"}`,
                  }}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: "#ffffff" }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: "#ffffff" }}
                    />
                  </span>
                  <span
                    data-booking-btn-text
                    className="text-sm font-medium"
                    style={{ color: "#ffffff" }}
                  >
                    {content.hero.badgeText}
                  </span>
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
                <div
                  className="flex flex-wrap justify-center gap-8 sm:gap-12 rounded-xl px-6 py-4"
                  style={content.hero.statsBgColor ? { backgroundColor: content.hero.statsBgColor } : undefined}
                >
                  <div className="text-center">
                    <div
                      className="text-3xl sm:text-4xl font-bold"
                      style={{ color: content.hero.statsValueColor || '#111827' }}
                    >
                      {packages.length}+
                    </div>
                    <div
                      className="text-sm mt-1"
                      style={{ color: content.hero.statsLabelColor || '#6b7280' }}
                    >
                      {content.hero.stat1Label}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-3xl sm:text-4xl font-bold"
                      style={{ color: content.hero.statsValueColor || '#111827' }}
                    >
                      {content.hero.stat2Value}
                    </div>
                    <div
                      className="text-sm mt-1"
                      style={{ color: content.hero.statsLabelColor || '#6b7280' }}
                    >
                      {content.hero.stat2Label}
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className="text-3xl sm:text-4xl font-bold"
                      style={{ color: content.hero.statsValueColor || '#111827' }}
                    >
                      {content.hero.stat3Value}
                    </div>
                    <div
                      className="text-sm mt-1"
                      style={{ color: content.hero.statsLabelColor || '#6b7280' }}
                    >
                      {content.hero.stat3Label}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Packages Section — dark studio pricing grid */}
        <section
          className="booking-module-root psm-booking-packages bg-[#050505] border-t border-white/10 py-16 lg:py-20"
          style={bookingModuleRootStyle(bookingModuleUi)}
          aria-labelledby="booking-services-heading"
        >
          <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
              <div>
                <h2
                  id="booking-services-heading"
                  className="booking-module-section-heading text-2xl sm:text-3xl font-light tracking-tight"
                >
                  {content.services.heading}
                </h2>
                {content.services.subheading ? (
                  <p className="booking-module-section-subheading mt-2 text-sm sm:text-base">
                    {content.services.subheading}
                  </p>
                ) : null}
              </div>

              {packageTypes.length > 2 && (
                <div className="flex gap-2 flex-wrap">
                  {packageTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`booking-module-filter px-5 py-2.5 text-xs font-medium uppercase tracking-wider transition-all duration-300 ${
                        selectedType === type
                          ? "booking-module-filter--active"
                          : "booking-module-filter--idle"
                      }`}
                    >
                      <span data-booking-btn-text className="flex items-center gap-2">
                        {type !== "all" && getTypeIcon(type)}
                        {type === "all" ? "All Services" : bookingService.getTypeLabel(type)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filteredPackages.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 booking-module-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold booking-module-section-heading mb-2">No Services Available</h3>
                <p className="booking-module-description">Check back later for new services.</p>
              </div>
            ) : (
              <div className="psm-booking-packages__grid">
                {filteredPackages.flatMap((pkg, index) => {
                  const nodes = [
                    <BookingPackageCard key={pkg._id} pkg={pkg} />,
                  ];
                  const rowWidgets = inlineWidgetsByCount.get(index + 1);
                  if (rowWidgets?.length) {
                    rowWidgets.forEach((widget, wIndex) => {
                      nodes.push(
                        <div
                          key={`inline-widget-${index + 1}-${wIndex}`}
                          className="psm-booking-packages__widget"
                        >
                          <BlogHtmlCssWidget
                            html={widget.html}
                            css={widget.css}
                          />
                        </div>
                      );
                    });
                  }
                  return nodes;
                })}
              </div>
            )}
          </div>
        </section>

        {/* Custom HTML/CSS Widget Section */}
        {content.customWidget?.enabled && content.customWidget?.html ? (
          <section className="py-16 mt-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {content.customWidget.css ? (
                <style dangerouslySetInnerHTML={{ __html: content.customWidget.css }} />
              ) : null}
              <div
                className="booking-custom-widget"
                dangerouslySetInnerHTML={{ __html: content.customWidget.html }}
              />
            </div>
          </section>
        ) : null}
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
