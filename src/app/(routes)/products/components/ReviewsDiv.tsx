import React, { useState } from "react";
import { useAuth } from "@/app/context/Auth";
import axios from "axios";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import ProductReviewsList from "./product-detail/ProductReviewsList";
import { getProductIdString, type ProductReviewRow } from "../lib/productReviewsClient";

function formatCompactCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export default function ReviewsDiv({
  product,
  reviewsDiv,
  isZoomed: _isZoomed,
  averageRating,
  totalReviews,
  reviewsCount,
  customerReviews,
  reviewsLoading,
  onReloadReviews,
}: {
  product: any;
  reviewsDiv: boolean;
  isZoomed: boolean;
  averageRating: number;
  totalReviews: number;
  reviewsCount: Record<number, number>;
  customerReviews: ProductReviewRow[];
  reviewsLoading: boolean;
  onReloadReviews: () => Promise<void>;
}) {
  const auth = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");

  const handleRatingChange = (index: number) => {
    if (!auth.user) return;
    setRating(index);
  };

  const handleSubmitReviews = async () => {
    if (!reviewText || rating === 0) return false;
    if (!auth.user) return false;

    const productId = getProductIdString(product);
    if (!productId) return false;

    const data = {
      fullName: `${auth.user.firstname} ${auth.user.lastname}`,
      userEmail: auth.user.email,
      rating,
      review: reviewText,
      productId,
    };

    try {
      const response = await axios.post(`${auth.ip}post/product/reviews`, {
        reviewDetails: data,
      });

      if (response.data.status === 201) {
        setReviewText("");
        setRating(0);
        await onReloadReviews();
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const summaryStarsFilled = Math.min(
    5,
    Math.max(0, Math.round(Number(averageRating) || 0))
  );

  return (
    <>
      {reviewsDiv && (
        <div className="px-5 py-6 sm:px-6 md:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Reviews
          </h2>
          <div className="mt-4 border-b border-gray-200" aria-hidden />

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-0">
            <div className="flex flex-col items-center text-center md:items-center md:border-r md:border-gray-200 md:pr-8">
              <p className="text-5xl font-bold tabular-nums text-gray-900 md:text-6xl">
                {(Number(averageRating) || 0).toFixed(1)}
              </p>
              <div
                className="mt-4 flex items-center justify-center gap-0.5"
                aria-label={`Average rating ${(Number(averageRating) || 0).toFixed(1)} out of 5`}
              >
                {[0, 1, 2, 3, 4].map((i) =>
                  i < summaryStarsFilled ? (
                    <StarSolidIcon
                      key={i}
                      className="h-8 w-8 text-primary md:h-9 md:w-9"
                    />
                  ) : (
                    <StarOutlineIcon
                      key={i}
                      className="h-8 w-8 text-primary md:h-9 md:w-9"
                      strokeWidth={1.5}
                    />
                  )
                )}
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {formatCompactCount(totalReviews)} ratings
              </p>
            </div>

            <div className="flex flex-col justify-center gap-4 md:pl-8">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviewsCount[star] || 0;
                const percent = totalReviews
                  ? (count / totalReviews) * 100
                  : 0;

                return (
                  <div
                    key={star}
                    className="flex items-center gap-3 text-sm md:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-9 shrink-0 text-right font-medium tabular-nums text-gray-900">
                      {star}.0
                    </span>
                    <span className="w-[5.5rem] shrink-0 text-xs text-gray-500 sm:w-28">
                      {formatCompactCount(count)} reviews
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {reviewsLoading ? (
            <p className="mt-10 text-center text-sm text-gray-500">
              Loading reviews...
            </p>
          ) : (
            <ProductReviewsList reviews={customerReviews} className="mt-10" />
          )}

          <div className="mt-10 border-t border-gray-100 pt-8">
            <h3 className="text-sm font-semibold text-gray-900">
              Write a review
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Your review is submitted for approval before it appears on the
              store.
            </p>

            <div
              className={`mt-3 flex items-center gap-0.5${
                auth.user ? "" : " pointer-events-none select-none"
              }`}
              aria-disabled={!auth.user}
            >
              {[...Array(5)].map((_, i) => (
                <StarSolidIcon
                  key={i}
                  onClick={() => handleRatingChange(i + 1)}
                  className={`h-6 w-6 ${
                    auth.user
                      ? `cursor-pointer ${
                          rating > i ? "text-primary" : "text-gray-300"
                        }`
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>

            <textarea
              rows={5}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={!auth.user}
              placeholder="Write review..."
              className="mt-3 w-full rounded-md border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <button
              type="button"
              onClick={() => void handleSubmitReviews()}
              disabled={!auth.user}
              className={`mt-3 w-full rounded-md py-2.5 text-sm font-medium transition ${
                auth.user
                  ? "bg-primary text-white hover:opacity-90"
                  : "cursor-not-allowed bg-gray-200 text-gray-500"
              }`}
            >
              {auth.user ? "Submit" : "Login required"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
