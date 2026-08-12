"use client";

import { useState, useCallback, useId, useRef } from "react";
import { useAuth } from "@/app/context/Auth";
import { getFullImageUrl } from "./blogUtils";

const DEFAULT_EMAIL_PLACEHOLDER = "Enter your email";
/** Placeholders that must never be shown (e.g. mistaken personal emails saved as CMS text). */
const BLOCKED_NEWSLETTER_PLACEHOLDERS = new Set([
  "malikoffical32@gmail.com",
]);

function resolveNewsletterPlaceholder(raw?: string): string {
  const s = (raw ?? "").trim();
  if (!s) return DEFAULT_EMAIL_PLACEHOLDER;
  if (BLOCKED_NEWSLETTER_PLACEHOLDERS.has(s.toLowerCase())) {
    return DEFAULT_EMAIL_PLACEHOLDER;
  }
  return s;
}

export type NewsletterWidgetProps = {
  heading?: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
  imageUrl?: string;
  subscribeMode?: string;
  /** Navbar variant from DB (e.g. "podcast") for conditional button styling. */
  navbarVariant?: string;
};

export default function NewsletterSignupWidget({
  heading = "Subscribe to our newsletter",
  description = "",
  placeholder: placeholderProp = DEFAULT_EMAIL_PLACEHOLDER,
  buttonLabel = "Subscribe",
  imageUrl = "",
  subscribeMode = "content_widget",
  navbarVariant,
}: NewsletterWidgetProps) {
  const isFooterEmbed = subscribeMode === "footer_cms";
  const isPodcastSite = navbarVariant?.toLowerCase() === "podcast";
  const placeholder = resolveNewsletterPlaceholder(placeholderProp);
  const auth = useAuth();
  const emailFieldId = useId();
  const messageId = useId();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const submitLockRef = useRef(false);

  const src = imageUrl ? getFullImageUrl(imageUrl) : "";

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = email.trim();
      if (!trimmed) {
        setMessage("Please enter your email.");
        setStatus("error");
        return;
      }

      if (submitLockRef.current) return;
      submitLockRef.current = true;

      setStatus("loading");
      setMessage("");

      const fullName = auth?.user
        ? `${auth?.user?.firstname ?? ""} ${auth?.user?.lastname ?? ""}`.trim() || null
        : null;

      const baseRaw =
        auth?.ip?.trim() ||
        `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")}/`;
      const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`;
      const url = `${base}newsletter/subscribers`;

      type Outcome = "success" | "duplicate" | "bad" | "network";
      let outcome: Outcome = "bad";
      let errMsg = "Something went wrong. Try again.";

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email: trimmed,
            mode: subscribeMode,
          }),
        });

        const text = await res.text();
        let data: { message?: string; status?: number | string } = {};
        if (text) {
          try {
            data = JSON.parse(text) as typeof data;
          } catch {
            data = {};
          }
        }

        const bodyStatus = Number(data.status);
        const msg =
          typeof data.message === "string" ? data.message.trim() : "";

        const subscribedByBody =
          bodyStatus === 201 ||
          msg.toLowerCase() === "newsletter subscribed successfully" ||
          /subscribed successfully/i.test(msg);

        if (res.ok || subscribedByBody) {
          outcome = "success";
        } else if (res.status === 400) {
          outcome = "duplicate";
          errMsg = msg || "This email is already subscribed.";
        }
      } catch {
        outcome = "network";
      } finally {
        submitLockRef.current = false;
      }

      if (outcome === "success") {
        setEmail("");
        setStatus("success");
        setMessage("Thanks — you're subscribed!");
        return;
      }
      if (outcome === "duplicate") {
        setStatus("error");
        setMessage(errMsg);
        return;
      }
      setStatus("error");
      setMessage(errMsg);
    },
    [auth?.ip, auth?.user, email, subscribeMode]
  );

  if (isFooterEmbed) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <h3
          id="footer-newsletter-heading"
          className="m-0 mb-1 text-sm font-semibold uppercase tracking-wide text-white"
        >
          {heading}
        </h3>
        {description ? (
          <p className="mb-2.5 text-[13px] leading-relaxed text-gray-400">
            {description}
          </p>
        ) : null}

        <form
          onSubmit={onSubmit}
          className="flex w-full min-w-0 flex-col gap-1.5"
          noValidate
        >
          <label htmlFor={emailFieldId} className="sr-only">
            Email address
          </label>
          <input
            id={emailFieldId}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            disabled={status === "loading"}
            aria-invalid={status === "error"}
            aria-describedby={message ? messageId : undefined}
            className="h-9 w-full min-w-0 max-w-full rounded-md border border-gray-600 bg-gray-800 px-2.5 text-[13px] text-white outline-none transition placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex h-9 w-full min-w-0 max-w-full items-center justify-center rounded-md px-3 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-55 hover:opacity-90"
            style={{
              backgroundColor: isPodcastSite ? "#c2fc12" : "#ffffff",
              color: isPodcastSite ? "#0a0f0a" : "#111827",
            }}
          >
            {status === "loading" ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
                  aria-hidden
                />
                <span className="sr-only">Loading</span>
              </span>
            ) : (
              buttonLabel
            )}
          </button>
        </form>

        {message ? (
          <div
            id={messageId}
            role="status"
            aria-live="polite"
            className={`mt-2 text-xs ${
              status === "success"
                ? "text-emerald-400"
                : status === "error"
                  ? "text-red-400"
                  : ""
            }`}
          >
            {message}
          </div>
        ) : null}
      </div>
    );
  }

  /* Homepage, blog CMS, etc. — light card */
  return (
    <div className="mx-auto my-6 w-full max-w-7xl rounded-2xl border border-gray-200/90 bg-gradient-to-br from-white via-white to-gray-50/90 p-5 shadow-md ring-1 ring-black/[0.03] sm:my-8 sm:p-7">
      <div
        className={
          src
            ? "flex flex-col gap-6 md:flex-row md:items-stretch md:gap-8"
            : "flex flex-col"
        }
      >
        {src ? (
          <div className="relative min-h-[10rem] w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 md:aspect-video md:max-w-md md:flex-1">
            <img
              src={src}
              alt=""
              loading="lazy"
              className="h-40 w-full object-cover md:absolute md:inset-0 md:h-full"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h3 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            {heading}
          </h3>
          {description ? (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-gray-600 sm:text-base">
              {description}
            </p>
          ) : null}

          <form
            onSubmit={onSubmit}
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3"
            noValidate
          >
            <label htmlFor={emailFieldId} className="sr-only">
              Email address
            </label>
            <input
              id={emailFieldId}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              disabled={status === "loading"}
              aria-invalid={status === "error"}
              aria-describedby={message ? messageId : undefined}
              className="h-12 w-full min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:bg-gray-50 disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55 sm:min-w-[9rem]"
            >
              {status === "loading" ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                    aria-hidden
                  />
                  <span className="sr-only">Loading</span>
                  <span aria-hidden>Please wait</span>
                </span>
              ) : (
                buttonLabel
              )}
            </button>
          </form>

          <div
            id={messageId}
            role="status"
            aria-live="polite"
            className={`mt-3 min-h-[1.25rem] text-sm ${
              status === "success"
                ? "text-emerald-700"
                : status === "error"
                  ? "text-red-600"
                  : "text-transparent"
            }`}
          >
            {message || "\u00a0"}
          </div>
        </div>
      </div>
    </div>
  );
}
