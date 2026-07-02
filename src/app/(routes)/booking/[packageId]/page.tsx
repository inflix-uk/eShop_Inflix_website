"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  StoredBookingData,
} from "../services/bookingService";

const Nav = dynamic(() => import("@/app/components/navbar/Nav"), { ssr: false });
const LoadingBar = dynamic(() => import("react-top-loading-bar"), { ssr: false });

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

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

function toSelectedExtra(extra: BookingPackageExtra, index: number): SelectedBookingExtra {
  return {
    index,
    title: extra.title,
    price: extra.price || 0,
    image: extra.image,
    description: extra.description,
  };
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
      if (holdIds.length > 1) bookingService.releaseSlotHolds(holdIds);
      else if (holdIds[0]) bookingService.releaseSlotHold(holdIds[0]);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem("bookingData");
    return null;
  }
}

function mergeReservedSlots(slots: TimeSlot[], date: string, reserved: SelectedBookingSlot[]): TimeSlot[] {
  const merged = [...slots];
  for (const r of reserved) {
    if (r.date !== date) continue;
    if (merged.some((s) => s.startTime === r.startTime)) continue;
    merged.push({ startTime: r.startTime, endTime: r.endTime });
  }
  return merged.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export default function BookingFlowPage() {
  const params = useParams();
  const router = useRouter();
  const packageId = params.packageId as string;

  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [pkg, setPkg] = useState<BookingPackage | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<SelectedBookingSlot[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<SelectedBookingExtra[]>([]);
  const [activeHolds, setActiveHolds] = useState<SlotHold[]>([]);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
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

  const displaySlots = hasActiveHold
    ? activeHolds.map((h) => ({ date: h.date, startTime: h.startTime, endTime: h.endTime, holdId: h.holdId }))
    : selectedSlots;

  const pricing = useMemo(
    () => bookingService.computeBookingTotal(pkg?.price || 0, displaySlots.length, selectedExtras),
    [pkg?.price, displaySlots.length, selectedExtras]
  );

  const packageExtras = pkg?.extras?.filter((e) => e.title?.trim()) || [];

  const getMinDate = () => bookingService.getDateInTimezone(timezone);
  const getMaxDate = () => bookingService.addDaysToDateStr(getMinDate(), settings?.maxAdvanceBookingDays || 60);

  useEffect(() => { loadInitialData(); }, [packageId]);

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
      const [settingsData, packageData] = await Promise.all([
        bookingService.getSettings(),
        bookingService.getPackageById(packageId),
      ]);
      setSettings(settingsData);
      setPkg(packageData);

      if (!settingsData?.isEnabled) { toast.error("Booking is currently unavailable"); router.push("/booking"); return; }
      if (!packageData) { toast.error("Package not found"); router.push("/booking"); return; }

      const todayStr = getMinDate();
      const stored = getStoredBookingForPackage(packageId);
      let initialDate = todayStr;
      let restored: SelectedBookingSlot[] = [];

      if (stored) {
        restored = stored.slots;
        initialDate = stored.slots[0]?.date || todayStr;
        setSelectedSlots(restored);
        if (stored.selectedExtras?.length) setSelectedExtras(stored.selectedExtras);
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
      await loadSlots(initialDate, restored);
    } catch {
      toast.error("Failed to load booking data");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const loadSlots = async (date: string, reserved: SelectedBookingSlot[] = selectedSlots) => {
    setSlotsLoading(true);
    setSlotsMessage(null);
    setAvailableSlots([]);
    try {
      const response = await bookingService.getAvailableSlots(packageId, date);
      const merged = mergeReservedSlots(response.slots || [], date, reserved);
      if (merged.length > 0) setAvailableSlots(merged);
      else if (response.blocked) setSlotsMessage(response.reason || "This date is not available");
      else if (response.noAvailability) setSlotsMessage("No availability on this day");
      else setSlotsMessage("No slots available for this date");
    } catch {
      setSlotsMessage("Failed to load available slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  const isDateSelectable = (dateStr: string) => dateStr >= getMinDate() && dateStr <= getMaxDate();

  const releaseCurrentHolds = async () => {
    const ids = activeHolds.map((h) => h.holdId);
    if (ids.length > 1) await bookingService.releaseSlotHolds(ids);
    else if (ids[0]) await bookingService.releaseSlotHold(ids[0]);
    localStorage.removeItem("bookingData");
    setActiveHolds([]);
    setHoldExpiry(null);
    setRemainingTime(null);
  };

  const selectDate = (dateStr: string) => {
    if (!isDateSelectable(dateStr) || submitting) return;
    setSelectedDate(dateStr);
    loadSlots(dateStr);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!selectedDate || submitting || hasActiveHold) return;
    const key = slotKey(selectedDate, slot.startTime);
    if (selectedSlots.some((s) => slotKey(s.date, s.startTime) === key)) {
      setSelectedSlots((prev) => prev.filter((s) => slotKey(s.date, s.startTime) !== key));
      return;
    }
    const candidate = { date: selectedDate, ...slot };
    if (selectedSlots.some((s) => bookingService.slotsOverlap({ ...s, date: s.date }, candidate))) {
      toast.warning("This slot overlaps with one you've already selected");
      return;
    }
    setSelectedSlots((prev) => [...prev, candidate]);
  };

  const removeSelectedSlot = (date: string, startTime: string) => {
    if (hasActiveHold) return;
    setSelectedSlots((prev) => prev.filter((s) => !(s.date === date && s.startTime === startTime)));
  };

  const isExtraSelected = (index: number) => selectedExtras.some((e) => e.index === index);

  const toggleExtra = (extra: BookingPackageExtra, index: number) => {
    if (isExtraSelected(index)) {
      setSelectedExtras((prev) => prev.filter((e) => e.index !== index));
      return;
    }
    setSelectedExtras((prev) => [...prev, toSelectedExtra(extra, index)]);
  };

  const saveBookingToStorage = (
    holds: SlotHold[],
    slots: SelectedBookingSlot[],
    expiresAt: string,
    extras: SelectedBookingExtra[] = selectedExtras
  ) => {
    const holdIds = holds.map((h) => h.holdId);
    const totals = bookingService.computeBookingTotal(pkg?.price || 0, slots.length, extras);
    const data: StoredBookingData = {
      holdId: holdIds[0],
      holdIds,
      packageId,
      packageName: pkg?.name,
      packageType: pkg?.type,
      packagePrice: pkg?.price,
      packageDuration: pkg?.durationMinutes,
      date: slots[0]?.date,
      startTime: slots[0]?.startTime,
      endTime: slots[0]?.endTime,
      slots,
      holdExpiresAt: expiresAt,
      sessionId,
      selectedExtras: extras,
      slotsSubtotal: totals.slotsSubtotal,
      extrasSubtotal: totals.extrasSubtotal,
      totalPrice: totals.totalPrice,
    };
    localStorage.setItem("bookingData", JSON.stringify(data));
  };

  const handleContinueToCheckout = () => {
    if (!activeHolds.length || !holdExpiry) {
      router.push("/checkout");
      return;
    }
    saveBookingToStorage(activeHolds, displaySlots, holdExpiry.toISOString(), selectedExtras);
    router.push("/checkout");
  };

  const handleConfirmSlots = async () => {
    if (!selectedSlots.length || submitting || hasActiveHold) return;
    setSubmitting(true);
    try {
      const result = await bookingService.createMultiSlotHold(
        packageId,
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
        toast.success(`${result.holds.length} slot(s) reserved!`);
        router.push("/checkout");
      } else {
        toast.error(result.error || "Failed to hold slots");
        setSubmitting(false);
        if (selectedDate) loadSlots(selectedDate);
      }
    } catch {
      toast.error("Failed to hold slots");
      setSubmitting(false);
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
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" })
    : "";

  if (loading) {
    return (
      <>
        <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => setProgress(0)} />
        <header className="relative"><Nav /></header>
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Loading booking details...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => setProgress(0)} />
      <header className="relative"><Nav /></header>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.push("/booking")} className="mb-8 text-sm text-gray-500 hover:text-gray-900">
            ← Back to Services
          </button>

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-8">
              <div className="bg-white rounded-xl border border-gray-200 grid md:grid-cols-[3fr_2fr] md:divide-x">
                <div className="p-5">
                  <h2 className="text-sm font-semibold text-center mb-4">{monthLabel}</h2>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAYS.map((d, i) => <div key={i} className="h-8 flex items-center justify-center text-xs text-gray-400">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cell, i) => {
                      if (!cell) return <div key={`e-${i}`} className="h-9" />;
                      const selectable = isDateSelectable(cell.dateStr);
                      const isSelected = selectedDate === cell.dateStr;
                      const hasDot = displaySlots.some((s) => s.date === cell.dateStr);
                      return (
                        <button
                          key={cell.dateStr}
                          type="button"
                          onClick={() => selectDate(cell.dateStr)}
                          disabled={!selectable || submitting}
                          className={`relative h-9 rounded-full text-sm ${isSelected ? "bg-primary text-white font-semibold" : selectable ? "hover:bg-gray-100" : "text-gray-300"}`}
                        >
                          {cell.day}
                          {hasDot && !isSelected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5 border-t md:border-t-0">
                  {selectedDate ? (
                    <>
                      <h3 className="text-sm font-semibold">{selectedDateLabel}</h3>
                      <p className="text-[10px] text-gray-500 uppercase mb-4">Time zone: {timezone.replace(/_/g, " ")}</p>
                      {!hasActiveHold && <p className="text-xs text-gray-500 mb-3">Select multiple slots. Change dates to add more.</p>}
                      {slotsLoading ? <p className="text-sm text-gray-500 py-8 text-center">Loading times...</p>
                        : slotsMessage ? <p className="text-sm text-gray-500 py-8 text-center">{slotsMessage}</p>
                        : (
                          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                            {availableSlots.map((slot) => {
                              const selected = selectedSlots.some((s) => s.date === selectedDate && s.startTime === slot.startTime);
                              return (
                                <button
                                  key={slot.startTime}
                                  type="button"
                                  onClick={() => handleSlotSelect(slot)}
                                  disabled={submitting || hasActiveHold}
                                  className={`py-2.5 text-sm font-medium rounded-lg border ${selected ? "bg-primary text-white border-primary" : "border-gray-300 hover:border-primary"} ${hasActiveHold ? "opacity-50" : ""}`}
                                >
                                  {bookingService.formatTime(slot.startTime)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </>
                  ) : <p className="text-sm text-gray-400 text-center py-10">Select a date</p>}
                </div>
              </div>

              {packageExtras.length > 0 && (
                <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-gray-900">Extras</h2>
                    <p className="text-sm text-gray-500 mt-1">Optional add-ons for your booking</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {packageExtras.map((extra, index) => {
                      const selected = isExtraSelected(index);
                      const imageUrl = bookingService.resolveImageUrl(extra.image);
                      return (
                        <div
                          key={`${extra.title}-${index}`}
                          className={`rounded-xl border overflow-hidden flex flex-col ${selected ? "border-primary ring-1 ring-primary/20" : "border-gray-200"}`}
                        >
                          <div className="aspect-[16/10] bg-gray-100 relative overflow-hidden">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={extra.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{extra.title}</h3>
                              <span className="text-sm font-bold text-primary whitespace-nowrap">
                                {bookingService.formatPrice(extra.price || 0)}
                              </span>
                            </div>
                            {extra.description && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{extra.description}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleExtra(extra, index)}
                              className={`mt-auto w-full py-2.5 text-sm font-semibold rounded-lg border transition-colors ${
                                selected
                                  ? "bg-primary text-white border-primary"
                                  : "border-gray-300 text-gray-700 hover:border-primary hover:text-primary"
                              }`}
                            >
                              {selected ? "Unselect" : "Select"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-24 bg-white rounded-xl border border-gray-100 p-5">
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {bookingService.getTypeLabel(pkg?.type || "")}
                </span>
                <h3 className="text-lg font-bold mt-2">{pkg?.name}</h3>
                <p className="text-sm text-gray-500">{pkg?.durationMinutes} min per slot</p>

                {displaySlots.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Selected ({displaySlots.length})</p>
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {displaySlots.map((slot) => (
                        <li key={slotKey(slot.date, slot.startTime)} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="font-medium">{bookingService.formatDate(slot.date)}</p>
                            <p className="text-xs text-gray-600">{bookingService.formatTime(slot.startTime)} – {bookingService.formatTime(slot.endTime)}</p>
                          </div>
                          {!hasActiveHold && (
                            <button type="button" onClick={() => removeSelectedSlot(slot.date, slot.startTime)} className="text-gray-400 hover:text-red-500">×</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedExtras.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Extras ({selectedExtras.length})</p>
                    <ul className="space-y-2">
                      {selectedExtras.map((extra) => (
                        <li key={`${extra.index}-${extra.title}`} className="flex justify-between text-sm">
                          <span className="text-gray-700">{extra.title}</span>
                          <span className="font-medium">{bookingService.formatPrice(extra.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t space-y-2">
                  {displaySlots.length > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>
                        Slots ({displaySlots.length} × {bookingService.formatPrice(pkg?.price || 0)})
                      </span>
                      <span>{bookingService.formatPrice(pricing.slotsSubtotal)}</span>
                    </div>
                  )}
                  {pricing.extrasSubtotal > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Extras</span>
                      <span>{bookingService.formatPrice(pricing.extrasSubtotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="font-medium">Total</span>
                    <span className="text-2xl font-bold">{bookingService.formatPrice(pricing.totalPrice)}</span>
                  </div>
                </div>

                {remainingTime && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                    <p className="text-amber-700 font-medium">Reserved — {remainingTime} left</p>
                  </div>
                )}

                {hasActiveHold ? (
                  <div className="mt-5 space-y-2">
                    <button onClick={handleContinueToCheckout} className="w-full py-3 bg-primary text-white font-semibold rounded-xl">Continue to Checkout</button>
                    <button onClick={async () => { await releaseCurrentHolds(); setSelectedSlots([]); if (selectedDate) loadSlots(selectedDate, []); }} className="w-full py-2 text-sm text-gray-600">Cancel reservation</button>
                  </div>
                ) : selectedSlots.length > 0 ? (
                  <button onClick={handleConfirmSlots} disabled={submitting} className="mt-5 w-full py-3 bg-primary text-white font-semibold rounded-xl disabled:opacity-60">
                    {submitting ? "Reserving..." : `Reserve ${selectedSlots.length} Slot${selectedSlots.length > 1 ? "s" : ""} & Continue`}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
