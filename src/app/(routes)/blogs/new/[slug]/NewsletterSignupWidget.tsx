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
};

export default function NewsletterSignupWidget({
  heading = "Subscribe to our newsletter",
  description = "",
  placeholder: placeholderProp = DEFAULT_EMAIL_PLACEHOLDER,
  buttonLabel = "Subscribe",
  imageUrl = "",
  subscribeMode = "content_widget",
}: NewsletterWidgetProps) {
  const isFooterEmbed = subscribeMode === "footer_cms";
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
      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-lg backdrop-blur-sm sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {src ? (
            <div className="relative mx-auto w-full max-w-[11rem] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20 sm:mx-0 sm:w-24 md:w-28">
              <img
                src={src}
                alt=""
                loading="lazy"
                className="aspect-[4/3] h-auto w-full object-cover sm:aspect-auto sm:min-h-[5.5rem]"
              />
            </div>
          ) : null}

          <div className="min-w-0 w-full flex-1">
            <h3
              id="footer-newsletter-heading"
              className="text-base font-semibold tracking-tight text-white sm:text-lg"
            >
              {heading}
            </h3>
            {description ? (
              <p className="mt-1.5 break-words text-sm leading-relaxed text-white/70">
                {description}
              </p>
            ) : null}

            <form
              onSubmit={onSubmit}
              className="mt-3 flex w-full min-w-0 flex-col gap-2"
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
                className="h-11 w-full min-w-0 max-w-full rounded-xl border border-white/15 bg-black/25 px-3 text-sm text-white shadow-inner outline-none transition placeholder:text-white/40 focus:border-primary focus:ring-2 focus:ring-primary/35 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex h-11 w-full min-w-0 max-w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-md transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55"
              >
                {status === "loading" ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
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
                  ? "text-emerald-300"
                  : status === "error"
                    ? "text-red-300"
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
