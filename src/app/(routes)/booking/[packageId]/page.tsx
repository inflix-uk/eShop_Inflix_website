"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  bookingService,
  BookingPackage,
  BookingSettings,
  TimeSlot,
  SlotHold,
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

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [hold, setHold] = useState<SlotHold | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [sessionId] = useState(() => bookingService.generateSessionId());

  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  useEffect(() => {
    loadInitialData();
  }, [packageId]);

  useEffect(() => {
    if (!holdExpiry) {
      setRemainingTime(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = holdExpiry.getTime() - now.getTime();

      if (diff <= 0) {
        toast.warning("Your slot hold has expired. Please select a new time.");
        setSelectedSlot(null);
        setHold(null);
        setHoldExpiry(null);
        if (selectedDate) loadSlots(selectedDate);
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
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

      if (!settingsData?.isEnabled) {
        toast.error("Booking is currently unavailable");
        router.push("/booking");
        return;
      }

      if (!packageData) {
        toast.error("Package not found");
        router.push("/booking");
        return;
      }

      const todayStr = new Date().toISOString().split("T")[0];
      setSelectedDate(todayStr);
      await loadSlots(todayStr);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load booking data");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const loadSlots = async (date: string) => {
    setSlotsLoading(true);
    setSlotsMessage(null);
    setAvailableSlots([]);

    try {
      const response = await bookingService.getAvailableSlots(packageId, date);

      if (response.blocked) {
        setSlotsMessage(response.reason || "This date is not available for booking");
      } else if (response.noAvailability) {
        setSlotsMessage("No availability on this day");
      } else if (response.slots.length === 0) {
        setSlotsMessage("No slots available for this date");
      } else {
        setAvailableSlots(response.slots);
      }
    } catch (error) {
      console.error("Error loading slots:", error);
      setSlotsMessage("Failed to load available slots");
    } finally {
      setSlotsLoading(false);
    }
  };

  const getMinDate = () => new Date().toISOString().split("T")[0];

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + (settings?.maxAdvanceBookingDays || 60));
    return maxDate.toISOString().split("T")[0];
  };

  const isDateSelectable = (dateStr: string) => {
    const min = getMinDate();
    const max = getMaxDate();
    return dateStr >= min && dateStr <= max;
  };

  const selectDate = (dateStr: string) => {
    if (!isDateSelectable(dateStr)) return;

    setSelectedDate(dateStr);
    setSelectedSlot(null);

    if (hold) {
      bookingService.releaseSlotHold(hold.holdId);
      setHold(null);
      setHoldExpiry(null);
    }

    loadSlots(dateStr);
  };

  const handleSlotSelect = async (slot: TimeSlot) => {
    if (!selectedDate) return;

    if (hold) {
      await bookingService.releaseSlotHold(hold.holdId);
    }

    setSelectedSlot(slot);
    setSubmitting(true);

    try {
      const result = await bookingService.createSlotHold(
        packageId,
        selectedDate,
        slot.startTime,
        sessionId
      );

      if (result.success && result.hold) {
        const bookingData = {
          holdId: result.hold.holdId,
          packageId: packageId,
          packageName: pkg?.name,
          packageType: pkg?.type,
          packagePrice: pkg?.price,
          packageDuration: pkg?.durationMinutes,
          date: selectedDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          holdExpiresAt: result.hold.expiresAt,
          sessionId: sessionId,
        };
        localStorage.setItem("bookingData", JSON.stringify(bookingData));

        toast.success("Slot reserved! Redirecting to checkout...");
        router.push("/checkout");
      } else {
        toast.error(result.error || "Failed to hold slot");
        setSelectedSlot(null);
        loadSlots(selectedDate);
      }
    } catch (error) {
      toast.error("Failed to hold slot");
      setSelectedSlot(null);
    } finally {
      setSubmitting(false);
    }
  };

  const goToPrevMonth = () => {
    setViewMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setViewMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const canGoPrevMonth = useMemo(() => {
    const min = parseDateStr(getMinDate());
    return viewMonth.year > min.year || (viewMonth.year === min.year && viewMonth.month > min.month);
  }, [viewMonth, settings]);

  const canGoNextMonth = useMemo(() => {
    const max = parseDateStr(getMaxDate());
    return viewMonth.year < max.year || (viewMonth.year === max.year && viewMonth.month < max.month);
  }, [viewMonth, settings]);

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

  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-GB", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const timezoneLabel = (settings?.timezone || "Europe/London").replace(/_/g, " ");

  if (loading) {
    return (
      <>
        <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => setProgress(0)} />
        <header className="relative"><Nav /></header>
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <div className="flex justify-center items-center min-h-[600px]">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="text-gray-500">Loading booking details...</p>
            </div>
          </div>
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

          <button
            onClick={() => router.push("/booking")}
            className="group flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="font-medium text-sm">Back to Services</span>
          </button>

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-8 xl:col-span-9">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden grid grid-cols-1 md:grid-cols-[3fr_2fr] md:divide-x divide-gray-200">

                {/* Calendar — 60% */}
                <div className="p-4 sm:p-5 border-b md:border-b-0 border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={goToPrevMonth}
                      disabled={!canGoPrevMonth}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous month"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h2 className="text-sm font-sans font-semibold not-italic text-gray-900">{monthLabel}</h2>
                    <button
                      type="button"
                      onClick={goToNextMonth}
                      disabled={!canGoNextMonth}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next month"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAYS.map((day, i) => (
                      <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((cell, i) => {
                      if (!cell) return <div key={`empty-${i}`} className="h-9" />;

                      const selectable = isDateSelectable(cell.dateStr);
                      const isSelected = selectedDate === cell.dateStr;
                      const isToday = cell.dateStr === getMinDate();

                      return (
                        <button
                          key={cell.dateStr}
                          type="button"
                          onClick={() => selectDate(cell.dateStr)}
                          disabled={!selectable}
                          className={`h-9 w-full max-w-[40px] mx-auto flex items-center justify-center text-sm rounded-full transition-colors ${
                            isSelected
                              ? "bg-primary text-white font-semibold"
                              : selectable
                              ? "text-gray-900 hover:bg-gray-100"
                              : "text-gray-300 cursor-not-allowed"
                          } ${isToday && !isSelected ? "ring-1 ring-primary/40" : ""}`}
                        >
                          {cell.day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots — 40% */}
                <div className="p-4 sm:p-5 min-w-0">
                  {selectedDate ? (
                    <>
                      <h3 className="text-sm font-sans font-semibold not-italic text-gray-900 mb-1">{selectedDateLabel}</h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-4">
                        Time zone: {timezoneLabel}
                      </p>

                      {slotsLoading ? (
                        <div className="flex flex-col items-center justify-center py-10">
                          <div className="relative w-12 h-12 mb-3">
                            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                          </div>
                          <p className="text-sm text-gray-500">Loading times...</p>
                        </div>
                      ) : slotsMessage ? (
                        <div className="text-center py-10">
                          <p className="text-sm font-medium text-gray-900 mb-1">No availability</p>
                          <p className="text-sm text-gray-500">{slotsMessage}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                          {availableSlots.map((slot) => {
                            const isSelected = selectedSlot?.startTime === slot.startTime;
                            return (
                              <button
                                key={slot.startTime}
                                type="button"
                                onClick={() => handleSlotSelect(slot)}
                                disabled={submitting}
                                className={`relative py-2.5 px-3 text-sm font-medium rounded-lg border transition-colors ${
                                  isSelected
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white text-gray-800 border-gray-300 hover:border-primary hover:bg-primary/5"
                                } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                {bookingService.formatTime(slot.startTime)}
                                {isSelected && submitting && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-primary/80 rounded-lg">
                                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-400">
                      Select a date to see available times
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar summary */}
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="sticky top-24">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {pkg?.image ? (
                    <div className="h-40">
                      <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" />
                    </div>
                  ) : null}

                  <div className="p-5">
                    <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-2">
                      {bookingService.getTypeLabel(pkg?.type || "")}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{pkg?.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{pkg?.durationMinutes} minutes</p>

                    <div className="mt-5 pt-4 border-t border-gray-100 space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="font-medium text-gray-900">
                          {selectedDate ? bookingService.formatDate(selectedDate) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Time</span>
                        <span className="font-medium text-gray-900">
                          {selectedSlot
                            ? `${bookingService.formatTime(selectedSlot.startTime)} - ${bookingService.formatTime(selectedSlot.endTime)}`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <span className="font-medium text-gray-900">Total</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {bookingService.formatPrice(pkg?.price || 0)}
                        </span>
                      </div>
                    </div>

                    {remainingTime && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                        <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs text-amber-700 font-medium">Slot reserved</p>
                          <p className="text-lg font-bold font-mono text-amber-800">{remainingTime}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Secure payment
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Instant email confirmation
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
