"use client";

import { useState, useEffect, FC } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/solid";
import CookieImage from "@/app/assets/cookie.png";
import Image from "next/image";
import { dispatchCookieConsentUpdated } from "@/app/lib/cookieConsent";

interface Preferences {
  necessary: boolean;
  performance: boolean;
  targeting: boolean;
}

function PreferenceToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`relative inline-flex shrink-0 items-center ${
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="relative inline-block h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-60 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

const CookieConsent: FC = () => {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    necessary: true,
    performance: false,
    targeting: false,
  });

  const handlePreferenceChange = (type: keyof Preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  useEffect(() => {
    const consent = Cookies.get("cookieConsent");
    if (!consent) setVisible(true);

    setPreferences({
      necessary: true,
      performance: Cookies.get("performance") === "true",
      targeting: Cookies.get("targeting") === "true",
    });
  }, []);

  const handleAccept = () => {
    Cookies.set("cookieConsent", "accepted", { expires: 365 });
    const prefs: Preferences = {
      necessary: true,
      performance: true,
      targeting: true,
    };
    Cookies.set("performance", "true", { expires: 365 });
    Cookies.set("targeting", "true", { expires: 365 });
    setPreferences(prefs);
    setShowPreferences(false);
    setVisible(false);
    dispatchCookieConsentUpdated();
  };

  const handleReject = () => {
    Cookies.set("cookieConsent", "rejected", { expires: 365 });
    const prefs: Preferences = {
      necessary: true,
      performance: false,
      targeting: false,
    };
    Cookies.set("performance", "false", { expires: 365 });
    Cookies.set("targeting", "false", { expires: 365 });
    setPreferences(prefs);
    setShowPreferences(false);
    setVisible(false);
    dispatchCookieConsentUpdated();
  };

  const savePreferences = (prefs: Preferences) => {
    Cookies.set("performance", String(prefs.performance), { expires: 365 });
    Cookies.set("targeting", String(prefs.targeting), { expires: 365 });
    setPreferences(prefs);
    setShowPreferences(false);
    dispatchCookieConsentUpdated();
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="cookie-banner fixed inset-x-0 bottom-0 z-50 pointer-events-none"
        role="dialog"
        aria-label="Cookie consent"
      >
        <div className="relative pointer-events-auto flex w-full flex-col gap-4 overflow-hidden border border-b-0 border-gray-200/90 bg-white/95 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-6 px-4 py-4 sm:px-5">
          <button
            onClick={handleClose}
            type="button"
            className="absolute right-0 top-3 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-start gap-3 pr-8 sm:items-center sm:pr-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200/80">
              <Image
                src={CookieImage}
                alt=""
                className="h-7 w-7"
                width={28}
                height={28}
                aria-hidden
              />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                We value your privacy
              </p>
              <p className="text-sm leading-relaxed text-gray-600">
                We use cookies to improve your experience, analyze traffic, and
                personalize content.{" "}
                <Link
                  href="/privacy-policy"
                  className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2 transition hover:decoration-gray-900"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 pr-10 sm:w-auto sm:flex-row sm:items-center sm:pr-20">
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="order-3 w-full whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:order-1 sm:w-auto"
            >
              Manage preferences
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="order-2 w-full whitespace-nowrap rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-center text-sm font-medium text-gray-800 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:order-2 sm:w-auto"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="order-1 w-full whitespace-nowrap rounded-xl bg-gray-900 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:order-3 sm:w-auto"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>

      {showPreferences && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowPreferences(false)}
        >
          <div
            className="relative max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl"
            role="dialog"
            aria-labelledby="cookie-preferences-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200/80">
                  <Image
                    src={CookieImage}
                    alt=""
                    width={24}
                    height={24}
                    className="h-6 w-6"
                    aria-hidden
                  />
                </div>
                <div>
                  <h2
                    id="cookie-preferences-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    Cookie preferences
                  </h2>
                  <p className="text-xs text-gray-500">
                    Choose which cookies we may use
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close preferences"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <p className="text-sm leading-relaxed text-gray-600">
                We use cookies to optimize website functionality, analyze
                performance, and provide a personalized experience. Essential
                cookies are required for the site to work and cannot be turned
                off.
              </p>

              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Strictly necessary
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      Required for core features such as security and
                      accessibility. Always active.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/80">
                    Always on
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 transition hover:border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Performance
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      Help us understand how visitors use the site so we can
                      improve speed and usability.
                    </p>
                  </div>
                  <PreferenceToggle
                    checked={preferences.performance}
                    onChange={() => handlePreferenceChange("performance")}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 transition hover:border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Targeting
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">
                      Used to show more relevant offers and measure campaign
                      effectiveness.
                    </p>
                  </div>
                  <PreferenceToggle
                    checked={preferences.targeting}
                    onChange={() => handlePreferenceChange("targeting")}
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/90 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                onClick={() => savePreferences(preferences)}
              >
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;
