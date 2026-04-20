"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DealApiResponse, Offer } from "../../../../types";
import axiosInstance from "@/app/lib/axios";
import { DealsOfferCard, FilterButton } from "./DealsOfferCard";

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const mapDealToOffer = (deal: DealApiResponse): Offer => {
  const offerType = deal.isExpired ? "Expired" : deal.type;
  return {
    id: deal._id,
    title: deal.title,
    desc: deal.desc,
    type: offerType,
    expiry: deal.expiryText,
    startDate: formatDate(deal.startDate),
    emoji: deal.emoji,
    link: deal.link || undefined,
    buttonText: deal.buttonText || undefined,
    coupontext: deal.couponCode || undefined,
  };
};

/**
 * Live deals/coupons from `/get/active/deals` (same source as the legacy page).
 * Add this widget in Admin → Footer pages → Content blocks for the deals page.
 */
export default function ActiveDealsWidget() {
  const [filter, setFilter] = useState<string>("All");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosInstance.get("/get/active/deals");
      if (response.data?.deals) {
        setOffers(
          response.data.deals.map((deal: DealApiResponse) => mapDealToOffer(deal))
        );
      } else {
        setError("No deals found");
        setOffers([]);
      }
    } catch (err: unknown) {
      console.error("Error fetching deals:", err);
      const ax = err as { response?: { data?: { message?: string } } };
      setError(
        ax.response?.data?.message ||
          "Failed to load deals. Please try again later."
      );
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const filteredOffers = useMemo(() => {
    const filtered =
      filter === "All"
        ? offers
        : offers.filter((offer) => offer.type === filter);
    return [...filtered].sort((a, b) => {
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
      aria-label="Active deals and coupons"
    >
      <h2 className="mb-4 text-lg font-bold leading-snug text-gray-900 sm:mb-6 sm:text-xl">
        Next discount code, coupons, and promo codes
      </h2>
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

      {isLoading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-gray-600">Loading deals…</p>
        </div>
      ) : null}

      {error && !isLoading ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark"
            onClick={() => fetchDeals()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {filteredOffers.length > 0 ? (
            filteredOffers.map((offer) => (
              <DealsOfferCard key={String(offer.id)} offer={offer} />
            ))
          ) : (
            <p className="py-12 text-center text-gray-600">
              No deals found for the selected filter.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
