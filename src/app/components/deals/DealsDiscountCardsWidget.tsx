"use client";

import { useMemo, useState } from "react";
import type { Offer } from "../../../../types";
import type { DealsDiscountCardItem } from "@/app/services/homepageDataService";
import { DealsOfferCard, FilterButton } from "./DealsOfferCard";

function formatDateDisplay(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return String(dateString).trim();
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(dateString || "").trim();
  }
}

function isExpiryInPast(expiryDate: string | undefined): boolean {
  if (!expiryDate?.trim()) return false;
  const d = new Date(expiryDate.trim());
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export function mapCmsDealItemToOffer(item: DealsDiscountCardItem): Offer {
  const raw = String(item.type || "Deal").toLowerCase();
  const baseType: "Coupon" | "Deal" = raw === "coupon" ? "Coupon" : "Deal";
  const hasExpiry = item.hasExpiry !== false;

  const expiredByFlag = item.isExpired === true;
  const expiredByDate = hasExpiry && isExpiryInPast(item.expiryDate);
  const computedExpired = expiredByFlag || expiredByDate;
  const type = computedExpired ? "Expired" : baseType;

  const startDate =
    hasExpiry && item.startDate ? formatDateDisplay(item.startDate) : "";

  const expiry = !hasExpiry
    ? "No Expiry"
    : item.expiryDate
      ? formatDateDisplay(item.expiryDate)
      : "";

  return {
    id: item.id,
    title: item.title || "",
    desc: item.desc || "",
    emoji: item.emoji?.trim() || "🎁",
    type,
    expiry,
    startDate: startDate || undefined,
    link: item.buttonUrl?.trim() || undefined,
    buttonText: item.buttonText?.trim() || undefined,
    coupontext: item.couponCode?.trim() || undefined,
  };
}

export type DealsDiscountCardsWidgetProps = {
  sectionHeading?: string;
  items?: DealsDiscountCardItem[];
};

/**
 * Admin-authored deal/coupon cards (block editor). Same card layout as the live deals API widget.
 */
export default function DealsDiscountCardsWidget({
  sectionHeading,
  items = [],
}: DealsDiscountCardsWidgetProps) {
  const [filter, setFilter] = useState("All");

  const offers = useMemo(
    () =>
      (Array.isArray(items) ? items : [])
        .filter((it) => it && it.id)
        .map(mapCmsDealItemToOffer),
    [items]
  );

  const filteredOffers = useMemo(() => {
    const list =
      filter === "All"
        ? offers
        : offers.filter((o) => {
            if (filter === "Expired") return o.type === "Expired";
            if (filter === "Deal") return o.type === "Deal";
            if (filter === "Coupon") return o.type === "Coupon";
            return true;
          });
    return [...list].sort((a, b) => {
      const aEx = a.type === "Expired";
      const bEx = b.type === "Expired";
      if (aEx && !bEx) return 1;
      if (!aEx && bEx) return -1;
      return 0;
    });
  }, [offers, filter]);

  return (
    <section
      className="not-prose max-w-none px-1 py-4 sm:px-0 sm:py-6"
      aria-label="Deals and discounts"
    >
      {sectionHeading ? (
        <h2 className="mb-4 text-lg font-bold leading-snug text-gray-900 sm:mb-6 sm:text-xl">
          {sectionHeading}
        </h2>
      ) : null}
      <div
        className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3"
        role="toolbar"
        aria-label="Filter deals"
      >
        {["All", "Deal", "Coupon", "Expired"].map((type) => (
          <FilterButton
            key={type}
            label={type}
            active={filter === type}
            onClick={() => setFilter(type)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {filteredOffers.length > 0 ? (
          filteredOffers.map((offer) => (
            <DealsOfferCard key={String(offer.id)} offer={offer} />
          ))
        ) : (
          <p className="py-12 text-center text-gray-600">
            No deals to show for the selected filter.
          </p>
        )}
      </div>
    </section>
  );
}
