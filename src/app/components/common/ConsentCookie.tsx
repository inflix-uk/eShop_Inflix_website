"use client";

import { useState, useEffect, FC } from "react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/solid";
import CookieImage from "@/app/assets/cookie.png";
import Image from "next/image";
import {
  OPEN_CONSENT_SETTINGS_EVENT,
  acceptAllConsent,
  getConsentPreferences,
  rejectAllConsent,
  saveConsentPreferences,
} from "@/app/lib/cookieConsent";
import {
  applyGoogleConsentMode,
  setDefaultConsentMode,
} from "@/app/lib/consentMode";

interface Preferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
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
      <span className="relative inline-block h-6 w-11 rounded-full bg-neutral-300 transition-colors peer-checked:bg-black peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-2 peer-disabled:opacity-60 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-400 after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

/**
 * Original bottom-banner UI + preferences overlay.
 * Consent storage / Consent Mode still use analytics + marketing cookies.
 * Uses `.cookie-consent-ui` black/white chrome so CMS tag colors cannot wash out text.
 */
const CookieConsent: FC = () => {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  const syncFromCookies = () => {
    const prefs = getConsentPreferences();
    setPreferences({
      necessary: true,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
    });
    return prefs;
  };

  useEffect(() => {
    try {
      setDefaultConsentMode();
    } catch {
      /* non-fatal */
    }

    const prefs = syncFromCookies();
    if (!prefs.hasChoice) {
      setVisible(true);
    } else {
      applyGoogleConsentMode(prefs.analytics, prefs.marketing);
    }

    const onOpenSettings = () => {
      syncFromCookies();
      setVisible(true);
      setShowPreferences(true);
    };
    window.addEventListener(OPEN_CONSENT_SETTINGS_EVENT, onOpenSettings);
    return () => {
      window.removeEventListener(OPEN_CONSENT_SETTINGS_EVENT, onOpenSettings);
    };
  }, []);

  const applyConsentUi = (analytics: boolean, marketing: boolean) => {
    applyGoogleConsentMode(analytics, marketing);
    setShowPreferences(false);
    setVisible(false);
  };

  const handleAccept = () => {
    acceptAllConsent();
    applyConsentUi(true, true);
  };

  const handleReject = () => {
    rejectAllConsent();
    applyConsentUi(false, false);
  };

  const handleSavePreferences = () => {
    saveConsentPreferences({
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    });
    applyConsentUi(preferences.analytics, preferences.marketing);
  };

  const handleClose = () => {
    setVisible(false);
    setShowPreferences(false);
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="cookie-banner cookie-consent-ui fixed inset-x-0 bottom-0 z-50 pointer-events-none"
        role="dialog"
        aria-label="Cookie consent"
      >
        <div className="relative pointer-events-auto flex w-full flex-col gap-4 overflow-hidden border border-b-0 border-neutral-200 bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 px-4 py-4 sm:px-5">
          <button
            onClick={handleClose}
            type="button"
            className="absolute right-0 top-3 rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-start gap-3 pr-8 sm:items-center sm:pr-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 ring-1 ring-neutral-200">
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
              <p className="cookie-consent-title text-sm font-semibold text-black">
                We value your privacy
              </p>
              <p className="cookie-consent-body text-sm leading-relaxed text-neutral-700">
                We use cookies to improve your experience, analyze traffic, and
                personalize content.{" "}
                <Link
                  href="/privacy-policy"
                  className="font-medium text-black underline decoration-neutral-400 underline-offset-2 transition hover:decoration-black"
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
              className="cookie-consent-btn-secondary order-3 w-full whitespace-nowrap rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-black transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:order-1 sm:w-auto"
            >
              Manage preferences
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="cookie-consent-btn-secondary order-2 w-full whitespace-nowrap rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-black transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:order-2 sm:w-auto"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="cookie-consent-btn-primary order-1 w-full whitespace-nowrap rounded-xl bg-black px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:order-3 sm:w-auto"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>

      {showPreferences && (
        <div
          className="cookie-consent-ui fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setShowPreferences(false)}
        >
          <div
            className="relative max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl"
            role="dialog"
            aria-labelledby="cookie-preferences-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 ring-1 ring-neutral-200">
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
                    className="cookie-consent-title text-lg font-semibold text-black"
                  >
                    Cookie preferences
                  </h2>
                  <p className="cookie-consent-muted text-xs text-neutral-600">
                    Choose which cookies we may use
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
                aria-label="Close preferences"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <p className="cookie-consent-body text-sm leading-relaxed text-neutral-700">
                We use cookies to optimize website functionality, analyze
                performance, and provide a personalized experience. Essential
                cookies are required for the site to work and cannot be turned
                off.
              </p>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="cookie-consent-title text-sm font-medium text-black">
                      Strictly necessary
                    </p>
                    <p className="cookie-consent-muted mt-1 text-xs leading-relaxed text-neutral-600">
                      Required for core features such as security and
                      accessibility. Always active.
                    </p>
                  </div>
                  <span className="cookie-consent-badge shrink-0 rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-black">
                    Always on
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="cookie-consent-title text-sm font-medium text-black">
                      Performance
                    </p>
                    <p className="cookie-consent-muted mt-1 text-xs leading-relaxed text-neutral-600">
                      Help us understand how visitors use the site so we can
                      improve speed and usability.
                    </p>
                  </div>
                  <PreferenceToggle
                    checked={preferences.analytics}
                    onChange={() =>
                      setPreferences((p) => ({ ...p, analytics: !p.analytics }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="cookie-consent-title text-sm font-medium text-black">
                      Targeting
                    </p>
                    <p className="cookie-consent-muted mt-1 text-xs leading-relaxed text-neutral-600">
                      Used to show more relevant offers and measure campaign
                      effectiveness.
                    </p>
                  </div>
                  <PreferenceToggle
                    checked={preferences.marketing}
                    onChange={() =>
                      setPreferences((p) => ({ ...p, marketing: !p.marketing }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="cookie-consent-btn-secondary rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Cancel
              </button>
              <button
                type="button"
                className="cookie-consent-btn-primary rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                onClick={handleSavePreferences}
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
