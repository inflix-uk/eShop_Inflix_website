"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { resolveProductLineItem } from "../utils/variantUtils";
import {
  api,
  getActiveShippingMethods,
  logCheckoutEvent,
  type ShippingMethod,
} from "../../checkout/api";
import { OrderService } from "../../checkout/services";

interface ProductExpressCheckoutProps {
  product: any;
  selectedVariant: any;
  updatedPrice: number;
  disabled?: boolean;
}

// A wallet shipping option, priced the way the backend's resolveShipping
// prices it (free-shipping threshold applies to the cheapest method only).
interface ExpressShippingRate {
  id: string;
  displayName: string;
  amount: number; // pence
  method: ShippingMethod;
}

function buildShippingRates(
  methods: ShippingMethod[],
  subtotal: number,
  freeShippingEnabled: boolean,
  freeShippingThreshold: number | null
): ExpressShippingRate[] {
  const sorted = [...methods].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const qualifiesForFree =
    freeShippingEnabled &&
    Number(freeShippingThreshold) > 0 &&
    subtotal >= Number(freeShippingThreshold);

  return sorted.map((m, i) => ({
    id: m._id,
    displayName: m.name,
    amount: qualifiesForFree && i === 0 ? 0 : Math.round((m.price || 0) * 100),
    method: m,
  }));
}

// Inner component that uses Stripe hooks
function ExpressCheckoutInner({
  product,
  selectedVariant,
  updatedPrice,
  shippingRates,
  onSuccess,
  onError,
}: {
  product: any;
  selectedVariant: any;
  updatedPrice: number;
  shippingRates: ExpressShippingRate[];
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);
  const productAmount = Math.round(updatedPrice * 100);

  // Handle click - request user details from Apple Pay / Google Pay wallet.
  // Google Pay needs shippingRates whenever a shipping address is requested.
  const handleClick = useCallback(
    (event: { resolve: (options: any) => void }) => {
      elements?.update({ amount: productAmount + (shippingRates[0]?.amount || 0) });
      event.resolve({
        emailRequired: true,
        phoneNumberRequired: true,
        shippingAddressRequired: true,
        billingAddressRequired: true,
        ...(shippingRates.length > 0
          ? {
              shippingRates: shippingRates.map(({ id, displayName, amount }) => ({
                id,
                displayName,
                amount,
              })),
            }
          : {}),
      });
    },
    [elements, productAmount, shippingRates]
  );

  // Keep the wallet total in step with the shipping option the customer picks.
  const handleShippingRateChange = useCallback(
    (event: any) => {
      const rate = shippingRates.find((r) => r.id === event.shippingRate?.id);
      elements?.update({ amount: productAmount + (rate?.amount || 0) });
      event.resolve();
    },
    [elements, productAmount, shippingRates]
  );

  const handleConfirm = useCallback(async (event: any) => {
    if (!stripe || !elements) {
      onError("Payment system not ready");
      return;
    }

    try {
      // Submit the elements first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || "Payment failed");
        return;
      }

      // Extract user details from Apple Pay / Google Pay wallet
      const shippingAddress = event.shippingAddress || {};
      const billingDetails = event.billingDetails || {};
      const payerEmail = event.payerEmail || billingDetails.email || "";
      const payerPhone = event.payerPhone || billingDetails.phone || shippingAddress.phone || "";
      const payerName = event.payerName || billingDetails.name || "";

      // Parse name into first/last
      const nameParts = payerName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      if (!payerEmail) {
        onError("Your wallet did not provide an email. Please try a different payment method.");
        return;
      }

      const cart = [
        {
          _id: selectedVariant?._id || product._id,
          productId: product._id,
          productName: product.name,
          name: selectedVariant?.name || product.name,
          salePrice: updatedPrice,
          qty: 1,
          variantImages: selectedVariant?.variantImages || product.Gallery_Images,
        },
      ];

      const shippingInformation = {
        firstName: firstName,
        lastName: lastName,
        companyName: "",
        address: shippingAddress.line1 || shippingAddress.address?.line1 || "",
        apartment: shippingAddress.line2 || shippingAddress.address?.line2 || "",
        country: shippingAddress.country || shippingAddress.address?.country || "United Kingdom",
        city: shippingAddress.city || shippingAddress.address?.city || "",
        county: shippingAddress.state || shippingAddress.address?.state || "",
        postalCode: shippingAddress.postal_code || shippingAddress.address?.postal_code || "",
        phoneNumber: payerPhone,
      };

      const contactInformation = { email: payerEmail, userId: "express_checkout" };

      const chosenRate =
        shippingRates.find((r) => r.id === event.shippingRate?.id) || shippingRates[0];
      const shippingMethod = chosenRate
        ? {
            name: chosenRate.method.name,
            price: chosenRate.amount / 100,
            estimatedDays: chosenRate.method.estimatedDays || "",
            methodId: chosenRate.method._id,
          }
        : null;

      // 1. Create the order first (status Failed until payment is verified),
      //    so the charge is always attached to an order the admin can see.
      const orderResponse = await OrderService.init().createOrder({
        cart: cart as any,
        shippingInformation: shippingInformation as any,
        contactInformation: contactInformation as any,
        coupon: null,
        orderNumber: null,
        status: "Failed",
        shippingMethod,
      });
      const orderNumber = orderResponse ? orderResponse.orderNumber : undefined;

      if (!orderNumber) {
        logCheckoutEvent({ event: "frontend.product_express.order_create_failed", data: { productId: product._id } });
        onError("Failed to create order. Please try again.");
        return;
      }

      logCheckoutEvent({ event: "frontend.product_express.order_created", orderNumber });

      // 2. Create the PaymentIntent tied to that order
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/create-payment-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartproducts: cart,
            coupondata: null,
            shippingInformation,
            contactInformation,
            orderNumber,
            isExpressCheckout: true,
            shippingMethod,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.clientSecret) {
        onError(data.error?.message || "Failed to create payment");
        return;
      }

      // 3. Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?express_payment=true&product_id=${product._id}`,
        },
        redirect: "if_required",
      });

      if (error) {
        logCheckoutEvent({
          event: "frontend.product_express.confirm_failed",
          orderNumber,
          paymentIntentId: data.paymentIntentId,
          data: { message: error.message },
        });
        onError(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // 4. Mark the order paid — the backend verifies the payment with
        //    Stripe, reduces stock and sends the confirmation emails. If this
        //    call is lost, the Stripe webhook still moves the order to Pending.
        try {
          await api.updateOrderAfterPayment({
            cart,
            shippingInformation,
            contactInformation,
            coupon: null,
            paymentDetails: {
              paymentIntentId: paymentIntent.id,
              paymentMethodId:
                typeof paymentIntent.payment_method === "string"
                  ? paymentIntent.payment_method
                  : paymentIntent.payment_method?.id || null,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              status: paymentIntent.status,
              paidAt: new Date(),
            },
            orderNumber,
            status: "Pending",
            shippingMethod,
          });
        } catch (updateError: any) {
          logCheckoutEvent({
            event: "frontend.product_express.mark_paid_failed",
            orderNumber,
            paymentIntentId: paymentIntent.id,
            data: { message: updateError?.response?.data?.message || updateError?.message },
          });
        }

        // Pass customer data along with payment intent for order storage
        onSuccess({
          ...paymentIntent,
          orderNumber,
          totalOrderValue: updatedPrice + (chosenRate ? chosenRate.amount / 100 : 0),
          customerData: {
            email: payerEmail,
            name: payerName,
            firstName,
            lastName,
            phone: payerPhone,
            shippingAddress,
          },
        });
      }
    } catch (err: any) {
      console.error("Express checkout error:", err);
      onError(err.message || "Payment failed");
    }
  }, [stripe, elements, product, selectedVariant, updatedPrice, shippingRates, onSuccess, onError]);

  return (
    <div className="w-full">
      <ExpressCheckoutElement
        onClick={handleClick}
        onShippingRateChange={handleShippingRateChange}
        onConfirm={handleConfirm}
        onReady={() => setIsReady(true)}
        onLoadError={(error) => {
          console.log("Express checkout not available:", error);
        }}
        options={{
          buttonType: {
            applePay: "buy",
            googlePay: "buy",
          },
          buttonTheme: {
            applePay: "black",
            googlePay: "black",
          },
          // Single full-width column (matches the Add-to-Cart button width).
          // A concrete large `maxRows` gives Stripe enough rows to stack every
          // wallet, so its *auto* overflow has nothing to collapse into "See more".
          // We must NOT use `overflow: "never"` here — it reproducibly breaks the
          // element (stuck on "Loading payment options...").
          layout: {
            maxColumns: 1,
            maxRows: 10,
          },
        }}
      />
      {!isReady && (
        <div className="text-center text-xs text-gray-400 mt-1">
          Loading payment options...
        </div>
      )}
    </div>
  );
}

// Main component
export default function ProductExpressCheckout({
  product,
  selectedVariant,
  updatedPrice,
  disabled = false,
}: ProductExpressCheckoutProps) {
  const router = useRouter();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lineItem = useMemo(
    () => resolveProductLineItem(product, selectedVariant),
    [product, selectedVariant]
  );

  const [shippingSettings, setShippingSettings] = useState<{
    methods: ShippingMethod[];
    freeShippingEnabled: boolean;
    freeShippingThreshold: number | null;
  } | null>(null);

  // Initialize Stripe
  useEffect(() => {
    const initStripe = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config`);
        const data = await response.json();
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (err) {
        console.error("Failed to initialize Stripe:", err);
      }
    };
    initStripe();
  }, []);

  // Shipping methods, so wallet buyers pay for delivery like checkout buyers do
  useEffect(() => {
    getActiveShippingMethods()
      .then((response) => {
        setShippingSettings({
          methods: response.success ? response.data.methods || [] : [],
          freeShippingEnabled: !!response.data?.freeShippingEnabled,
          freeShippingThreshold: response.data?.freeShippingThreshold ?? null,
        });
      })
      .catch((err) => {
        console.error("Failed to load shipping methods:", err);
        setShippingSettings({ methods: [], freeShippingEnabled: false, freeShippingThreshold: null });
      });
  }, []);

  const shippingRates = useMemo(
    () =>
      shippingSettings
        ? buildShippingRates(
            shippingSettings.methods,
            updatedPrice,
            shippingSettings.freeShippingEnabled,
            shippingSettings.freeShippingThreshold
          )
        : [],
    [shippingSettings, updatedPrice]
  );

  const handleSuccess = useCallback(
    (paymentIntent: any) => {
      console.log("Express payment successful:", paymentIntent.id);

      // Extract customer data from wallet (passed from handleConfirm)
      const customerData = paymentIntent.customerData || {};

      // Store order data for thank-you page with real customer info
      const orderData = {
        totalOrderValue: paymentIntent.totalOrderValue ?? updatedPrice,
        orderNumber: paymentIntent.orderNumber || paymentIntent.id,
        cart: [
          {
            productName: product.name,
            productId: product._id,
            qty: 1,
            salePrice: updatedPrice,
          },
        ],
        customerEmail: customerData.email || "",
        customerName: customerData.name || `${customerData.firstName || ""} ${customerData.lastName || ""}`.trim() || "Customer",
        customerPhone: customerData.phone || "",
        shippingAddress: customerData.shippingAddress || null,
        isExpressCheckout: true,
      };
      localStorage.setItem("lastOrder", JSON.stringify(orderData));

      // Redirect to thank you page
      router.push("/checkout/thank-you?express=true");
    },
    [product, updatedPrice, router]
  );

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsProcessing(false);
    setTimeout(() => setError(null), 5000);
  }, []);

  // Don't render if disabled or no purchasable line item
  if (disabled || !lineItem || updatedPrice <= 0) {
    return null;
  }

  // Don't render until Stripe and shipping options are loaded
  if (!stripePromise || !shippingSettings) {
    return null;
  }

  // Product plus the default (first) shipping option, in pence
  const amount = Math.round(updatedPrice * 100) + (shippingRates[0]?.amount || 0);

  return (
    <div className="mt-4 mb-2">
      <Elements
        stripe={stripePromise}
        options={{
          mode: "payment",
          amount: amount,
          currency: "gbp",
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#046d38",
            },
          },
        }}
      >
        <ExpressCheckoutInner
          product={product}
          selectedVariant={lineItem}
          updatedPrice={updatedPrice}
          shippingRates={shippingRates}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </Elements>

      {error && (
        <div className="mt-2 text-sm text-red-600 text-center">{error}</div>
      )}

      {isProcessing && (
        <div className="mt-2 text-sm text-gray-500 text-center">
          Processing payment...
        </div>
      )}
    </div>
  );
}
