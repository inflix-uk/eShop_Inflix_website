"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { bookingService, Booking, GroupBookingSlot } from "../../services/bookingService";

const Nav = dynamic(() => import("@/app/components/navbar/Nav"), { ssr: false });
const LoadingBar = dynamic(() => import("react-top-loading-bar"), { ssr: false });

type PaymentUiStatus = "success" | "pending" | "failed";

function getPackageName(booking: Booking | null): string | null {
  if (!booking?.packageId) return booking?.package?.name || null;
  if (typeof booking.packageId === "object" && booking.packageId !== null && "name" in booking.packageId) {
    return (booking.packageId as { name?: string }).name || null;
  }
  return typeof booking.packageId === "string" ? null : booking.package?.name || null;
}

function getPackagePrice(booking: Booking | null): number | null {
  if (!booking) return null;
  if (booking.package?.price != null) return booking.package.price;
  if (typeof booking.packageId === "object" && booking.packageId !== null && "price" in booking.packageId) {
    return (booking.packageId as { price?: number }).price ?? null;
  }
  return null;
}

function getPackageDuration(booking: Booking | null): number | null {
  if (!booking) return null;
  if (booking.package?.durationMinutes != null) return booking.package.durationMinutes;
  if (typeof booking.packageId === "object" && booking.packageId !== null && "durationMinutes" in booking.packageId) {
    return (booking.packageId as { durationMinutes?: number }).durationMinutes ?? null;
  }
  return null;
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <div className={`text-sm font-semibold break-words ${highlight ? "text-primary" : "text-gray-900"}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function PageLoadingShell({ progress = 0 }: { progress?: number }) {
  return (
    <>
      <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => {}} />
      <header className="relative">
        <Nav />
      </header>
      <main className="bg-gradient-to-b from-gray-50 via-white to-gray-50 py-10 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-500 animate-pulse">Loading your booking...</p>
        </div>
      </main>
    </>
  );
}

function BookingConfirmationContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawBookingNumber = params.bookingNumber as string;
  const bookingNumber = rawBookingNumber
    ? rawBookingNumber.trim().charAt(0).toUpperCase() + rawBookingNumber.trim().slice(1)
    : "";

  const [progress, setProgress] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [groupSlots, setGroupSlots] = useState<GroupBookingSlot[] | null>(null);
  const [slotCount, setSlotCount] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<PaymentUiStatus>("pending");

  const paymentSuccessParam = searchParams.get("payment_success");
  const redirectStatusParam = searchParams.get("redirect_status");
  const isPaymentRedirectSuccess =
    paymentSuccessParam === "true" || redirectStatusParam === "succeeded";

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || !bookingNumber) return;

    if (isPaymentRedirectSuccess) {
      setPaymentStatus("success");
    } else if (redirectStatusParam === "failed") {
      setPaymentStatus("failed");
    }

    loadBooking();

    if (isPaymentRedirectSuccess) {
      const timer = setTimeout(() => loadBooking(), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasMounted, bookingNumber, paymentSuccessParam, redirectStatusParam]);

  const loadBooking = async () => {
    if (!bookingNumber || bookingNumber === "undefined" || bookingNumber === "null") {
      setLoading(false);
      return;
    }

    setProgress(30);
    try {
      const result = await bookingService.getBookingByNumber(bookingNumber);
      if (result.booking) {
        setBooking(result.booking);
        setGroupSlots(result.groupSlots || null);
        setSlotCount(result.slotCount || 1);

        if (result.booking.paymentStatus === "paid") {
          setPaymentStatus("success");
        } else if (result.booking.paymentStatus === "failed") {
          setPaymentStatus("failed");
        } else if (isPaymentRedirectSuccess) {
          setPaymentStatus("success");
        }
      }
    } catch (error: unknown) {
      console.error("Error loading booking:", error);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  const statusContent: Record<
    PaymentUiStatus,
    { title: string; subtitle: string; badge: string; badgeClass: string }
  > = {
    success: {
      title: "You're All Set!",
      subtitle: "Your appointment is confirmed. We can't wait to see you.",
      badge: "Confirmed",
      badgeClass: "bg-green-100 text-green-700 border-green-200",
    },
    failed: {
      title: "Payment Unsuccessful",
      subtitle: "We couldn't process your payment. Please try booking again.",
      badge: "Payment Failed",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
    },
    pending: {
      title: "Almost There",
      subtitle: "Your booking is saved. We're waiting for payment confirmation.",
      badge: "Pending",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    },
  };

  const ui = statusContent[paymentStatus];
  const packageName = getPackageName(booking);
  const packagePrice = getPackagePrice(booking);
  const packageDuration = getPackageDuration(booking);
  const displayNumber = booking?.groupBookingNumber || booking?.bookingNumber || bookingNumber;
  const slotsToShow = groupSlots && groupSlots.length > 1
    ? groupSlots
    : booking
    ? [{ bookingNumber: booking.bookingNumber, date: booking.date, startTime: booking.startTime, endTime: booking.endTime, status: booking.status, paymentStatus: booking.paymentStatus }]
    : [];
  const totalPaid = packagePrice != null ? packagePrice * slotCount : null;

  if (!hasMounted || loading) {
    return <PageLoadingShell progress={progress} />;
  }

  return (
    <>
      <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => setProgress(0)} />

      <header className="relative">
        <Nav />
      </header>

      <main className="bg-gradient-to-b from-gray-50 via-white to-gray-50 py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Header */}
            <div className="px-5 sm:px-6 pt-6 pb-5 text-center border-b border-gray-100 bg-gradient-to-b from-primary/5 to-transparent">
              {paymentStatus === "success" ? (
                <div className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-green-100 text-green-600">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div
                  className={`mx-auto w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${
                    paymentStatus === "failed" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {paymentStatus === "failed" ? (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              )}

              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-2 ${ui.badgeClass}`}>
                {paymentStatus === "success" && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {ui.badge}
              </span>

              <h1 className="text-2xl font-bold text-gray-900 mb-1">{ui.title}</h1>
              <p className="text-sm text-gray-600 max-w-md mx-auto">{ui.subtitle}</p>

              {displayNumber && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Ref</span>
                  <span className="text-base font-bold font-mono text-gray-900">{displayNumber}</span>
                </div>
              )}
            </div>

            {(booking || displayNumber) && (
              <div className="px-5 sm:px-6 py-5 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Appointment Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {packageName && (
                    <DetailRow
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      }
                      label="Service"
                      value={packageName}
                    />
                  )}

                  {slotsToShow.length > 1 ? (
                    <div className="sm:col-span-2">
                      <DetailRow
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        label={`Appointments (${slotsToShow.length})`}
                        value={
                          <ul className="space-y-1">
                            {slotsToShow.map((slot) => (
                              <li key={`${slot.date}-${slot.startTime}`}>
                                {bookingService.formatDate(slot.date)} — {bookingService.formatTime(slot.startTime)} – {bookingService.formatTime(slot.endTime)}
                              </li>
                            ))}
                          </ul>
                        }
                      />
                    </div>
                  ) : (
                    <>
                      {booking?.date && (
                        <DetailRow
                          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                          label="Date"
                          value={bookingService.formatDate(booking.date)}
                        />
                      )}
                      {booking?.startTime && (
                        <DetailRow
                          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          label="Time"
                          value={`${bookingService.formatTime(booking.startTime)} – ${bookingService.formatTime(booking.endTime)}`}
                        />
                      )}
                    </>
                  )}

                  {packageDuration != null && (
                    <DetailRow
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      }
                      label="Duration"
                      value={`${packageDuration} minutes`}
                    />
                  )}

                  {totalPaid != null && (
                    <DetailRow
                      icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      label="Amount Paid"
                      value={slotCount > 1 ? `${bookingService.formatPrice(totalPaid)} (${slotCount} slots)` : bookingService.formatPrice(totalPaid)}
                      highlight
                    />
                  )}

                  {booking?.status && (
                    <DetailRow
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                      label="Booking Status"
                      value={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    />
                  )}
                </div>

                {booking?.customer && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600">
                      <span>{booking.customer.name}</span>
                      <span className="text-gray-300 hidden sm:inline">|</span>
                      <span>{booking.customer.email}</span>
                      {booking.customer.phone && (
                        <>
                          <span className="text-gray-300 hidden sm:inline">|</span>
                          <span>{booking.customer.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentStatus === "success" && (
              <div className="px-5 sm:px-6 py-4 bg-primary/5 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-900 mb-2">What&apos;s next</p>
                <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    {booking?.customer?.email
                      ? `Confirmation email sent to ${booking.customer.email}`
                      : "You'll receive a confirmation email shortly"}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">•</span>
                    Arrive a few minutes before your appointment
                  </li>
                </ul>
              </div>
            )}

            <div className="px-5 sm:px-6 py-5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  href="/booking"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-white py-3 px-5 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Book Another Appointment
                </Link>
                <Link
                  href="/"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-gray-700 py-3 px-5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<PageLoadingShell />}>
      <BookingConfirmationContent />
    </Suspense>
  );
}
