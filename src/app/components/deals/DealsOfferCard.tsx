"use client";

import Link from "next/link";
import { useState } from "react";
import type { Offer } from "../../../../types";

export function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] w-full rounded-md px-3 py-2 text-sm font-medium transition sm:w-auto sm:px-4 sm:text-base ${
        active
          ? "bg-primary text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

export function DealsOfferCard({ offer }: { offer: Offer }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (coupontext: string) => {
    try {
      await navigator.clipboard.writeText(coupontext);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const actionBase =
    "flex min-h-[44px] w-full items-center justify-center rounded-md px-4 py-2.5 text-center text-sm font-medium shadow sm:inline-flex sm:w-auto sm:py-2 sm:text-base";

  return (
    <div
      className={`flex flex-col gap-4 rounded-lg border p-4 shadow-md md:flex-row md:items-center md:justify-between md:gap-6 md:p-6 ${
        offer.type === "Expired" ? "bg-gray-100" : "bg-white"
      }`}
    >
      <div
        className="flex shrink-0 select-none justify-center text-5xl leading-none md:justify-start md:text-4xl"
        aria-hidden
      >
        {offer.emoji}
      </div>
      <div className="min-w-0 flex-1 text-center md:text-left">
        <h3 className="break-words text-base font-bold sm:text-lg">{offer.title}</h3>
        <p className="mt-1 break-words text-sm font-medium text-gray-500 sm:text-base">
          {offer.desc}
        </p>
        <div className="mt-3 space-y-1 text-xs text-gray-500 sm:text-sm">
          {offer.startDate ? <p>Starts: {offer.startDate}</p> : null}
          <p>Expires: {offer.expiry}</p>
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col items-stretch md:ml-0 md:w-auto md:items-end">
        {offer.type === "Expired" ? (
          <button
            type="button"
            className={`${actionBase} cursor-not-allowed bg-gray-400 text-white`}
            disabled
          >
            Expired
          </button>
        ) : offer.type === "Coupon" && offer.coupontext ? (
          <button
            type="button"
            className={`${actionBase} bg-primary text-white hover:bg-secondary-dark`}
            onClick={() => handleCopy(offer.coupontext!)}
          >
            {isCopied ? "Copied!" : offer.coupontext}
          </button>
        ) : offer.type === "Deal" && offer.link ? (
          <Link
            href={offer.link}
            className={`${actionBase} bg-primary text-white hover:bg-primary-dark`}
          >
            {offer.buttonText || "GET DEAL"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
