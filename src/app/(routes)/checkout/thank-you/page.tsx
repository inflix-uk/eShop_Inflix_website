"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { OrderService } from "../services/orderService";
import {
  ensureTrackingReady,
} from "@/app/lib/analyticsEvents";
import {
  getConsentPreferences,
  hasMarketingConsent,
} from "@/app/lib/cookieConsent";


export interface OrderItem {
  productName: string;
  productId: string;
  qty: number;
  salePrice: number;
}

export interface Order {
  totalOrderValue: number;
  orderNumber: string;
  cart: OrderItem[];
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}

// Trustpilot JavaScript Integration Key
const TRUSTPILOT_KEY = 'apBDpgcgPa9iX8ag';

// Trustpilot invitation config type
interface TrustpilotConfig {
  key: string;
  recipientEmail: string;
  recipientName: string;
  referenceId: string;
  source: string;
}

export default function ThankYouPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const hasTracked = useRef(false);
  const hasTrustpilotInvited = useRef(false);

  useEffect(() => {
    // Get order details from localStorage or session
    const storedOrder = localStorage.getItem("lastOrder");
    console.log('📦 Checking localStorage for order data:', storedOrder);
    if (storedOrder) {
      try {
        const orderData = JSON.parse(storedOrder);
        console.log('✅ Order data loaded:', orderData);
        setOrder(orderData);
      } catch (error) {
        console.error("❌ Error parsing order data:", error);
      }
    } else {
      console.warn('⚠️ No order data found in localStorage');
    }
  }, []);

  // Browser conversions: GA4 purchase (analytics) + ads_purchase/pixels (marketing).
  useEffect(() => {
    if (!order || hasTracked.current) return;
    hasTracked.current = true;

    const prefs = getConsentPreferences();
    const run = async () => {
      if (prefs.analytics || prefs.marketing) {
        await ensureTrackingReady();
      }
      const orderService = OrderService.init();
      orderService.trackPurchaseEvent(
        order.orderNumber,
        order.totalOrderValue,
        order.cart,
        {
          email: order.customerEmail,
          phone: order.customerPhone,
        }
      );
    };
    void run();
  }, [order]);

  // Trustpilot invite transmits email — marketing consent required.
  useEffect(() => {
    if (!order?.customerEmail || !order?.orderNumber || hasTrustpilotInvited.current) {
      return;
    }
    if (!hasMarketingConsent()) {
      return;
    }

    const SCRIPT_ID = 'trustpilot-invite-script';

    const invokeInvitation = () => {
      const trustpilot = (window as unknown as {
        Trustpilot?: { Invoke: (config: TrustpilotConfig) => void };
      }).Trustpilot;

      if (!trustpilot) {
        return false;
      }

      trustpilot.Invoke({
        key: TRUSTPILOT_KEY,
        recipientEmail: order.customerEmail || '',
        recipientName: order.customerName || 'Customer',
        referenceId: order.orderNumber,
        source: 'InvitationScript',
      });
      hasTrustpilotInvited.current = true;
      return true;
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as unknown as { Trustpilot?: unknown }).Trustpilot) {
        invokeInvitation();
      } else {
        existingScript.addEventListener('load', () => {
          invokeInvitation();
        }, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://invitejs.trustpilot.com/tp.min.js';
    script.async = true;
    script.onload = () => {
      if (!invokeInvitation()) {
        console.warn('Trustpilot invitation API unavailable after script load');
      }
    };
    script.onerror = () => {
      console.warn('Trustpilot invitation script could not be loaded (blocked or offline)');
    };
    document.head.appendChild(script);
  }, [order]);

  // Clean up order data after some time
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.removeItem("lastOrder");
    }, 300000); // Clear after 5 minutes

    return () => clearTimeout(timer);
  }, []);

  // Header/navbar and the `checkout-themed` wrapper come from ./layout.tsx so this
  // page shares the checkout's brand chrome and CMS theme tokens.
  return (
    <main className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="checkout-billing-panel shadow-sm">
          {/* Success icon — brand primary, not a hard-coded colour */}
          <div className="mb-8 flex flex-col items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
              <svg
                className="h-12 w-12 stroke-primary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>

          {/* Thank You Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Thank you for your order!
            </h1>
            <p className="text-lg text-gray-600">
              Your order has been confirmed. You will receive an email confirmation shortly.
            </p>

            {order && order.orderNumber && (
              <div className="mt-6 p-4 rounded-md border border-[var(--checkout-border)] bg-[var(--checkout-panel-shell)] hidden">
                <p className="text-sm text-gray-600">Order Number:</p>
                <p className="text-xl font-semibold text-primary">#{order.orderNumber}</p>
              </div>
            )}
          </div>

          {/* Order Details (if available) */}
          {order && order.cart && order.cart.length > 0 && (
            <div className="border-t border-[var(--checkout-border)] pt-6 mb-6 hidden">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                {order.cart.map((item, index) => (
                  <div key={index} className="flex justify-between py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.productName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.qty}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      £{(item.salePrice * item.qty).toFixed(2)}
                    </p>
                  </div>
                ))}
                <div className="border-t border-[var(--checkout-border)] pt-3">
                  <div className="flex justify-between">
                    <p className="text-base font-semibold text-gray-900">Total</p>
                    <p className="text-base font-semibold text-primary">
                      £{order.totalOrderValue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/customer/my-orders"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-3 bg-primary text-base font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              View My Orders
            </Link>
            <Link
              href="/"
              className="inline-flex justify-center rounded-md border border-[var(--checkout-border)] shadow-sm px-6 py-3 bg-[var(--checkout-input-bg)] text-base font-medium hover:border-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Continue Shopping
            </Link>
          </div>

          {/* Additional Information */}
          <div className="mt-8 p-4 rounded-md border border-[var(--checkout-border)] bg-[var(--checkout-panel-shell)]">
            <p className="text-sm text-gray-600 text-center">
              A confirmation email has been sent to your registered email address.
              Please check your inbox for order details and tracking information.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
