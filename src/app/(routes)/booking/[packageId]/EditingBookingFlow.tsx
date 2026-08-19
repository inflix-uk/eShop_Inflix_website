"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  bookingService,
  BookingPackage,
  BookingPackageExtra,
  SelectedBookingExtra,
  StoredBookingData,
  getPackageUrlKey,
  isEditingPackage,
  resolveExtraPricing,
  isExtraPriceTbc,
  resolveWhatHappensNext,
  computeEditingTotal,
  resolveEditingExtraUnits,
  DEFAULT_WHAT_HAPPENS_NEXT,
  type BookingWhatHappensNext,
} from "../services/bookingService";
import {
  bookingModuleRootStyle,
  type BookingModuleUi,
} from "@/app/lib/bookingModuleThemeUtils";

const EPISODE_MAX = 20;
const LENGTH_OPTIONS = [60, 90] as const;
const DRAFT_KEY = "editingBookingDraft";

type FileSource = "studio" | "link";

type EditingDraft = {
  episodeCount: number;
  episodeLength: number;
  fileSource: FileSource;
  fileLink: string;
  fileLinkLater: boolean;
  extras: SelectedBookingExtra[];
  step: 1 | 2 | 3;
};

function toSelectedExtra(
  extra: BookingPackageExtra,
  index: number,
  quantity = 1
): SelectedBookingExtra {
  const pricing = resolveExtraPricing(extra);
  return {
    index,
    title: extra.title,
    price: pricing.unitPrice,
    image: extra.image,
    description: extra.description,
    quantity: Math.max(1, Math.floor(quantity) || 1),
    quantityEnabled: Boolean(extra.quantityEnabled),
    originalPrice: pricing.hasDiscount ? pricing.originalPrice : undefined,
    discountPercent: pricing.hasDiscount ? pricing.discountPercent : undefined,
    unitLabel: extra.unitLabel || "per episode",
    priceTbc: isExtraPriceTbc(extra),
  };
}

function coveredMinutes(pkg: BookingPackage): number {
  return Math.max(1, Math.floor(Number(pkg.durationMinutes) || 60));
}

function turnaroundDays(pkg: BookingPackage): number {
  const days = Math.floor(Number(pkg.turnaroundDays) || 0);
  return days > 0 ? days : 5;
}

function readDraft(): EditingDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EditingDraft;
  } catch {
    return null;
  }
}

type EditingBookingFlowProps = {
  pkg: BookingPackage;
  siblingPackages: BookingPackage[];
  bookingUi: BookingModuleUi;
};

export default function EditingBookingFlow({
  pkg,
  siblingPackages,
  bookingUi,
}: EditingBookingFlowProps) {
  const router = useRouter();
  const covered = coveredMinutes(pkg);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [episodeCount, setEpisodeCount] = useState(1);
  const [episodeLength, setEpisodeLength] = useState<number>(covered);
  const [fileSource, setFileSource] = useState<FileSource>("link");
  const [fileLink, setFileLink] = useState("");
  const [fileLinkLater, setFileLinkLater] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<SelectedBookingExtra[]>([]);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setStep(draft.step || 1);
      setEpisodeCount(Math.min(EPISODE_MAX, Math.max(1, draft.episodeCount || 1)));
      setEpisodeLength(
        draft.episodeLength && draft.episodeLength <= covered ? draft.episodeLength : covered
      );
      setFileSource(draft.fileSource || "link");
      setFileLink(draft.fileLink || "");
      setFileLinkLater(Boolean(draft.fileLinkLater));
      setSelectedExtras(draft.extras || []);
    }
    setDraftReady(true);
  }, [pkg._id, covered]);

  const packageExtras = pkg.extras?.filter((e) => e.title?.trim()) || [];
  const whatHappensNext: BookingWhatHappensNext = useMemo(
    () => resolveWhatHappensNext(pkg.whatHappensNext ?? DEFAULT_WHAT_HAPPENS_NEXT),
    [pkg.whatHappensNext]
  );

  const switcher = useMemo(() => {
    const list = siblingPackages
      .filter((p) => isEditingPackage(p) && p.isActive !== false)
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.price - b.price ||
          String(a.name).localeCompare(String(b.name))
      );
    if (!list.some((p) => p._id === pkg._id)) {
      return [pkg, ...list].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.price - b.price ||
          String(a.name).localeCompare(String(b.name))
      );
    }
    return list.length ? list : [pkg];
  }, [siblingPackages, pkg]);

  const lengthOver = episodeLength > covered;
  const upgradePkg = useMemo(() => {
    if (!lengthOver) return null;
    return (
      switcher
        .filter((p) => p._id !== pkg._id && coveredMinutes(p) >= episodeLength)
        .sort((a, b) => a.price - b.price)[0] || null
    );
  }, [lengthOver, switcher, pkg._id, episodeLength]);

  const pricing = useMemo(
    () => computeEditingTotal(pkg.price || 0, episodeCount, selectedExtras),
    [pkg.price, episodeCount, selectedExtras]
  );

  const days = turnaroundDays(pkg);
  const features = (pkg.features || []).map((f) => String(f).trim()).filter(Boolean);

  useEffect(() => {
    if (!draftReady) return;
    const next: EditingDraft = {
      episodeCount,
      episodeLength,
      fileSource,
      fileLink,
      fileLinkLater,
      extras: selectedExtras,
      step,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  }, [draftReady, episodeCount, episodeLength, fileSource, fileLink, fileLinkLater, selectedExtras, step]);

  const isExtraSelected = (index: number) => selectedExtras.some((e) => e.index === index);
  const getExtraQuantity = (index: number) =>
    Math.max(0, selectedExtras.find((e) => e.index === index)?.quantity || 0);

  const toggleExtra = (extra: BookingPackageExtra, index: number) => {
    if (isExtraPriceTbc(extra)) return;
    if (isExtraSelected(index)) {
      setSelectedExtras((prev) => prev.filter((e) => e.index !== index));
      return;
    }
    setSelectedExtras((prev) => [...prev, toSelectedExtra(extra, index, 1)]);
  };

  const setExtraQuantity = (extra: BookingPackageExtra, index: number, rawQty: number) => {
    if (isExtraPriceTbc(extra)) return;
    const next = Math.max(0, Math.min(EPISODE_MAX, Math.floor(Number(rawQty) || 0)));
    setSelectedExtras((prev) => {
      if (next <= 0) return prev.filter((e) => e.index !== index);
      const exists = prev.some((e) => e.index === index);
      if (exists) return prev.map((e) => (e.index === index ? { ...e, quantity: next } : e));
      return [...prev, toSelectedExtra(extra, index, next)];
    });
  };

  const filesSummary =
    fileSource === "studio"
      ? "recorded at the studio"
      : fileLinkLater
        ? "link within 48 hrs"
        : "files sent by link";

  const goCheckout = () => {
    if (lengthOver) {
      toast.warning("Choose an episode length this package covers, or switch package.");
      setStep(1);
      return;
    }

    const data: StoredBookingData = {
      packageId: pkg._id,
      packageName: pkg.name,
      packageType: pkg.type,
      packagePrice: pkg.price,
      packageDuration: pkg.durationMinutes,
      pricingMode: "fixed",
      slots: [],
      holdExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalPrice: pricing.totalPrice,
      selectedExtras,
      slotsSubtotal: pricing.slotsSubtotal,
      extrasSubtotal: pricing.extrasSubtotal,
      kind: "editing",
      episodeCount,
      episodeLengthMinutes: episodeLength,
      fileSource,
      fileLink: fileSource === "link" && !fileLinkLater ? fileLink.trim() : "",
      fileLinkLater: fileSource === "link" && fileLinkLater,
    };
    localStorage.setItem("bookingData", JSON.stringify(data));
    sessionStorage.removeItem(DRAFT_KEY);
    router.push("/checkout");
  };

  const primaryCta =
    step === 1
      ? {
          label: "Continue to add-ons",
          disabled: lengthOver,
          onClick: () => setStep(2),
        }
      : step === 2
        ? {
            label: "Continue to details",
            disabled: false,
            onClick: () => setStep(3),
          }
        : {
            label: `Pay ${bookingService.formatPrice(pricing.totalPrice)}`,
            disabled: false,
            onClick: goCheckout,
          };

  const lengthHint = lengthOver ? null : (
    <>
      {pkg.name} covers up to <b>{covered} minutes</b> of recording.
    </>
  );

  return (
    <div
      className="booking-module-root booking-flow-v3"
      style={bookingModuleRootStyle(bookingUi)}
    >
      <div className="bf-top">
        <div className="bf-wrap">
          <button type="button" className="bf-back" onClick={() => router.push("/booking")}>
            ‹ Back to Services
          </button>
        </div>
      </div>

      <div className="bf-wrap">
        <div className="bf-phead">
          <div>
            <p className="bf-phead-kick bf-mono">Editing</p>
            <h1>Book editing</h1>
          </div>
        </div>

        {switcher.length > 0 && (
          <div className="bf-pkswitch" role="group" aria-label="Choose an editing package">
            {switcher.map((p) => {
              const current = p._id === pkg._id;
              const mins = coveredMinutes(p);
              const sub = String(p.subtitle || "")
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              return (
                <button
                  key={p._id}
                  type="button"
                  className="bf-pk"
                  aria-pressed={current}
                  title={p.name}
                  onClick={() => {
                    if (current) return;
                    router.push(`/booking/${getPackageUrlKey(p)}`);
                  }}
                >
                  <b>{p.name}</b>
                  <span className="bf-pk__sub">{sub || "Per finished episode"}</span>
                  <u className="bf-pk__price">
                    {bookingService.formatPrice(p.price)} per episode · up to {mins} min
                  </u>
                </button>
              );
            })}
          </div>
        )}

        <p className="bf-steps-label">Booking progress</p>
        <ol className="bf-steps" aria-label="Booking progress">
          <li className={`bf-stp${step === 1 ? " is-on" : ""}${step > 1 ? " is-done" : ""}`}>
            <b aria-hidden="true">{step > 1 ? "✓" : "1"}</b>
            <span>Your episodes</span>
          </li>
          <li className={`bf-stp-line${step > 1 ? " is-done" : ""}`} aria-hidden="true" />
          <li className={`bf-stp${step === 2 ? " is-on" : ""}${step > 2 ? " is-done" : ""}`}>
            <b aria-hidden="true">{step > 2 ? "✓" : "2"}</b>
            <span>Add-ons</span>
          </li>
          <li className={`bf-stp-line${step > 2 ? " is-done" : ""}`} aria-hidden="true" />
          <li className={`bf-stp${step === 3 ? " is-on" : ""}`}>
            <b aria-hidden="true">3</b>
            <span>Details &amp; pay</span>
          </li>
        </ol>

        <div className="bf-grid">
          <main>
            {step === 1 && (
              <>
                <div className="bf-card">
                  <div className="bf-card-h">
                    <h2>{pkg.name}</h2>
                    <span className="bf-mono">Step 1</span>
                  </div>
                  <div className="bf-ctrl">
                    <div className="bf-crow">
                      <span className="bf-mono bf-clab">How many</span>
                      <div className="bf-qty" role="group" aria-label="Episode quantity">
                        <button
                          type="button"
                          className="bf-qty__btn"
                          aria-label="Fewer episodes"
                          disabled={episodeCount <= 1}
                          onClick={() => setEpisodeCount((n) => Math.max(1, n - 1))}
                        >
                          −
                        </button>
                        <span className="bf-qty__val">{episodeCount}</span>
                        <button
                          type="button"
                          className="bf-qty__btn"
                          aria-label="More episodes"
                          disabled={episodeCount >= EPISODE_MAX}
                          onClick={() => setEpisodeCount((n) => Math.min(EPISODE_MAX, n + 1))}
                        >
                          +
                        </button>
                      </div>
                      <span className="bf-cnote">
                        Priced per finished episode
                        {days > 0 ? (
                          <>
                            {" · "}
                            back in about <b>{days} working days</b>
                          </>
                        ) : null}
                      </span>
                    </div>

                    <div className="bf-crow">
                      <span className="bf-mono bf-clab">Episode length</span>
                      <div className="bf-copts">
                        {LENGTH_OPTIONS.map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            className="bf-chip"
                            aria-pressed={episodeLength === mins}
                            onClick={() => setEpisodeLength(mins)}
                          >
                            Up to {mins} min
                          </button>
                        ))}
                      </div>
                      {lengthHint ? <span className="bf-cnote">{lengthHint}</span> : null}
                    </div>

                    {lengthOver && (
                      <div className="bf-hint bf-hint--warn" role="status">
                        <b>
                          {episodeLength}-minute episodes need a bigger package. {pkg.name} covers
                          up to {covered} min.
                          {upgradePkg
                            ? ` ${upgradePkg.name} covers up to ${coveredMinutes(upgradePkg)} min at ${bookingService.formatPrice(upgradePkg.price)} per episode.`
                            : ""}
                        </b>
                        {upgradePkg ? (
                          <button
                            type="button"
                            className="bf-hint__btn"
                            onClick={() => router.push(`/booking/${getPackageUrlKey(upgradePkg)}`)}
                          >
                            Switch to {upgradePkg.name.replace(/ editing/i, "")}
                          </button>
                        ) : null}
                      </div>
                    )}

                    <div className="bf-crow">
                      <span className="bf-mono bf-clab">Your files</span>
                      <div className="bf-copts">
                        <button
                          type="button"
                          className="bf-chip"
                          aria-pressed={fileSource === "studio"}
                          onClick={() => setFileSource("studio")}
                        >
                          Recorded at the studio
                        </button>
                        <button
                          type="button"
                          className="bf-chip"
                          aria-pressed={fileSource === "link"}
                          onClick={() => setFileSource("link")}
                        >
                          I&apos;ll send a link
                        </button>
                      </div>
                      <span className="bf-cnote">
                        {fileSource === "studio"
                          ? "We’ll use the recording from your studio session."
                          : "Google Drive, Dropbox or WeTransfer — paste the link on the details step."}
                      </span>
                    </div>
                  </div>
                </div>

                {features.length > 0 && (
                  <div className="bf-card bf-included">
                    <div className="bf-card-h">
                      <h2>What&apos;s included</h2>
                      <span className="bf-mono">{pkg.name}</span>
                    </div>
                    <ul className="bf-included-grid">
                      {features.map((feature) => (
                        <li key={feature}>
                          <i aria-hidden="true">✓</i>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <div className="bf-card">
                <div className="bf-card-h">
                  <h2>Add-ons</h2>
                  <span className="bf-mono">Optional</span>
                </div>
                {packageExtras.length === 0 ? (
                  <p className="bf-empty">No add-ons on this package.</p>
                ) : (
                  packageExtras.map((extra, index) => {
                    const selected = isExtraSelected(index);
                    const quantityEnabled = Boolean(extra.quantityEnabled);
                    const qty = getExtraQuantity(index);
                    const extraPricing = resolveExtraPricing(extra);
                    const tbc = isExtraPriceTbc(extra);
                    const unit = extra.unitLabel || "per episode";
                    return (
                      <div key={`${extra.title}-${index}`} className="bf-xrow">
                        <div className={`bf-xthumb${extra.image ? "" : " ico"}`}>
                          {extra.image ? (
                            <img
                              src={bookingService.resolveImageUrl(extra.image)}
                              alt={extra.title}
                            />
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                              <path d="M12 3v18M3 12h18" />
                            </svg>
                          )}
                        </div>
                        <div className="bf-xinfo">
                          <b>{extra.title}</b>
                          {extra.description ? <span>{extra.description}</span> : null}
                        </div>
                        <div className="bf-xprice">
                          {tbc ? (
                            "Price TBC"
                          ) : (
                            <>
                              {extraPricing.hasDiscount ? (
                                <span className="bf-xwas">
                                  {bookingService.formatPrice(extraPricing.originalPrice)}
                                </span>
                              ) : null}
                              +{bookingService.formatPrice(extraPricing.unitPrice)}
                            </>
                          )}
                          <small>{unit}</small>
                        </div>
                        {tbc ? (
                          <span className="bf-xadd bf-xadd--off">Add</span>
                        ) : quantityEnabled ? (
                          <div className="bf-xqty" role="group" aria-label={`${extra.title} quantity`}>
                            <button
                              type="button"
                              className="bf-xqty__btn"
                              onClick={() => setExtraQuantity(extra, index, qty - 1)}
                            >
                              −
                            </button>
                            <span className="bf-xqty__val">{qty}</span>
                            <button
                              type="button"
                              className="bf-xqty__btn"
                              onClick={() => setExtraQuantity(extra, index, qty + 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="bf-xadd"
                            aria-pressed={selected}
                            onClick={() => toggleExtra(extra, index)}
                          >
                            {selected ? "Added" : "Add"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {step === 3 && (
              <div className="bf-card">
                <div className="bf-card-h">
                  <h2>Where are your files?</h2>
                  <span className="bf-mono">Required to start</span>
                </div>
                {fileSource === "studio" ? (
                  <p className="bf-cnote bf-cnote--block">
                    You chose a studio recording. We’ll pull the files from that session — no link
                    needed.
                  </p>
                ) : (
                  <>
                    <div className="bf-crow">
                      <span className="bf-mono bf-clab">Send them</span>
                      <div className="bf-copts">
                        <button
                          type="button"
                          className="bf-chip"
                          aria-pressed={!fileLinkLater}
                          onClick={() => setFileLinkLater(false)}
                        >
                          I have a link now
                        </button>
                        <button
                          type="button"
                          className="bf-chip"
                          aria-pressed={fileLinkLater}
                          onClick={() => setFileLinkLater(true)}
                        >
                          I&apos;ll send it within 48 hrs
                        </button>
                      </div>
                    </div>
                    {!fileLinkLater && (
                      <div className="bf-field">
                        <label className="bf-mono bf-clab" htmlFor="editing-file-link">
                          Link to your files
                        </label>
                        <input
                          id="editing-file-link"
                          type="text"
                          value={fileLink}
                          onChange={(e) => setFileLink(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="bf-input"
                        />
                        <p className="bf-cnote">
                          Set sharing to “anyone with the link can view” on Google Drive, Dropbox or
                          WeTransfer.
                        </p>
                      </div>
                    )}
                    {fileLinkLater && (
                      <div className="bf-hint" role="note">
                        <b>No rush.</b> We’ll email you a reminder. Your place in the queue is held
                        for 48 hours.
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </main>

          <aside>
            <div className="bf-sum">
              <div className="bf-sum-h">
                <p className="bf-mono">Your order</p>
                <b>{pkg.name}</b>
                <span>
                  {episodeCount} episode{episodeCount === 1 ? "" : "s"} · {filesSummary}
                </span>
              </div>
              <div className="bf-sum-b">
                <div className="bf-sline">
                  <span className="l">
                    {pkg.name}
                    <em>
                      {episodeCount} episode{episodeCount === 1 ? "" : "s"} ×{" "}
                      {bookingService.formatPrice(pkg.price)} — up to {episodeLength} min each
                    </em>
                  </span>
                  <span className="v">{bookingService.formatPrice(pricing.slotsSubtotal)}</span>
                </div>
                <div className="bf-sline">
                  <span className="l">
                    Your files
                    <em>{fileSource === "studio" ? "Studio recording" : "Link"}</em>
                  </span>
                  <span className="v">{fileSource === "studio" ? "Studio" : "Link"}</span>
                </div>
                {selectedExtras.map((extra) => {
                  const qty = Math.max(1, Math.floor(Number(extra.quantity) || 1));
                  const units = resolveEditingExtraUnits(extra.unitLabel, episodeCount, qty);
                  const line = Math.round((extra.price || 0) * units * 100) / 100;
                  return (
                    <div key={`${extra.index}-${extra.title}`} className="bf-sline added">
                      <span className="l">
                        {extra.title}
                        <em>
                          {qty > 1 ? `${qty} × ` : ""}
                          {bookingService.formatPrice(extra.price)} {extra.unitLabel || "per episode"}
                        </em>
                      </span>
                      <span className="v">{bookingService.formatPrice(line)}</span>
                      <button
                        type="button"
                        className="bf-srm"
                        aria-label={`Remove ${extra.title}`}
                        onClick={() =>
                          setSelectedExtras((prev) => prev.filter((e) => e.index !== extra.index))
                        }
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="bf-sum-total">
                <span className="l">Total</span>
                <span className="v">{bookingService.formatPrice(pricing.totalPrice)}</span>
              </div>
              <div className="bf-sum-cta">
                <button
                  type="button"
                  className="bf-btn"
                  disabled={primaryCta.disabled}
                  onClick={primaryCta.onClick}
                >
                  {primaryCta.label}
                </button>
                {step > 1 ? (
                  <button
                    type="button"
                    className="bf-btn bf-btn--quiet"
                    onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                  >
                    ‹ Back a step
                  </button>
                ) : null}
              </div>
              <div
                className={`bf-next${
                  whatHappensNext.listStyle === "bullets" ? " bf-next--bullets" : ""
                }`}
              >
                <p>{whatHappensNext.heading || "What happens next"}</p>
                {(whatHappensNext.items || []).map((item, index) => (
                  <div key={`what-next-${index}`}>
                    <i>
                      {whatHappensNext.listStyle === "bullets"
                        ? "•"
                        : String(index + 1).padStart(2, "0")}
                    </i>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
