"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  bookingService,
  BookingPackage,
  BookingPackageExtra,
  BookingSettings,
  TimeSlot,
  SlotHold,
  SelectedBookingSlot,
  SelectedBookingExtra,
  SelectedEditingAddOn,
  StoredBookingData,
  getPackageUrlKey,
  isEditingPackage,
  isFixedPricePackage,
  resolveMaxHours,
  resolveBillableUnits,
  resolveExtraPricing,
  resolveWhatHappensNext,
  DEFAULT_WHAT_HAPPENS_NEXT,
  type BookingWhatHappensNext,
  type DayAvailabilityStatus,
  type MonthAvailabilityDay,
} from "../services/bookingService";
import {
  bookingModuleRootStyle,
  resolveBookingModuleUi,
  type BookingModuleUi,
} from "@/app/lib/bookingModuleThemeUtils";
import { formatDuration } from "../utils/formatDuration";
import BookingFlowLoading from "../components/BookingFlowLoading";
import "./booking-flow.css";
import "../components/booking-package-cards.css";

const LoadingBar = dynamic(() => import("react-top-loading-bar"), { ssr: false });

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DURATION_OPTIONS = [
  { hrs: 1, label: "1 hr" },
  { hrs: 2, label: "2 hrs" },
  { hrs: 3, label: "3 hrs" },
  { hrs: 4, label: "Half day" },
  { hrs: 6, label: "6 hrs" },
] as const;

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function slotKey(date: string, startTime: string) {
  return `${date}|${startTime}`;
}

const EXTRA_QTY_MAX = 9;

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
  };
}

/**
 * Re-price extras restored from storage against the live catalog, so a discount
 * the admin has since changed can never be shown or charged from a stale copy.
 */
function repriceStoredExtras(
  stored: SelectedBookingExtra[],
  catalog: BookingPackageExtra[] = []
): SelectedBookingExtra[] {
  return stored.map((entry) => {
    const byIndex = catalog[entry.index];
    const match =
      byIndex?.title === entry.title
        ? byIndex
        : catalog.find((item) => item.title === entry.title);
    if (!match) return entry;
    return { ...entry, ...toSelectedExtra(match, entry.index, entry.quantity || 1) };
  });
}

function stripHtmlText(html: string): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editingIconPath(index: number): string {
  // 0 Standard (list), 1 Advanced (equal lines), 2+ Premium (plus)
  if (index === 0) return "M4 6h12M4 12h8M4 18h4";
  if (index === 1) return "M4 7h16M4 12h16M4 17h16";
  return "M12 5v14M5 12h14";
}

function normalizeStoredBooking(parsed: StoredBookingData): StoredBookingData | null {
  if (!parsed.packageId || !parsed.holdExpiresAt) return null;

  if (parsed.slots?.length) return parsed;

  if (parsed.holdId && parsed.date && parsed.startTime && parsed.endTime) {
    return {
      ...parsed,
      slots: [{ date: parsed.date, startTime: parsed.startTime, endTime: parsed.endTime, holdId: parsed.holdId }],
      holdIds: [parsed.holdId],
      totalPrice: parsed.totalPrice ?? parsed.packagePrice ?? 0,
    };
  }

  return null;
}

function getStoredBookingForPackage(packageId: string): StoredBookingData | null {
  try {
    const raw = localStorage.getItem("bookingData");
    if (!raw) return null;

    const parsed = normalizeStoredBooking(JSON.parse(raw) as StoredBookingData);
    if (!parsed || parsed.packageId !== packageId) return null;

    if (new Date(parsed.holdExpiresAt) <= new Date()) {
      localStorage.removeItem("bookingData");
      const holdIds = parsed.holdIds || parsed.slots.map((s) => s.holdId).filter(Boolean) as string[];
      const sid = parsed.sessionId;
      if (sid) {
        if (holdIds.length > 1) bookingService.releaseSlotHolds(holdIds, sid);
        else if (holdIds[0]) bookingService.releaseSlotHold(holdIds[0], sid);
      }
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem("bookingData");
    return null;
  }
}

function mergeReservedSlots(slots: TimeSlot[], date: string, reserved: SelectedBookingSlot[]): TimeSlot[] {
  const merged = slots.map((s) => ({ ...s }));
  for (const r of reserved) {
    if (r.date !== date) continue;
    const existing = merged.find((s) => s.startTime === r.startTime);
    if (existing) {
      existing.available = true;
      delete existing.unavailableReason;
    } else {
      merged.push({ startTime: r.startTime, endTime: r.endTime, available: true });
    }
  }
  return merged.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function slotHour(startTime: string): number {
  const h = parseInt(String(startTime).slice(0, 2), 10);
  return Number.isFinite(h) ? h : 0;
}

function slotPeriod(startTime: string): "Morning" | "Afternoon" | "Evening" {
  const h = slotHour(startTime);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function findContiguousRun(slots: TimeSlot[], count: number): TimeSlot[] | null {
  if (count < 1 || slots.length < count) return null;
  for (let i = 0; i + count <= slots.length; i++) {
    let ok = true;
    for (let j = i; j < i + count; j++) {
      if (slots[j].available === false) {
        ok = false;
        break;
      }
    }
    if (ok) return slots.slice(i, i + count);
  }
  return null;
}

function groupRuns(times: string[]): Array<{ start: string; end: string }> {
  if (!times.length) return [];
  const sorted = [...times].sort((a, b) => a.localeCompare(b));
  const runs: Array<{ start: string; end: string }> = [];
  let runStart = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    // treat HH:MM as sequential hours when possible
    const [ph, pm] = prev.split(":").map(Number);
    const [ch, cm] = cur.split(":").map(Number);
    const prevMins = ph * 60 + (pm || 0);
    const curMins = ch * 60 + (cm || 0);
    if (curMins - prevMins <= 60) {
      prev = cur;
      continue;
    }
    runs.push({ start: runStart, end: prev });
    runStart = cur;
    prev = cur;
  }
  runs.push({ start: runStart, end: prev });
  return runs;
}

/**
 * Same `type` can contain multiple product families (e.g. studio hire vs hour bundles).
 * Keep only the contiguous sortOrder cluster that includes the open package.
 */
function getRelatedPackageCluster(
  packages: BookingPackage[],
  current: BookingPackage
): BookingPackage[] {
  const sameType = packages
    .filter((p) => p.type === current.type && p.isActive !== false)
    .slice()
    .sort((a, b) => {
      const ao = Number(a.sortOrder ?? 0);
      const bo = Number(b.sortOrder ?? 0);
      if (ao !== bo) return ao - bo;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

  if (!sameType.length) return [current];
  if (sameType.length === 1) return sameType;

  const clusters: BookingPackage[][] = [];
  let cluster: BookingPackage[] = [];
  for (const p of sameType) {
    if (!cluster.length) {
      cluster = [p];
      continue;
    }
    const prev = cluster[cluster.length - 1];
    const gap = Number(p.sortOrder ?? 0) - Number(prev.sortOrder ?? 0);
    if (gap > 1) {
      clusters.push(cluster);
      cluster = [p];
    } else {
      cluster.push(p);
    }
  }
  if (cluster.length) clusters.push(cluster);

  const match = clusters.find((c) => c.some((p) => p._id === current._id));
  return match?.length ? match : [current];
}

/** Compact "Tue, 18 Aug" label used wherever slots are listed per date. */
function formatSlotDateLabel(date: string): string {
  if (!date) return "";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function addOneHourLabel(startTime: string, endTime?: string): string {
  if (endTime) return `${startTime}–${endTime}`;
  const h = slotHour(startTime);
  const m = String(startTime).slice(3, 5) || "00";
  return `${startTime}–${String((h + 1) % 24).padStart(2, "0")}:${m}`;
}

export default function BookingFlowPage() {
  const params = useParams();
  const router = useRouter();
  /** URL segment: package slug or legacy Mongo id */
  const packageKey = params.packageId as string;

  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [pkg, setPkg] = useState<BookingPackage | null>(null);
  const [siblingPackages, setSiblingPackages] = useState<BookingPackage[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<SelectedBookingSlot[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<SelectedBookingExtra[]>([]);
  const [activeHolds, setActiveHolds] = useState<SlotHold[]>([]);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [durationHrs, setDurationHrs] = useState<number | null>(null);
  const [durationHint, setDurationHint] = useState<string | null>(null);
  const [hoursLimitHint, setHoursLimitHint] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [extraMics, setExtraMics] = useState(0);
  const [monthAvailability, setMonthAvailability] = useState<
    Record<string, MonthAvailabilityDay>
  >({});
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(null);
  const pkgTrackRef = useRef<HTMLDivElement | null>(null);
  const [pkgOverflow, setPkgOverflow] = useState(false);
  const [pkgCanPrev, setPkgCanPrev] = useState(false);
  const [pkgCanNext, setPkgCanNext] = useState(false);
  const [pkgAutoPaused, setPkgAutoPaused] = useState(false);
  const [extrasPage, setExtrasPage] = useState(0);
  const [extrasAnim, setExtrasAnim] = useState<"next" | "prev" | "idle">("idle");
  const [extraQtyHintIndex, setExtraQtyHintIndex] = useState<number | null>(null);
  const [editingPackages, setEditingPackages] = useState<BookingPackage[]>([]);
  const [selectedEditing, setSelectedEditing] = useState<SelectedEditingAddOn | null>(null);
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return bookingService.generateSessionId();
    try {
      const raw = localStorage.getItem("bookingData");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredBookingData;
        if (parsed.sessionId) return parsed.sessionId;
      }
    } catch { /* ignore */ }
    return bookingService.generateSessionId();
  });

  const hasActiveHold = activeHolds.length > 0;
  const timezone = settings?.timezone || "Europe/London";
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [bookingUi, setBookingUi] = useState<BookingModuleUi>(resolveBookingModuleUi(null));
  /** Canonical Mongo id — required by slots/hold APIs */
  const resolvedPackageId = pkg?._id || "";

  const displaySlots = hasActiveHold
    ? activeHolds.map((h) => ({ date: h.date, startTime: h.startTime, endTime: h.endTime, holdId: h.holdId }))
    : selectedSlots;

  /** Selected hours bucketed per date so a multi-day booking reads unambiguously. */
  const slotDateGroups = useMemo(() => {
    const byDate = new Map<string, SelectedBookingSlot[]>();
    for (const slot of displaySlots) {
      const bucket = byDate.get(slot.date);
      if (bucket) bucket.push(slot);
      else byDate.set(slot.date, [slot]);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({
        date,
        slots: slots.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [displaySlots]);

  const isMultiDayBooking = slotDateGroups.length > 1;

  const includedMics = Math.max(0, Number(pkg?.includedMics) || 0);
  const studioMicCapacity = Math.max(1, Number(settings?.studioMicCapacity) || 5);
  const extraMicPricePerHour = Math.max(0, Number(settings?.extraMicPricePerHour) || 15);
  const maxGuests = Math.min(
    9,
    Math.max(1, Number(pkg?.maxGuests) || studioMicCapacity || 5)
  );
  // Extra mics may cover every guest beyond included — ceiling follows package maxGuests
  // (not only settings.studioMicCapacity, which can be lower than maxGuests).
  const micCapacityCeiling = Math.max(studioMicCapacity, maxGuests);
  const maxExtraMics = Math.max(0, micCapacityCeiling - includedMics);
  const micsNeeded = Math.max(0, guestCount - includedMics);
  const micsShort = Math.max(0, micsNeeded - extraMics);
  const micFeatureEnabled = pkg?.type === "studio" || includedMics > 0;
  const guestOptions = useMemo(
    () => Array.from({ length: maxGuests }, (_, i) => i + 1),
    [maxGuests]
  );

  const whatHappensNext: BookingWhatHappensNext = useMemo(
    () => resolveWhatHappensNext(pkg?.whatHappensNext ?? DEFAULT_WHAT_HAPPENS_NEXT),
    [pkg?.whatHappensNext]
  );

  const hoursBooked = Math.max(displaySlots.length, 0);
  const fixedPrice = isFixedPricePackage(pkg);
  const maxHours = resolveMaxHours(pkg);
  /** Per-hour rates are multiplied by this — always 1 for fixed-price packages. */
  const billableUnits = resolveBillableUnits(pkg?.pricingMode, hoursBooked);
  const editingSubtotal = Math.max(0, Number(selectedEditing?.price) || 0);
  const micSubtotal = useMemo(
    () => bookingService.computeExtraMicCost(extraMics, extraMicPricePerHour, billableUnits),
    [extraMics, extraMicPricePerHour, billableUnits]
  );

  const pricing = useMemo(
    () =>
      bookingService.computeBookingTotal(
        pkg?.price || 0,
        displaySlots.length,
        selectedExtras,
        micSubtotal,
        editingSubtotal,
        pkg?.pricingMode
      ),
    [pkg?.price, pkg?.pricingMode, displaySlots.length, selectedExtras, micSubtotal, editingSubtotal]
  );

  const packageExtras = pkg?.extras?.filter((e) => e.title?.trim()) || [];
  const EXTRAS_PER_PAGE = 4;
  const extrasPageCount = Math.max(1, Math.ceil(packageExtras.length / EXTRAS_PER_PAGE));
  const safeExtrasPage = Math.min(extrasPage, extrasPageCount - 1);
  const visibleExtras = packageExtras
    .map((extra, index) => ({ extra, index }))
    .slice(safeExtrasPage * EXTRAS_PER_PAGE, safeExtrasPage * EXTRAS_PER_PAGE + EXTRAS_PER_PAGE);
  const extrasHasPager = packageExtras.length > EXTRAS_PER_PAGE;

  useEffect(() => {
    setExtrasPage(0);
    setExtrasAnim("idle");
  }, [packageKey, packageExtras.length]);

  useEffect(() => {
    setExtraMics((prev) => Math.min(prev, maxExtraMics));
    setGuestCount((prev) => Math.min(Math.max(1, prev), maxGuests));
  }, [packageKey, includedMics, maxExtraMics, maxGuests]);

  const loadMonthAvailability = async (
    mongoPackageId: string = resolvedPackageId,
    year = viewMonth.year,
    month = viewMonth.month
  ) => {
    if (!mongoPackageId) return;
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    try {
      const res = await bookingService.getMonthAvailability(mongoPackageId, monthKey);
      setMonthAvailability((prev) => ({ ...prev, ...(res.days || {}) }));
    } catch {
      /* keep previous map */
    }
  };

  const refreshNextAvailable = async (mongoPackageId: string = resolvedPackageId) => {
    if (!mongoPackageId || !settings) {
      setNextAvailableDate(null);
      return null;
    }
    const min = bookingService.getDateInTimezone(timezone);
    const max = bookingService.addDaysToDateStr(
      min,
      settings.maxAdvanceBookingDays || 60
    );
    let cursor = min.slice(0, 7);
    const maxMonth = max.slice(0, 7);

    for (let i = 0; i < 8; i++) {
      try {
        const res = await bookingService.getMonthAvailability(mongoPackageId, cursor);
        setMonthAvailability((prev) => ({ ...prev, ...(res.days || {}) }));
        const hit = Object.entries(res.days || {})
          .filter(([, info]) => info.status === "good" || info.status === "low")
          .map(([d]) => d)
          .sort()
          .find((d) => d >= min && d <= max);
        if (hit) {
          setNextAvailableDate(hit);
          return hit;
        }
      } catch {
        /* try next month */
      }
      const [y, m] = cursor.split("-").map(Number);
      const nextM = m === 12 ? 1 : m + 1;
      const nextY = m === 12 ? y + 1 : y;
      cursor = `${nextY}-${String(nextM).padStart(2, "0")}`;
      if (cursor > maxMonth) break;
    }
    setNextAvailableDate(null);
    return null;
  };

  useEffect(() => {
    if (!resolvedPackageId) return;
    setMonthAvailability({});
    setNextAvailableDate(null);
  }, [resolvedPackageId]);

  useEffect(() => {
    if (!resolvedPackageId) return;
    loadMonthAvailability(resolvedPackageId, viewMonth.year, viewMonth.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPackageId, viewMonth.year, viewMonth.month]);

  useEffect(() => {
    if (!resolvedPackageId || !settings) return;
    refreshNextAvailable(resolvedPackageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPackageId, settings?.timezone, settings?.maxAdvanceBookingDays]);

  const setExtraMicsClamped = (n: number) => {
    setExtraMics(Math.max(0, Math.min(maxExtraMics, Math.floor(n))));
  };

  const goExtrasPage = (dir: -1 | 1) => {
    if (!extrasHasPager || submitting) return;
    const next = safeExtrasPage + dir;
    if (next < 0 || next >= extrasPageCount) return;
    setExtrasAnim(dir === 1 ? "next" : "prev");
    setExtrasPage(next);
  };

  const getMinDate = () => bookingService.getDateInTimezone(timezone);
  const getMaxDate = () => bookingService.addDaysToDateStr(getMinDate(), settings?.maxAdvanceBookingDays || 60);
  const todayStr = getMinDate();

  const activeStep =
    hasActiveHold
      ? 3
      : selectedSlots.length > 0 ||
          selectedExtras.length > 0 ||
          extraMics > 0 ||
          Boolean(selectedEditing)
        ? 2
        : 1;

  const isFullyBookedMessage =
    !!slotsMessage &&
    (/fully booked/i.test(slotsMessage) ||
      /no availability/i.test(slotsMessage) ||
      /no slots available/i.test(slotsMessage));

  useEffect(() => { loadInitialData(); }, [packageKey]);

  useEffect(() => {
    const fetchBookingUi = async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
        if (!base) return;
        const res = await fetch(`${base}/site-theme/public`, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const json = await res.json();
        if (json?.success && json?.data?.uiCustom?.booking) {
          setBookingUi(resolveBookingModuleUi(json.data.uiCustom.booking));
        }
      } catch { /* ignore */ }
    };
    fetchBookingUi();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pkg?.type) {
        setSiblingPackages([]);
        return;
      }
      try {
        const currentIsEditing = isEditingPackage(pkg);
        if (currentIsEditing) {
          // Editing tiers switch among themselves (Standard / Advanced / Premium).
          let editingPkgs = await bookingService.getPackages("editing");
          if (!editingPkgs.length) {
            const all = await bookingService.getPackages();
            editingPkgs = all.filter(isEditingPackage);
          }
          if (!cancelled) {
            setSiblingPackages(
              editingPkgs
                .filter((p) => p.isActive !== false)
                .slice()
                .sort(
                  (a, b) =>
                    (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
                    a.price - b.price ||
                    String(a.name).localeCompare(String(b.name))
                )
            );
          }
          return;
        }

        // Studio/service: same type only — never mix in editing add-on packages.
        const packages = await bookingService.getPackages(pkg.type);
        if (!cancelled) {
          setSiblingPackages(
            packages.filter((p) => p.isActive !== false && !isEditingPackage(p))
          );
        }
      } catch {
        if (!cancelled) setSiblingPackages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [pkg?.type, pkg?._id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Editing add-ons are separate catalog packages, shown on studio bookings.
      if (pkg?.type !== "studio") {
        setEditingPackages([]);
        setSelectedEditing(null);
        return;
      }
      try {
        let packages = await bookingService.getPackages("editing");
        if (!packages.length) {
          // Legacy: editing tiers may still be type=service with *-editing slugs.
          const all = await bookingService.getPackages();
          packages = all.filter(isEditingPackage);
        }
        if (!cancelled) {
          setEditingPackages(
            packages
              .filter((p) => p.isActive !== false)
              .slice()
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.price - b.price)
          );
        }
      } catch {
        if (!cancelled) setEditingPackages([]);
      }
    })();
    return () => { cancelled = true; };
  }, [pkg?.type, packageKey]);

  const updatePkgScrollState = () => {
    const el = pkgTrackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const overflow = max > 4;
    setPkgOverflow(overflow);
    setPkgCanPrev(el.scrollLeft > 4);
    setPkgCanNext(el.scrollLeft < max - 4);
  };

  const scrollPkgBy = (dir: -1 | 1) => {
    const el = pkgTrackRef.current;
    if (!el) return;
    const step = Math.max(160, Math.floor(el.clientWidth * 0.7));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  useEffect(() => {
    const el = pkgTrackRef.current;
    if (!el) return;
    updatePkgScrollState();
    const onScroll = () => updatePkgScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => updatePkgScrollState()) : null;
    ro?.observe(el);
    window.addEventListener("resize", updatePkgScrollState);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("resize", updatePkgScrollState);
    };
  }, [siblingPackages, pkg?._id, loading]);

  useEffect(() => {
    if (!pkgOverflow || pkgAutoPaused || loading || submitting) return;
    const id = window.setInterval(() => {
      const el = pkgTrackRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return;
      if (el.scrollLeft >= max - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: Math.max(160, Math.floor(el.clientWidth * 0.55)), behavior: "smooth" });
      }
    }, 3800);
    return () => window.clearInterval(id);
  }, [pkgOverflow, pkgAutoPaused, loading, submitting, siblingPackages.length]);

  useEffect(() => {
    if (!holdExpiry) { setRemainingTime(null); return; }
    const interval = setInterval(() => {
      const diff = holdExpiry.getTime() - Date.now();
      if (diff <= 0) {
        toast.warning("Your slot hold has expired. Please select new times.");
        localStorage.removeItem("bookingData");
        setSelectedSlots([]);
        setActiveHolds([]);
        setHoldExpiry(null);
        if (selectedDate) loadSlots(selectedDate, []);
        clearInterval(interval);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiry, selectedDate]);

  const loadInitialData = async () => {
    setProgress(30);
    try {
      const settingsData = await bookingService.getSettings();
      setSettings(settingsData);

      if (!settingsData?.isEnabled) {
        toast.error("Booking is currently unavailable");
        router.push("/booking");
        return;
      }

      const packageData = await bookingService.getPackageById(packageKey);
      setPkg(packageData);

      if (!packageData) { toast.error("Package not found"); router.push("/booking"); return; }

      const todayMin = getMinDate();
      const stored = getStoredBookingForPackage(packageData._id);
      let initialDate = todayMin;
      let restored: SelectedBookingSlot[] = [];

      if (stored) {
        restored = stored.slots;
        initialDate = stored.slots[0]?.date || todayMin;
        setSelectedSlots(restored);
        if (stored.selectedExtras?.length) {
          setSelectedExtras(repriceStoredExtras(stored.selectedExtras, packageData.extras));
        }
        if (stored.guestCount) setGuestCount(Math.max(1, Number(stored.guestCount) || 1));
        if (stored.extraMics) setExtraMics(Math.max(0, Number(stored.extraMics) || 0));
        if (stored.selectedEditing?.packageId) setSelectedEditing(stored.selectedEditing);
        setActiveHolds(
          stored.slots.filter((s) => s.holdId).map((s) => ({
            holdId: s.holdId!,
            packageId: stored.packageId,
            type: stored.packageType || packageData.type,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            expiresAt: stored.holdExpiresAt,
          }))
        );
        setHoldExpiry(new Date(stored.holdExpiresAt));
        const { year, month } = parseDateStr(initialDate);
        setViewMonth({ year, month });
      }

      setSelectedDate(initialDate);
      await loadSlots(initialDate, restored, packageData._id);
    } catch {
      toast.error("Failed to load booking data");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const loadSlots = async (
    date: string,
    reserved: SelectedBookingSlot[] = selectedSlots,
    mongoPackageId: string = resolvedPackageId
  ) => {
    if (!mongoPackageId) return;
    setSlotsLoading(true);
    setSlotsMessage(null);
    setAvailableSlots([]);
    try {
      const response = await bookingService.getAvailableSlots(mongoPackageId, date);
      const merged = mergeReservedSlots(response.slots || [], date, reserved);
      const selectableCount = merged.filter((s) => s.available !== false).length;

      if (merged.length > 0) {
        setAvailableSlots(merged);
        if (selectableCount === 0 && (response.fullyBooked || merged.some((s) => s.unavailableReason === "booked"))) {
          setSlotsMessage("Fully booked");
        } else {
          setSlotsMessage(null);
        }
      } else if (response.blocked) {
        setSlotsMessage(response.reason?.trim() || "Fully booked");
      } else if (response.noAvailability) {
        setSlotsMessage("No availability on this day");
      } else if (
        date === getMinDate() &&
        (settings?.minAdvanceBookingHours ?? 0) > 0
      ) {
        setSlotsMessage(
          `No slots available — bookings require at least ${formatDuration(
            Math.round((settings?.minAdvanceBookingHours ?? 0) * 60),
            settings?.minAdvanceDisplayUnit || "hours",
            { short: false }
          )} notice`
        );
      } else if (response.fullyBooked) {
        setSlotsMessage("Fully booked");
      } else {
        setSlotsMessage("Fully booked");
      }
    } catch {
      setSlotsMessage("Failed to load available slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  const isDateSelectable = (dateStr: string) => dateStr >= getMinDate() && dateStr <= getMaxDate();

  const releaseCurrentHolds = async () => {
    const ids = activeHolds.map((h) => h.holdId);
    if (ids.length > 1) await bookingService.releaseSlotHolds(ids, sessionId);
    else if (ids[0]) await bookingService.releaseSlotHold(ids[0], sessionId);
    localStorage.removeItem("bookingData");
    setActiveHolds([]);
    setHoldExpiry(null);
    setRemainingTime(null);
  };

  const minMonth = useMemo(() => parseDateStr(getMinDate()), [timezone, settings?.maxAdvanceBookingDays]);
  const maxMonth = useMemo(() => parseDateStr(getMaxDate()), [timezone, settings?.maxAdvanceBookingDays]);

  const canGoPrevMonth =
    viewMonth.year > minMonth.year ||
    (viewMonth.year === minMonth.year && viewMonth.month > minMonth.month);

  const canGoNextMonth =
    viewMonth.year < maxMonth.year ||
    (viewMonth.year === maxMonth.year && viewMonth.month < maxMonth.month);

  const goPrevMonth = () => {
    if (!canGoPrevMonth || submitting) return;
    setViewMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goNextMonth = () => {
    if (!canGoNextMonth || submitting) return;
    setViewMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const selectDate = (dateStr: string) => {
    if (!isDateSelectable(dateStr) || submitting) return;
    setSelectedDate(dateStr);
    setDurationHrs(null);
    setDurationHint(null);
    setHoursLimitHint(null);
    loadSlots(dateStr);
  };

  const jumpToDate = (dateStr: string) => {
    if (!dateStr || submitting) return;
    const { year, month } = parseDateStr(dateStr);
    setViewMonth({ year, month });
    selectDate(dateStr);
  };

  const formatLongDate = (dateStr: string) =>
    new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const formatJumpLabel = (dateStr: string) =>
    new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });

  /** Next open day after the selected (fully booked) date, else global next available. */
  const jumpTargetDate = useMemo(() => {
    const min = getMinDate();
    const max = getMaxDate();
    const after = selectedDate || min;
    const fromMap = Object.entries(monthAvailability)
      .filter(([, info]) => info.status === "good" || info.status === "low")
      .map(([d]) => d)
      .sort()
      .find((d) => d > after && d >= min && d <= max);
    return fromMap || (nextAvailableDate && nextAvailableDate > after ? nextAvailableDate : nextAvailableDate);
  }, [monthAvailability, selectedDate, nextAvailableDate, timezone, settings?.maxAdvanceBookingDays]);

  const busyThroughLabel = useMemo(() => {
    if (!jumpTargetDate) return null;
    const [y, m, d] = jumpTargetDate.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d));
    prev.setUTCDate(prev.getUTCDate() - 1);
    const through = prev.toISOString().split("T")[0];
    return new Date(`${through}T12:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
  }, [jumpTargetDate]);

  const nextAvailableLabel = nextAvailableDate ? formatLongDate(nextAvailableDate) : null;

  const hoursLimitMessage = (requested: number) =>
    `Hours limit exceeded — ${pkg?.name || "this package"} allows a maximum of ${maxHours} hour${
      maxHours === 1 ? "" : "s"
    } per booking. You tried to book ${requested}.`;

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!selectedDate || submitting || hasActiveHold) return;
    if (slot.available === false) return;
    const key = slotKey(selectedDate, slot.startTime);
    if (selectedSlots.some((s) => slotKey(s.date, s.startTime) === key)) {
      setSelectedSlots((prev) => prev.filter((s) => slotKey(s.date, s.startTime) !== key));
      setHoursLimitHint(null);
      return;
    }
    const candidate = { date: selectedDate, startTime: slot.startTime, endTime: slot.endTime };
    if (selectedSlots.some((s) => bookingService.slotsOverlap({ ...s, date: s.date }, candidate))) {
      toast.warning("This slot overlaps with one you've already selected");
      return;
    }
    if (maxHours > 0 && selectedSlots.length + 1 > maxHours) {
      const message = hoursLimitMessage(selectedSlots.length + 1);
      setHoursLimitHint(message);
      toast.warning(message);
      return;
    }
    setHoursLimitHint(null);
    setSelectedSlots((prev) => [...prev, candidate]);
  };

  const handleSlotSelectFromUi = (slot: TimeSlot) => {
    setDurationHrs(null);
    setDurationHint(null);
    handleSlotSelect(slot);
  };

  const applyDurationChip = (hrs: number) => {
    if (!selectedDate || submitting || hasActiveHold) return;
    if (maxHours > 0 && hrs > maxHours) {
      const message = hoursLimitMessage(hrs);
      setHoursLimitHint(message);
      toast.warning(message);
      return;
    }
    setHoursLimitHint(null);
    setDurationHrs(hrs);
    const run = findContiguousRun(availableSlots, hrs);
    if (!run) {
      setDurationHint(`No clear ${hrs}-hour block today. Pick slots individually, or try another date.`);
      setSelectedSlots((prev) => prev.filter((s) => s.date !== selectedDate));
      return;
    }
    setDurationHint(null);
    const mapped = run.map((s) => ({
      date: selectedDate,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    setSelectedSlots((prev) => [...prev.filter((s) => s.date !== selectedDate), ...mapped]);
  };

  const removeSelectedSlot = (date: string, startTime: string) => {
    if (hasActiveHold) return;
    setSelectedSlots((prev) => prev.filter((s) => !(s.date === date && s.startTime === startTime)));
  };

  const isExtraSelected = (index: number) => selectedExtras.some((e) => e.index === index);

  const extraQtyMax = Math.max(0, Math.min(EXTRA_QTY_MAX, guestCount));

  const getExtraQuantity = (index: number) =>
    Math.max(0, selectedExtras.find((e) => e.index === index)?.quantity || 0);

  const setExtraQuantity = (extra: BookingPackageExtra, index: number, rawQty: number) => {
    if (submitting) return;
    const parsed = Number.isFinite(Number(rawQty)) ? Math.floor(Number(rawQty)) : 0;
    const next = Math.max(0, Math.min(extraQtyMax, parsed));
    setSelectedExtras((prev) => {
      if (next <= 0) return prev.filter((e) => e.index !== index);
      const exists = prev.some((e) => e.index === index);
      if (exists) {
        return prev.map((e) =>
          e.index === index ? { ...e, quantity: next, quantityEnabled: true } : e
        );
      }
      return [...prev, toSelectedExtra(extra, index, next)];
    });
  };

  useEffect(() => {
    setSelectedExtras((prev) => {
      let changed = false;
      const next: SelectedBookingExtra[] = [];
      for (const e of prev) {
        if (!e.quantityEnabled) {
          next.push(e);
          continue;
        }
        const qty = Math.max(0, Math.floor(Number(e.quantity) || 0));
        if (qty <= 0 || extraQtyMax <= 0) {
          changed = true;
          continue;
        }
        if (qty > extraQtyMax) {
          changed = true;
          next.push({ ...e, quantity: extraQtyMax });
        } else {
          next.push(e);
        }
      }
      return changed ? next : prev;
    });
  }, [extraQtyMax]);

  useEffect(() => {
    setExtraQtyHintIndex(null);
  }, [guestCount, packageKey]);

  const tryIncreaseExtraQty = (
    extra: BookingPackageExtra,
    index: number,
    qty: number
  ) => {
    if (submitting) return;
    if (qty >= extraQtyMax) {
      setExtraQtyHintIndex(index);
      return;
    }
    setExtraQtyHintIndex(null);
    setExtraQuantity(extra, index, qty + 1);
  };

  const tryDecreaseExtraQty = (
    extra: BookingPackageExtra,
    index: number,
    qty: number
  ) => {
    if (submitting) return;
    setExtraQtyHintIndex((prev) => (prev === index ? null : prev));
    setExtraQuantity(extra, index, Math.max(0, qty - 1));
  };

  const toggleExtra = (extra: BookingPackageExtra, index: number) => {
    if (submitting) return;
    if (isExtraSelected(index)) {
      setSelectedExtras((prev) => prev.filter((e) => e.index !== index));
      return;
    }
    setSelectedExtras((prev) => [...prev, toSelectedExtra(extra, index, 1)]);
  };

  const saveBookingToStorage = (
    holds: SlotHold[],
    slots: SelectedBookingSlot[],
    expiresAt: string,
    extras: SelectedBookingExtra[] = selectedExtras,
    mics: number = extraMics,
    guests: number = guestCount,
    editing: SelectedEditingAddOn | null = selectedEditing
  ) => {
    const holdIds = holds.map((h) => h.holdId);
    const units = resolveBillableUnits(pkg?.pricingMode, slots.length);
    const micCost = bookingService.computeExtraMicCost(mics, extraMicPricePerHour, units);
    const editCost = Math.max(0, Number(editing?.price) || 0);
    const totals = bookingService.computeBookingTotal(
      pkg?.price || 0,
      slots.length,
      extras,
      micCost,
      editCost,
      pkg?.pricingMode
    );
    const data: StoredBookingData = {
      holdId: holdIds[0],
      holdIds,
      packageId: resolvedPackageId || pkg?._id || "",
      packageName: pkg?.name,
      packageType: pkg?.type,
      packagePrice: pkg?.price,
      packageDuration: pkg?.durationMinutes,
      pricingMode: pkg?.pricingMode || "hourly",
      date: slots[0]?.date,
      startTime: slots[0]?.startTime,
      endTime: slots[0]?.endTime,
      slots,
      holdExpiresAt: expiresAt,
      sessionId,
      selectedExtras: extras,
      slotsSubtotal: totals.slotsSubtotal,
      extrasSubtotal: totals.extrasSubtotal + totals.micSubtotal + totals.editingSubtotal,
      micSubtotal: totals.micSubtotal,
      guestCount: guests,
      extraMics: mics,
      selectedEditing: editing,
      editingSubtotal: totals.editingSubtotal,
      totalPrice: totals.totalPrice,
    };
    localStorage.setItem("bookingData", JSON.stringify(data));
  };

  const toggleEditing = (editPkg: BookingPackage) => {
    if (submitting) return;
    setSelectedEditing((prev) => {
      const next =
        prev?.packageId === editPkg._id
          ? null
          : ({
              packageId: editPkg._id,
              title: editPkg.name,
              price: Number(editPkg.price) || 0,
              description: stripHtmlText(editPkg.description || "") || undefined,
              image: editPkg.image,
            } as SelectedEditingAddOn);
      if (hasActiveHold && holdExpiry) {
        queueMicrotask(() => {
          saveBookingToStorage(
            activeHolds,
            displaySlots,
            holdExpiry.toISOString(),
            selectedExtras,
            extraMics,
            guestCount,
            next
          );
        });
      }
      return next;
    });
  };

  const handleContinueToCheckout = () => {
    if (submitting) return;
    setSubmitting(true);
    setProgress(45);
    try {
      if (activeHolds.length && holdExpiry) {
        saveBookingToStorage(activeHolds, displaySlots, holdExpiry.toISOString(), selectedExtras);
      }
      setProgress(90);
      router.push("/checkout");
    } catch {
      toast.error("Failed to continue to checkout");
      setSubmitting(false);
      setProgress(0);
    }
  };

  const handleConfirmSlots = async () => {
    if (!selectedSlots.length || submitting || hasActiveHold || !resolvedPackageId) return;
    if (maxHours > 0 && selectedSlots.length > maxHours) {
      const message = hoursLimitMessage(selectedSlots.length);
      setHoursLimitHint(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    setProgress(40);
    try {
      const result = await bookingService.createMultiSlotHold(
        resolvedPackageId,
        selectedSlots.map((s) => ({ date: s.date, startTime: s.startTime })),
        sessionId
      );
      if (result.success && result.holds?.length) {
        const expiresAt = result.expiresAt || result.holds[0].expiresAt;
        const withHolds = selectedSlots.map((slot, i) => ({ ...slot, holdId: result.holds![i].holdId }));
        setActiveHolds(result.holds);
        setSelectedSlots(withHolds);
        setHoldExpiry(new Date(expiresAt));
        saveBookingToStorage(result.holds, withHolds, expiresAt, selectedExtras);
        if (resolvedPackageId) {
          loadMonthAvailability(resolvedPackageId, viewMonth.year, viewMonth.month);
          refreshNextAvailable(resolvedPackageId);
        }
        toast.success(`${result.holds.length} slot(s) reserved!`);
        setProgress(90);
        router.push("/checkout");
      } else {
        toast.error(result.error || "Failed to hold slots");
        setSubmitting(false);
        setProgress(0);
        if (selectedDate) loadSlots(selectedDate);
      }
    } catch {
      toast.error("Failed to hold slots");
      setSubmitting(false);
      setProgress(0);
    }
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const firstDay = new Date(viewMonth.year, viewMonth.month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const cells: Array<{ day: number; dateStr: string } | null> = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, dateStr: toDateStr(viewMonth.year, viewMonth.month, day) });
    }
    return cells;
  }, [viewMonth]);

  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    : "";
  const summaryWhenLabel = (() => {
    if (isMultiDayBooking) {
      const first = slotDateGroups[0].date;
      const last = slotDateGroups[slotDateGroups.length - 1].date;
      const year = new Date(`${last}T12:00:00`).getFullYear();
      return `${slotDateGroups.length} dates · ${formatSlotDateLabel(first)} – ${formatSlotDateLabel(
        last
      )} ${year}`;
    }
    const date = displaySlots[0]?.date || selectedDate;
    if (!date) return "Choose a date";
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  })();

  const slotsOnSelectedDate = displaySlots
    .filter((s) => s.date === selectedDate)
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pickedRuns = groupRuns(slotsOnSelectedDate.map((s) => s.startTime));
  const pickedRangeText = pickedRuns
    .map((r) => {
      const endSlot = slotsOnSelectedDate.find((s) => s.startTime === r.end);
      return `${r.start}–${endSlot?.endTime || addOneHourLabel(r.end).split("–")[1]}`;
    })
    .join(", ");

  const slotsByPeriod = useMemo(() => {
    const groups: Record<"Morning" | "Afternoon" | "Evening", TimeSlot[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    for (const slot of availableSlots) {
      groups[slotPeriod(slot.startTime)].push(slot);
    }
    return groups;
  }, [availableSlots]);

  const primaryCta = (() => {
    if (hasActiveHold) {
      return {
        label: submitting ? "Continuing..." : "Continue to Checkout",
        disabled: submitting,
        onClick: handleContinueToCheckout,
      };
    }
    if (selectedSlots.length > 0) {
      return {
        label: submitting
          ? "Reserving..."
          : `Reserve ${selectedSlots.length} Slot${selectedSlots.length > 1 ? "s" : ""} & Continue`,
        disabled: submitting,
        onClick: handleConfirmSlots,
      };
    }
    return {
      label: "Choose your times",
      disabled: true,
      onClick: () => {},
    };
  })();

  const busyMessage = loading
    ? "Loading booking details..."
    : submitting
      ? hasActiveHold
        ? "Continuing to checkout..."
        : "Reserving your slots..."
      : "";

  const packageSwitcher = useMemo(() => {
    if (!pkg) return [];
    if (isEditingPackage(pkg)) {
      const editing = siblingPackages
        .filter((p) => isEditingPackage(p) && p.isActive !== false)
        .slice()
        .sort(
          (a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            a.price - b.price ||
            String(a.name).localeCompare(String(b.name))
        );
      if (!editing.some((p) => p._id === pkg._id)) {
        return [pkg, ...editing].sort(
          (a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            a.price - b.price ||
            String(a.name).localeCompare(String(b.name))
        );
      }
      return editing.length ? editing : [pkg];
    }
    return getRelatedPackageCluster(siblingPackages, pkg);
  }, [siblingPackages, pkg]);

  const rateLine =
    displaySlots.length === 0
      ? "\u00a0"
      : fixedPrice
        ? `${bookingService.formatPrice(pricing.totalPrice)} · ${displaySlots.length} ${
            displaySlots.length === 1 ? "hr" : "hrs"
          } total`
        : `${bookingService.formatPrice(pricing.totalPrice / displaySlots.length)} per hour · ${displaySlots.length} ${
            displaySlots.length === 1 ? "hr" : "hrs"
          } total`;

  if (loading || submitting) {
    return (
      <>
        <LoadingBar color="#C2FC12" progress={progress} onLoaderFinished={() => setProgress(0)} />
        <BookingFlowLoading
          message={busyMessage}
          style={bookingModuleRootStyle(bookingUi)}
        />
      </>
    );
  }

  return (
    <>
      <LoadingBar color="#C2FC12" progress={progress} onLoaderFinished={() => setProgress(0)} />
      <div
        className="booking-module-root booking-flow-v3"
        style={bookingModuleRootStyle(bookingUi)}
      >
        <div className="bf-top">
          <div className="bf-wrap">
            <button
              type="button"
              className="bf-back"
              onClick={() => router.push("/booking")}
              disabled={submitting}
            >
              ‹ Back to Services
            </button>
          </div>
        </div>

        <div className="bf-wrap">
          <div className="bf-phead">
            <div>
              <p className="bf-phead-kick bf-mono">
                {bookingService.getTypeLabel(pkg?.type || "")}
              </p>
              <h1>Book the studio</h1>
            </div>
          </div>

          {packageSwitcher.length > 0 && (
            <div
              className={`bf-pkslider${pkgOverflow ? " bf-pkslider--nav" : ""}`}
              onMouseEnter={() => setPkgAutoPaused(true)}
              onMouseLeave={() => setPkgAutoPaused(false)}
              onFocusCapture={() => setPkgAutoPaused(true)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setPkgAutoPaused(false);
                }
              }}
            >
              {pkgOverflow && (
                <button
                  type="button"
                  className="bf-pkslider__btn bf-pkslider__btn--prev"
                  aria-label="Previous packages"
                  disabled={!pkgCanPrev || submitting}
                  onClick={() => {
                    setPkgAutoPaused(true);
                    scrollPkgBy(-1);
                  }}
                >
                  ‹
                </button>
              )}
              <div
                className="bf-pkswitch"
                role="group"
                aria-label="Choose a package"
                ref={pkgTrackRef}
              >
                {packageSwitcher.map((p) => {
                  const current =
                    p._id === pkg?._id ||
                    getPackageUrlKey(p) === packageKey;
                  const dur = formatDuration(p.durationMinutes, p.durationDisplayUnit, { short: true });
                  const customSubtitle = String(p.subtitle || "").trim();
                  const pMics = Math.max(0, Number(p.includedMics) || 0);
                  // Prefer package subtitle — do not let description override it.
                  const subline =
                    customSubtitle ||
                    (pMics > 0
                      ? `${pMics} mic${pMics === 1 ? "" : "s"} included, up to ${studioMicCapacity}`
                      : "") ||
                    String(p.description || "")
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 48);
                  return (
                    <button
                      key={p._id}
                      type="button"
                      className="bf-pk"
                      aria-pressed={current}
                      disabled={submitting}
                      title={p.name}
                      onClick={() => {
                        if (current || submitting) return;
                        router.push(`/booking/${getPackageUrlKey(p)}`);
                      }}
                    >
                      <b>{p.name}</b>
                      <span className="bf-pk__sub" data-bf-pk-sub="">
                        {subline || (dur ? `${dur} session` : "Studio package")}
                      </span>
                      <u className="bf-pk__price">
                        {bookingService.formatPrice(p.price)}
                        {isFixedPricePackage(p) ? "" : dur ? ` / ${dur}` : ""}
                      </u>
                    </button>
                  );
                })}
              </div>
              {pkgOverflow && (
                <button
                  type="button"
                  className="bf-pkslider__btn bf-pkslider__btn--next"
                  aria-label="Next packages"
                  disabled={!pkgCanNext || submitting}
                  onClick={() => {
                    setPkgAutoPaused(true);
                    scrollPkgBy(1);
                  }}
                >
                  ›
                </button>
              )}
            </div>
          )}

          <p className="bf-steps-label">Booking progress</p>
          <ol className="bf-steps" aria-label="Booking progress">
            <li
              className={`bf-stp${activeStep === 1 ? " is-on" : ""}${activeStep > 1 ? " is-done" : ""}`}
              aria-current={activeStep === 1 ? "step" : undefined}
            >
              <b aria-hidden="true">{activeStep > 1 ? "✓" : "1"}</b>
              <span>Date &amp; time</span>
            </li>
            <li className={`bf-stp-line${activeStep > 1 ? " is-done" : ""}`} aria-hidden="true" />
            <li
              className={`bf-stp${activeStep === 2 ? " is-on" : ""}${activeStep > 2 ? " is-done" : ""}`}
              aria-current={activeStep === 2 ? "step" : undefined}
            >
              <b aria-hidden="true">{activeStep > 2 ? "✓" : "2"}</b>
              <span>Extras</span>
            </li>
            <li className={`bf-stp-line${activeStep > 2 ? " is-done" : ""}`} aria-hidden="true" />
            <li
              className={`bf-stp${activeStep === 3 ? " is-on" : ""}`}
              aria-current={activeStep === 3 ? "step" : undefined}
            >
              <b aria-hidden="true">3</b>
              <span>Details &amp; pay</span>
            </li>
          </ol>

          <div className="bf-grid">
            <main>
              <div className="bf-card">
                <div className="bf-card-h">
                  <h2>Choose your date &amp; time</h2>
                  <span className="bf-mono">{timezone.replace(/_/g, " ")}</span>
                </div>

                <div className="bf-ctrl">
                  <div className="bf-crow">
                    <span className="bf-mono bf-clab">How long</span>
                    <div className="bf-copts">
                      {DURATION_OPTIONS.filter(
                        (opt) => maxHours <= 0 || opt.hrs <= maxHours
                      ).map((opt) => (
                        <button
                          key={opt.hrs}
                          type="button"
                          className="bf-chip"
                          aria-pressed={durationHrs === opt.hrs}
                          disabled={submitting || hasActiveHold || !selectedDate || slotsLoading}
                          onClick={() => applyDurationChip(opt.hrs)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <span className="bf-cnote">
                      {maxHours > 0
                        ? `Book 1 to ${maxHours} hour${maxHours === 1 ? "" : "s"}`
                        : "Book from 1 hour"}
                    </span>
                  </div>

                  <div className="bf-crow">
                    <span className="bf-mono bf-clab">Guests</span>
                    <div className="bf-copts">
                      {guestOptions.map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="bf-chip"
                          aria-pressed={guestCount === n}
                          disabled={submitting}
                          onClick={() => setGuestCount(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="bf-cnote">
                      {micFeatureEnabled ? (
                        <>
                          {pkg?.name} includes <b>{includedMics}</b> microphone
                          {includedMics === 1 ? "" : "s"}. The studio has{" "}
                          <b>{maxGuests}</b> in total.
                        </>
                      ) : (
                        <>
                          Room set for <b>{guestCount}</b>{" "}
                          {guestCount === 1 ? "person" : "people"}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {micFeatureEnabled && micsShort > 0 && (
                  <div className="bf-hint bf-hint--mic" role="status">
                    <span>
                      <b>{guestCount} guests selected.</b> {pkg?.name} includes{" "}
                      {includedMics} microphone{includedMics === 1 ? "" : "s"}, so you need{" "}
                      <b>{micsShort}</b> more at £{extraMicPricePerHour.toFixed(0)}
                      {fixedPrice ? " each" : "/hr"}.
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtraMicsClamped(micsNeeded)}
                      disabled={submitting || maxExtraMics <= 0}
                    >
                      Add {micsShort} mic{micsShort === 1 ? "" : "s"}
                    </button>
                  </div>
                )}

                {durationHint && (
                  <div className="bf-hint" role="status">
                    <b>{durationHint}</b>
                  </div>
                )}

                {hoursLimitHint && (
                  <div className="bf-hint" role="alert">
                    <b>{hoursLimitHint}</b>
                  </div>
                )}

                <div className="bf-cal-wrap">
                  <div className="bf-cal">
                    <div className="bf-cal-nav">
                      <button
                        type="button"
                        onClick={goPrevMonth}
                        disabled={!canGoPrevMonth || submitting}
                        aria-label="Previous month"
                      >
                        ‹
                      </button>
                      <b>{monthLabel}</b>
                      <button
                        type="button"
                        onClick={goNextMonth}
                        disabled={!canGoNextMonth || submitting}
                        aria-label="Next month"
                      >
                        ›
                      </button>
                    </div>
                    <div className="bf-cal-dow" aria-hidden="true">
                      {WEEKDAYS.map((d, i) => (
                        <i key={`${d}-${i}`}>{d}</i>
                      ))}
                    </div>
                    <div className="bf-cal-days" role="group" aria-label={`Choose a date in ${monthLabel}`}>
                      {calendarDays.map((cell, i) => {
                        if (!cell) return <div key={`e-${i}`} />;
                        const selectable = isDateSelectable(cell.dateStr);
                        const isSelected = selectedDate === cell.dateStr;
                        const dayInfo = monthAvailability[cell.dateStr];
                        const status: DayAvailabilityStatus | null =
                          selectable && dayInfo?.status && dayInfo.status !== "past"
                            ? dayInfo.status
                            : null;
                        const showDot =
                          status === "good" || status === "low" || status === "full";
                        const isToday = cell.dateStr === todayStr;
                        const availWord =
                          status === "full"
                            ? "fully booked"
                            : status === "low"
                              ? "filling up"
                              : status === "good"
                                ? "good availability"
                                : status === "closed"
                                  ? "closed"
                                  : "";
                        return (
                          <button
                            key={cell.dateStr}
                            type="button"
                            className={`bf-day${status === "full" ? " is-full" : ""}`}
                            data-booking-calendar-date=""
                            data-selected={isSelected ? "true" : undefined}
                            data-avail={showDot ? status : undefined}
                            aria-pressed={isSelected}
                            aria-label={
                              availWord
                                ? `${cell.dateStr}, ${availWord}`
                                : cell.dateStr
                            }
                            onClick={() => selectDate(cell.dateStr)}
                            disabled={!selectable || submitting}
                            style={
                              isToday && !isSelected
                                ? { boxShadow: "inset 0 0 0 1px rgba(194,252,18,0.45)" }
                                : undefined
                            }
                          >
                            <span>{cell.day}</span>
                            {showDot && (
                              <span
                                className={`bf-dot${
                                  status === "low"
                                    ? " low"
                                    : status === "full"
                                      ? " full"
                                      : ""
                                }`}
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="bf-callegend">
                      <span><i />Good availability</span>
                      <span><i className="low" />Filling up</span>
                      <span><i className="full" />Fully booked</span>
                    </div>
                    <div className="bf-nextav" role="status">
                      {nextAvailableLabel ? (
                        <>
                          Next available: <b>{nextAvailableLabel}</b>
                        </>
                      ) : (
                        <>No availability in the next few months.</>
                      )}
                    </div>
                  </div>

                  <div className="bf-slots">
                    <div className="bf-slots-h">
                      <b>{selectedDateLabel || "Select a date"}</b>
                      <span>
                        {isFullyBookedMessage
                          ? "No hours available on this date"
                          : "Tap one or more slots · each is 1 hour"}
                      </span>
                    </div>

                    {!selectedDate ? (
                      <p className="bf-picked none">Select a date to see available times.</p>
                    ) : slotsLoading ? (
                      <p className="bf-picked none">Loading times...</p>
                    ) : isFullyBookedMessage && availableSlots.filter((s) => s.available !== false).length === 0 ? (
                      <div className="bf-booked">
                        <span className="bf-tag bf-mono">Fully booked</span>
                        <h4>{selectedDateLabel} is taken</h4>
                        <p>
                          {busyThroughLabel
                            ? `Every hour is booked. We are busy through ${busyThroughLabel}.`
                            : slotsMessage ||
                              "Every hour is booked on this date. Try another day."}
                        </p>
                        {jumpTargetDate ? (
                          <button
                            type="button"
                            className="bf-booked-jump"
                            disabled={submitting}
                            onClick={() => jumpToDate(jumpTargetDate)}
                          >
                            Jump to {formatJumpLabel(jumpTargetDate)}
                          </button>
                        ) : null}
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <>
                        {(["Morning", "Afternoon", "Evening"] as const).map((period) => {
                          const group = slotsByPeriod[period];
                          if (!group.length) return null;
                          return (
                            <div key={period} className="bf-sgrp">
                              <p>{period}</p>
                              <div className="bf-slot-grid">
                                {group.map((slot) => {
                                  const isUnavailable = slot.available === false;
                                  const selected = selectedSlots.some(
                                    (s) => s.date === selectedDate && s.startTime === slot.startTime
                                  );
                                  const booked = slot.unavailableReason === "booked";
                                  return (
                                    <button
                                      key={slot.startTime}
                                      type="button"
                                      className={`bf-slot${booked || isUnavailable ? " is-booked" : ""}`}
                                      data-booking-slot={isUnavailable ? undefined : ""}
                                      data-selected={selected ? "true" : undefined}
                                      aria-pressed={selected}
                                      onClick={() => handleSlotSelectFromUi(slot)}
                                      disabled={submitting || hasActiveHold || isUnavailable}
                                      title={
                                        booked
                                          ? "Fully booked"
                                          : slot.unavailableReason === "past"
                                            ? "This time has passed"
                                            : undefined
                                      }
                                    >
                                      {slot.startTime}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {slotsOnSelectedDate.length === 0 ? (
                          <div className="bf-picked none">
                            No times chosen yet — tap the slots you want.
                          </div>
                        ) : (
                          <div className="bf-picked">
                            <b>
                              {slotsOnSelectedDate.length}{" "}
                              {slotsOnSelectedDate.length === 1 ? "hr" : "hrs"}
                            </b>
                            {" · "}
                            {pickedRangeText}
                            <em>
                              {pickedRuns.length > 1
                                ? `${pickedRuns.length} separate blocks on this day`
                                : "One continuous block"}
                            </em>
                          </div>
                        )}
                      </>
                    ) : slotsMessage ? (
                      <div className="bf-booked">
                        <span className="bf-tag bf-mono">
                          {/fully booked/i.test(slotsMessage) ? "Fully booked" : "Unavailable"}
                        </span>
                        <h4>
                          {/fully booked/i.test(slotsMessage)
                            ? `${selectedDateLabel} is taken`
                            : selectedDateLabel}
                        </h4>
                        <p>
                          {/fully booked/i.test(slotsMessage) && busyThroughLabel
                            ? `Every hour is booked. We are busy through ${busyThroughLabel}.`
                            : slotsMessage}
                        </p>
                        {/fully booked/i.test(slotsMessage) && jumpTargetDate ? (
                          <button
                            type="button"
                            className="bf-booked-jump"
                            disabled={submitting}
                            onClick={() => jumpToDate(jumpTargetDate)}
                          >
                            Jump to {formatJumpLabel(jumpTargetDate)}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {packageExtras.length > 0 && (
                <div className="bf-card">
                  <div className="bf-card-h">
                    <h2>Extras</h2>
                    <span
                      className={`bf-mono${extrasHasPager ? " bf-extras-count" : ""}`}
                    >
                      {extrasHasPager
                        ? `${safeExtrasPage * EXTRAS_PER_PAGE + 1}–${Math.min(
                            (safeExtrasPage + 1) * EXTRAS_PER_PAGE,
                            packageExtras.length
                          )} of ${packageExtras.length}`
                        : "Optional"}
                    </span>
                  </div>
                  <div className="bf-extras-viewport" aria-live="polite">
                    <div
                      key={safeExtrasPage}
                      className={`bf-extras-page${
                        extrasAnim === "next"
                          ? " bf-extras-page--next"
                          : extrasAnim === "prev"
                            ? " bf-extras-page--prev"
                            : ""
                      }`}
                    >
                      {visibleExtras.map(({ extra, index }) => {
                        const selected = isExtraSelected(index);
                        const imageUrl = bookingService.resolveImageUrl(extra.image);
                        const quantityEnabled = Boolean(extra.quantityEnabled);
                        const qty = getExtraQuantity(index);
                        const extraPricing = resolveExtraPricing(extra);
                        return (
                          <div key={`${extra.title}-${index}`} className="bf-xrow">
                            <div className={`bf-xthumb${imageUrl ? "" : " ico"}`}>
                              {imageUrl ? (
                                <img src={imageUrl} alt={extra.title} />
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                                  <path d="M12 3v18M3 12h18" />
                                </svg>
                              )}
                            </div>
                            <div className="bf-xinfo">
                              <b>
                                {extra.title}
                                {extraPricing.hasDiscount ? (
                                  <i className="bf-xoff">{extraPricing.discountPercent}% OFF</i>
                                ) : null}
                              </b>
                              {extra.description ? <span>{extra.description}</span> : null}
                            </div>
                            <div className="bf-xprice">
                              {extraPricing.hasDiscount ? (
                                <span className="bf-xwas">
                                  {bookingService.formatPrice(extraPricing.originalPrice)}
                                </span>
                              ) : null}
                              +{bookingService.formatPrice(extraPricing.unitPrice)}
                              {fixedPrice ? (
                                quantityEnabled ? <small>each</small> : null
                              ) : (
                                <small>{quantityEnabled ? "each, per hour" : "per hour"}</small>
                              )}
                            </div>
                            {quantityEnabled ? (
                              <div className="bf-xqty-wrap">
                                <div className="bf-xqty" role="group" aria-label={`${extra.title} quantity`}>
                                  <button
                                    type="button"
                                    className="bf-xqty__btn"
                                    aria-label={`Decrease ${extra.title}`}
                                    disabled={submitting || qty <= 0}
                                    onClick={() => tryDecreaseExtraQty(extra, index, qty)}
                                  >
                                    −
                                  </button>
                                  <span className="bf-xqty__val" aria-live="polite">
                                    {Math.max(0, qty)}
                                  </span>
                                  <button
                                    type="button"
                                    className="bf-xqty__btn"
                                    aria-label={`Increase ${extra.title}`}
                                    disabled={submitting || extraQtyMax <= 0}
                                    onClick={() => tryIncreaseExtraQty(extra, index, qty)}
                                  >
                                    +
                                  </button>
                                </div>
                                {(qty >= extraQtyMax || extraQtyHintIndex === index) &&
                                extraQtyMax > 0 ? (
                                  <p className="bf-xqty-hint" role="status">
                                    Max {extraQtyMax} — based on guests selected
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="bf-xadd"
                                aria-pressed={selected}
                                disabled={submitting}
                                onClick={() => toggleExtra(extra, index)}
                              >
                                {selected ? "Added" : "Add"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {extrasHasPager && (
                    <div className="bf-extras-nav">
                      <button
                        type="button"
                        className="bf-extras-nav__btn"
                        aria-label="Previous extras"
                        disabled={submitting || safeExtrasPage <= 0}
                        onClick={() => goExtrasPage(-1)}
                      >
                        ‹ Prev
                      </button>
                      <span className="bf-extras-nav__dots" aria-hidden="true">
                        {Array.from({ length: extrasPageCount }).map((_, i) => (
                          <i key={i} className={i === safeExtrasPage ? "is-on" : undefined} />
                        ))}
                      </span>
                      <button
                        type="button"
                        className="bf-extras-nav__btn"
                        aria-label="Next extras"
                        disabled={submitting || safeExtrasPage >= extrasPageCount - 1}
                        onClick={() => goExtrasPage(1)}
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </div>
              )}

              {editingPackages.length > 0 && (
                <div className="bf-card">
                  <div className="bf-card-h">
                    <h2>Add editing now?</h2>
                    <span className="bf-mono">Optional · per episode</span>
                  </div>
                  {editingPackages.map((editPkg, index) => {
                    const selected = selectedEditing?.packageId === editPkg._id;
                    const imageUrl = bookingService.resolveImageUrl(editPkg.image);
                    const desc = stripHtmlText(editPkg.description || "");
                    return (
                      <div key={editPkg._id} className="bf-xrow">
                        <div className={`bf-xthumb${imageUrl ? "" : " ico"}`}>
                          {imageUrl ? (
                            <img src={imageUrl} alt={editPkg.name} />
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                              <path d={editingIconPath(index)} />
                            </svg>
                          )}
                        </div>
                        <div className="bf-xinfo">
                          <b>{editPkg.name}</b>
                          {desc ? <span>{desc}</span> : null}
                        </div>
                        <div className="bf-xprice">
                          +{bookingService.formatPrice(editPkg.price || 0)}
                          <small>per episode</small>
                        </div>
                        <button
                          type="button"
                          className="bf-xadd"
                          aria-pressed={selected}
                          disabled={submitting}
                          onClick={() => toggleEditing(editPkg)}
                        >
                          {selected ? "Added" : "Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>

            <aside>
              <div className="bf-sum">
                <div className="bf-sum-h">
                  <p className="bf-mono">Your booking</p>
                  <b>{pkg?.name}</b>
                  <span>{summaryWhenLabel}</span>
                </div>

                <div className="bf-sum-b" aria-live="polite">
                  {displaySlots.length === 0 ? (
                    <div className="bf-sline empty">
                      <span className="l">
                        {isFullyBookedMessage
                          ? "That date is fully booked — pick another"
                          : "Choose your times to begin"}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="bf-sline">
                        <span className="l">
                          {pkg?.name}
                          <em>
                            {displaySlots.length}{" "}
                            {displaySlots.length === 1 ? "hr booked" : "hrs booked"}
                            {isMultiDayBooking
                              ? ` across ${slotDateGroups.length} dates`
                              : ""}
                          </em>
                        </span>
                        <span className="v">{bookingService.formatPrice(pricing.slotsSubtotal)}</span>
                      </div>

                      <div className="bf-hrlist">
                        {slotDateGroups.map((group) => (
                          <div key={group.date} className="bf-hrgroup">
                            {isMultiDayBooking && (
                              <div className="bf-hrgroup-h">
                                <span>{formatSlotDateLabel(group.date)}</span>
                                <em>
                                  {group.slots.length}{" "}
                                  {group.slots.length === 1 ? "hr" : "hrs"}
                                </em>
                              </div>
                            )}
                            {group.slots.map((slot) => (
                              <div key={slotKey(slot.date, slot.startTime)} className="bf-hrline">
                                <span className="bt" aria-hidden="true" />
                                <span className="tt">
                                  {addOneHourLabel(slot.startTime, slot.endTime)}
                                </span>
                                {!hasActiveHold && (
                                  <button
                                    type="button"
                                    className="bf-srm"
                                    aria-label={`Remove ${formatSlotDateLabel(slot.date)} ${
                                      slot.startTime
                                    }`}
                                    onClick={() => removeSelectedSlot(slot.date, slot.startTime)}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {extraMics > 0 && (
                        <div className="bf-sline added">
                          <span className="l">
                            Extra microphone{extraMics === 1 ? "" : "s"}
                            <em>
                              {extraMics} × {bookingService.formatPrice(extraMicPricePerHour)}
                              {fixedPrice ? null : (
                                <>
                                  {" "}
                                  per hour × {hoursBooked}
                                  {hoursBooked === 1 ? " hr" : " hrs"}
                                </>
                              )}
                            </em>
                          </span>
                          <span className="v">
                            {bookingService.formatPrice(micSubtotal)}
                          </span>
                          <button
                            type="button"
                            className="bf-srm"
                            aria-label="Remove extra microphones"
                            disabled={submitting}
                            onClick={() => setExtraMicsClamped(0)}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <div className="bf-sline">
                        <span className="l">
                          Guests
                          <em>
                            Room set for {guestCount}{" "}
                            {guestCount === 1 ? "person" : "people"}
                          </em>
                        </span>
                        <span className="v">{guestCount}</span>
                      </div>
                    </>
                  )}

                  {selectedExtras.map((extra) => {
                    const qty = Math.max(1, Math.floor(Number(extra.quantity) || 1));
                    const lineTotal = bookingService.computeHourlyExtraCost(
                      extra.price,
                      billableUnits,
                      qty
                    );
                    return (
                      <div key={`${extra.index}-${extra.title}`} className="bf-sline added">
                        <span className="l">
                          {extra.title}
                          <em>
                            {qty > 1 ? `${qty} × ` : ""}
                            {bookingService.formatPrice(extra.price)}
                            {fixedPrice
                              ? ""
                              : hoursBooked > 0
                                ? ` per hour × ${hoursBooked}${hoursBooked === 1 ? " hr" : " hrs"} booked`
                                : " per hour"}
                            {extra.originalPrice && extra.discountPercent ? (
                              <>
                                {` · ${extra.discountPercent}% off `}
                                <s>{bookingService.formatPrice(extra.originalPrice)}</s>
                              </>
                            ) : null}
                          </em>
                        </span>
                        <span className="v">
                          {bookingService.formatPrice(lineTotal)}
                        </span>
                        <button
                          type="button"
                          className="bf-srm"
                          aria-label={`Remove ${extra.title}`}
                          disabled={submitting}
                          onClick={() => {
                            const match = packageExtras[extra.index];
                            if (match?.quantityEnabled) {
                              setExtraQuantity(match, extra.index, 0);
                              return;
                            }
                            if (match) toggleExtra(match, extra.index);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}

                  {selectedEditing ? (
                    <div className="bf-sline added">
                      <span className="l">
                        {selectedEditing.title}
                        <em>{bookingService.formatPrice(selectedEditing.price)} per episode</em>
                      </span>
                      <span className="v">
                        {bookingService.formatPrice(selectedEditing.price)}
                      </span>
                      <button
                        type="button"
                        className="bf-srm"
                        aria-label={`Remove ${selectedEditing.title}`}
                        disabled={submitting}
                        onClick={() => {
                          setSelectedEditing(null);
                          if (hasActiveHold && holdExpiry) {
                            saveBookingToStorage(
                              activeHolds,
                              displaySlots,
                              holdExpiry.toISOString(),
                              selectedExtras,
                              extraMics,
                              guestCount,
                              null
                            );
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : null}
                </div>

                {remainingTime && (
                  <div className="bf-hold" role="status" aria-live="polite">
                    <b>Reserved</b> — {remainingTime} left
                  </div>
                )}

                <div className="bf-sum-total">
                  <span className="l">Total</span>
                  <span className="v" aria-live="polite">
                    {bookingService.formatPrice(pricing.totalPrice)}
                  </span>
                </div>
                <div className="bf-sum-rate">{rateLine}</div>

                <div className="bf-sum-cta">
                  <button
                    type="button"
                    className="bf-btn"
                    disabled={primaryCta.disabled}
                    onClick={primaryCta.onClick}
                  >
                    {primaryCta.label}
                  </button>
                  {hasActiveHold ? (
                    <button
                      type="button"
                      className="bf-btn bf-btn--quiet"
                      disabled={submitting}
                      onClick={async () => {
                        await releaseCurrentHolds();
                        setSelectedSlots([]);
                        if (selectedDate) loadSlots(selectedDate, []);
                      }}
                    >
                      Cancel reservation
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

        <div className="bf-mbar">
          <div className="t">
            <span>Total</span>
            <b>{bookingService.formatPrice(pricing.totalPrice)}</b>
          </div>
          <button
            type="button"
            className="bf-btn"
            disabled={primaryCta.disabled}
            onClick={primaryCta.onClick}
          >
            {primaryCta.label}
          </button>
        </div>
      </div>
    </>
  );
}
