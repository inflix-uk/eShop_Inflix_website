"use client";

import { useState } from "react";
import type { IconType } from "react-icons";
import {
  SiVisa,
  SiMastercard,
  SiAmericanexpress,
  SiPaypal,
  SiApplepay,
  SiGooglepay,
  SiKlarna,
  SiStripe,
  SiDiscover,
  SiAmazonpay,
} from "react-icons/si";
import type { FooterPaymentLogo, FooterSectionPayments } from "./footerTypes";
import { activeInOrder, paymentIconKey } from "./footerLayout";

/** Shown when a payment method has a well-known name and no uploaded icon. */
const BUILT_IN_ICONS: Record<string, { Icon: IconType; color: string }> = {
  visa: { Icon: SiVisa, color: "#1a1f71" },
  mastercard: { Icon: SiMastercard, color: "#eb001b" },
  americanexpress: { Icon: SiAmericanexpress, color: "#2e77bc" },
  paypal: { Icon: SiPaypal, color: "#003087" },
  applepay: { Icon: SiApplepay, color: "#000000" },
  googlepay: { Icon: SiGooglepay, color: "#5f6368" },
  klarna: { Icon: SiKlarna, color: "#17120f" },
  stripe: { Icon: SiStripe, color: "#635bff" },
  discover: { Icon: SiDiscover, color: "#ff6000" },
  amazonpay: { Icon: SiAmazonpay, color: "#ff9900" },
};

type Props = {
  section: FooterSectionPayments | undefined;
  /** Turns a stored path into a full image URL; "" hides the image. */
  resolveImageUrl: (path: string) => string;
};

export default function FooterPaymentMethods({ section, resolveImageUrl }: Props) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  if (section?.isEnabled !== true) return null;

  const logos = activeInOrder<FooterPaymentLogo>(section.logos);
  const heading = section.heading?.trim() ?? "";
  const description = section.description?.trim() ?? "";
  if (!heading && !description && logos.length === 0) return null;

  return (
    <section
      aria-label={heading || "Payment methods"}
      className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        {heading ? (
          <h3 className="m-0 text-sm font-semibold uppercase tracking-wide text-[color:var(--footer-heading,#fff)]">
            {heading}
          </h3>
        ) : null}
        {description ? (
          <p className="m-0 max-w-2xl whitespace-pre-line text-[13px] leading-relaxed text-[color:var(--footer-text,#9ca3af)]">
            {description}
          </p>
        ) : null}
        {logos.length > 0 ? (
          <ul
            className="m-0 flex list-none flex-wrap items-center justify-center gap-2 p-0"
            role="list"
          >
            {logos.map((logo, index) => {
              const imageUrl = logo.image ? resolveImageUrl(logo.image) : "";
              const showImage = Boolean(imageUrl) && !failedImages.has(imageUrl);
              const builtIn = BUILT_IN_ICONS[paymentIconKey(logo)];

              return (
                <li
                  key={`${logo.name}-${index}`}
                  title={logo.name}
                  className="flex h-8 min-w-[50px] items-center justify-center rounded-md border border-gray-200 bg-white px-2"
                >
                  {showImage ? (
                    // Plain <img>: icons may come from any Media Library host.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={logo.name}
                      width={40}
                      height={24}
                      loading="lazy"
                      className="h-6 w-10 object-contain"
                      onError={() =>
                        setFailedImages((prev) => new Set(prev).add(imageUrl))
                      }
                    />
                  ) : builtIn ? (
                    <builtIn.Icon
                      role="img"
                      aria-label={logo.name}
                      className="h-6 w-9"
                      style={{ color: builtIn.color }}
                    />
                  ) : (
                    <span className="whitespace-nowrap text-[11px] font-semibold text-gray-800">
                      {logo.name}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
