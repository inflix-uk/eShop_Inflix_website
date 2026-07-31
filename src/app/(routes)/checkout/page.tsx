"use client";
import dynamic from "next/dynamic";
import React, { useState, useEffect, useRef } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { useAuth } from "@/app/context/Auth";
import { useCheckout } from "./hooks/useCheckout";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { api } from "./api";
import type { CheckoutBookingData } from "@/app/(routes)/checkout/components/ProductDetails";
import { fetchBookingEnabled } from "@/app/(routes)/booking/services/bookingService";

// Dynamic imports (booking checkout is handled inline on this page)
const NewsletterModal = dynamic(
  () => import("@/app/components/common/NewsletterModal"),
  { ssr: false }
);


const NavbarVariantTestBar = dynamic(
  () => import("@/app/components/navbar/NavbarVariantTestBar"),
  { ssr: false }
);

const Nav = dynamic(() => import("@/app/components/navbar/Nav"), {
  ssr: false,
});

const TopBar = dynamic(() => import("@/app/topbar/page"), { ssr: false });

const LoadingBar = dynamic(() => import("react-top-loading-bar"), {
  ssr: false,
});

const LoginForm = dynamic(
  () => import("@/app/(routes)/checkout/components/LoginForm"),
  { ssr: false }
);

const RegisterForm = dynamic(
  () => import("@/app/(routes)/checkout/components/RegisterForm"),
  { ssr: false }
);

const ProductDetails = dynamic(
  () => import("@/app/(routes)/checkout/components/ProductDetails"),
  { ssr: false }
);

const PaymentForm = dynamic(
  () => import("@/app/(routes)/checkout/components/PaymentForm"),
  { ssr: false }
);

import TrustBoxWidget from "@/app/components/trusBoxWidget";
import CheckoutBenefits from "./components/checkout-benefits";
import PaymentLogos from "@/app/components/PaymentLogos";
import PaymentVendorScripts from "@/app/components/PaymentVendorScripts";
import { trackBeginCheckout } from "@/app/lib/analyticsEvents";
import type { NavbarVariantTestConfig } from "@/app/services/navbarVariantTestPublicService";

// Booking data loaded from localStorage when user arrives from booking flow
const API_URL = (() => {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").trim();
  return raw.endsWith("/") ? raw : `${raw}/`;
})();

export default function CheckoutPage() {
  const auth = useAuth();
  const router = useRouter();

  // Booking state (detected via localStorage - no URL query param)
  const [bookingData, setBookingData] = useState<CheckoutBookingData | null>(null);
  const [bookingHoldExpiry, setBookingHoldExpiry] = useState<string | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingClientSecret, setBookingClientSecret] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);

  const hasBooking = !!bookingData;

  const {
    // State
    progress,
    products,
    errors,
    shippingInformation,
    appliedCoupon,
    enteredCoupon,
    isCouponValid,
    couponError,
    totalSalePrice,
    discountedPrice,
    stripePromise,
    clientSecret,
    email,
    password,
    confirmPassword,
    isChecked,
    showWarning,
    generalError,

    // Embedded payment state
    isPaymentReady,
    isProcessingPayment,
    paymentError,

    // Shipping state
    shippingMethods,
    selectedShippingMethod,
    shippingCost,
    freeShippingThreshold,
    freeShippingEnabled,

    // Setters
    setEmail,
    setPassword,
    setConfirmPassword,
    setProgress,

    // Handlers
    handleLogin,
    handleCouponInputChange,
    handleApplyCoupon,
    handleShippingChange,
    handleTermsCheckboxChange,
    handleShippingMethodChange,
    removeFromCart,
    handlePlaceOrder,
    handleRegisterAndPlaceOrder,

    // Embedded payment handlers
    handlePaymentSuccess,
    resetPaymentState,
    validateAndCreateOrder,
    validateAndCreateOrderFromWallet,
    handleExpressShippingRateChange,
    expressShippingRates,
  } = useCheckout();

  const isBookingOnly = hasBooking && products.length === 0;
  const activeClientSecret = isBookingOnly ? bookingClientSecret : clientSecret;
  const beginCheckoutTracked = useRef(false);
  const bnplAmountPence =
    !isBookingOnly && totalSalePrice > 0 ? Math.round(totalSalePrice * 100) : 0;
  const showBnplMessaging = bnplAmountPence >= 100;

  useEffect(() => {
    if (beginCheckoutTracked.current || isBookingOnly || products.length === 0) return;
    beginCheckoutTracked.current = true;

    trackBeginCheckout(
      products.map((item) => ({
        productId: item._id,
        name: item.productName || item.name,
        price: item.salePrice,
        quantity: item.qty,
      })),
      discountedPrice ?? totalSalePrice,
      {
        email: email || undefined,
        phone: shippingInformation?.phoneNumber || undefined,
      }
    );
  }, [
    products,
    discountedPrice,
    totalSalePrice,
    email,
    shippingInformation?.phoneNumber,
    isBookingOnly,
  ]);

  // Additional local state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [stockData, setStockData] = useState<Record<string, { availableQuantity: number; inStock: boolean }>>({});
  const [navbarConfig, setNavbarConfig] = useState<NavbarVariantTestConfig | null>(null);
  const [navbarLoaded, setNavbarLoaded] = useState(false);

  // Fetch navbar config on mount
  useEffect(() => {
    const fetchNavbarConfig = async () => {
      try {
        const res = await fetch(`${API_URL}navbar-variant-test/public`);
        if (res.ok) {
          const json = await res.json();
          // API returns { success: true, data: { config: {...} } }
          const config = json?.data?.config || null;
          setNavbarConfig(config);
        }
      } catch (err) {
        console.error("Failed to fetch navbar config:", err);
      } finally {
        setNavbarLoaded(true);
      }
    };
    fetchNavbarConfig();
  }, []);

  const toggleFormVisibility = () => setShowForm(!showForm);

  const normalizeCheckoutBooking = (parsed: CheckoutBookingData): CheckoutBookingData => {
    const slots =
      parsed.slots?.length > 0
        ? parsed.slots
        : parsed.date && parsed.startTime
        ? [{ date: parsed.date, startTime: parsed.startTime, endTime: parsed.endTime || parsed.startTime, holdId: parsed.holdId }]
        : [];
    const holdIds =
      parsed.holdIds ||
      (parsed.holdId ? [parsed.holdId] : slots.map((s) => s.holdId).filter(Boolean) as string[]);
    const selectedExtras = parsed.selectedExtras || [];
    const slotsSubtotal =
      parsed.slotsSubtotal ?? (parsed.packagePrice || 0) * Math.max(slots.length, 1);
    const extrasSubtotal =
      parsed.extrasSubtotal ??
      selectedExtras.reduce((sum, extra) => sum + (extra.price || 0), 0);
    return {
      ...parsed,
      slots,
      holdIds,
      selectedExtras,
      slotsSubtotal,
      extrasSubtotal,
      totalPrice: parsed.totalPrice ?? slotsSubtotal + extrasSubtotal,
    };
  };

  const getBookingHoldIds = (data: CheckoutBookingData) => {
    if (data.holdIds?.length) return data.holdIds;
    const fromSlots = data.slots?.map((s) => s.holdId).filter(Boolean) as string[];
    if (fromSlots.length) return fromSlots;
    return data.holdId ? [data.holdId] : [];
  };

  const getBookingTotal = (data: CheckoutBookingData) => {
    if (data.totalPrice != null) return data.totalPrice;
    const slotsSubtotal = data.packagePrice * Math.max(data.slots?.length || 1, 1);
    const extrasSubtotal = (data.selectedExtras || []).reduce((sum, e) => sum + (e.price || 0), 0);
    return slotsSubtotal + extrasSubtotal;
  };

  const clearExpiredBooking = async (
    data: CheckoutBookingData,
    message = "Your slot reservation has expired. Please select a new time."
  ) => {
    const holdIds = getBookingHoldIds(data);
    const sessionId = data.sessionId;
    if (sessionId && holdIds.length) {
      try {
        await fetch(`${API_URL}release/booking/hold`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            holdIds.length > 1 ? { holdIds, sessionId } : { holdId: holdIds[0], sessionId }
          ),
        });
      } catch {
        // best effort
      }
    }
    localStorage.removeItem("bookingData");
    setBookingData(null);
    setBookingHoldExpiry(null);
    setBookingClientSecret(null);
    setBookingNumber(null);
    toast.error(message);
    const bookingEnabled = await fetchBookingEnabled(API_URL);
    if (bookingEnabled) {
      router.push(`/booking/${data.packageId}`);
    } else if (products.length === 0) {
      router.push("/");
    }
  };

  const isBookingHoldExpired = (holdExpiresAt: string) =>
    new Date(holdExpiresAt).getTime() <= Date.now();

  // Load booking data from localStorage — validate expiry + server holds immediately
  useEffect(() => {
    let cancelled = false;

    const loadBookingFromStorage = async () => {
      const raw = localStorage.getItem("bookingData");
      if (!raw) return;

      const bookingEnabled = await fetchBookingEnabled(API_URL);
      if (!bookingEnabled) {
        localStorage.removeItem("bookingData");
        return;
      }

      try {
        const parsed = normalizeCheckoutBooking(JSON.parse(raw) as CheckoutBookingData);

        if (isBookingHoldExpired(parsed.holdExpiresAt)) {
          if (!cancelled) {
            await clearExpiredBooking(parsed);
          }
          return;
        }

        const holdIds = getBookingHoldIds(parsed);
        if (holdIds.length && parsed.sessionId) {
          const verifyRes = await fetch(`${API_URL}verify/booking/holds`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ holdIds, sessionId: parsed.sessionId }),
          });
          const verifyJson = await verifyRes.json().catch(() => ({}));

          if (!verifyRes.ok || !verifyJson.valid) {
            if (!cancelled) {
              await clearExpiredBooking(
                parsed,
                verifyJson.error || "Your slot reservation is no longer valid. Please select a new time."
              );
            }
            return;
          }

          if (verifyJson.expiresAt && !cancelled) {
            parsed.holdExpiresAt = verifyJson.expiresAt;
            localStorage.setItem("bookingData", JSON.stringify(parsed));
          }
        }

        if (!cancelled) {
          setBookingData(parsed);
          setBookingHoldExpiry(parsed.holdExpiresAt);
        }
      } catch {
        localStorage.removeItem("bookingData");
      }
    };

    loadBookingFromStorage();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleRemoveBooking = async () => {
    if (bookingData) {
      const holdIds = getBookingHoldIds(bookingData);
      const sessionId = bookingData.sessionId;
      if (sessionId && holdIds.length) {
        try {
          await fetch(`${API_URL}release/booking/hold`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              holdIds.length > 1
                ? { holdIds, sessionId }
                : { holdId: holdIds[0], sessionId }
            ),
          });
        } catch {
          // best effort
        }
      }
    }
    localStorage.removeItem("bookingData");
    setBookingData(null);
    setBookingHoldExpiry(null);
    setBookingClientSecret(null);
    setBookingNumber(null);
    if (products.length === 0) {
      const bookingEnabled = await fetchBookingEnabled(API_URL);
      router.push(bookingEnabled ? "/booking" : "/");
    }
  };

  // Booking hold expiry check (while user stays on checkout)
  useEffect(() => {
    if (!bookingHoldExpiry || !bookingData) return;

    const checkExpiry = () => {
      if (isBookingHoldExpired(bookingHoldExpiry)) {
        clearExpiredBooking(bookingData);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 5000);
    return () => clearInterval(interval);
  }, [bookingHoldExpiry, bookingData, router]);

  // Handle booking checkout - creates booking + payment intent
  const handleBookingCheckout = async () => {
    if (!bookingData) return;

    if (isBookingHoldExpired(bookingData.holdExpiresAt)) {
      await clearExpiredBooking(bookingData);
      return;
    }

    const holdIds = getBookingHoldIds(bookingData);
    if (holdIds.length && bookingData.sessionId) {
      const verifyRes = await fetch(`${API_URL}verify/booking/holds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdIds, sessionId: bookingData.sessionId }),
      });
      const verifyJson = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyJson.valid) {
        await clearExpiredBooking(
          bookingData,
          verifyJson.error || "Your slot reservation is no longer valid. Please select a new time."
        );
        return;
      }
    }
    
    // Validate shipping info
    if (!shippingInformation.firstName || !shippingInformation.lastName) {
      toast.error("Please enter your name");
      return;
    }
    if (!email && !auth.user?.email) {
      toast.error("Please enter your email");
      return;
    }
    if (!shippingInformation.phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }
    if (!isChecked) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    setBookingSubmitting(true);
    setProgress(30);

    try {
      const customerInfo = {
        name: `${shippingInformation.firstName} ${shippingInformation.lastName}`.trim(),
        email: email || auth.user?.email || "",
        phone: shippingInformation.phoneNumber,
      };

      const holdIds = getBookingHoldIds(bookingData);
      const totalAmount = getBookingTotal(bookingData);
      const selectedExtras = bookingData.selectedExtras || [];
      const bookingPayload = holdIds.length > 1
        ? { holdIds, customer: customerInfo, notes: "", extras: selectedExtras }
        : { holdId: holdIds[0], customer: customerInfo, notes: "", extras: selectedExtras };

      const bookingResponse = await fetch(`${API_URL}create/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      const bookingResult = await bookingResponse.json();
      setProgress(60);

      if (!bookingResponse.ok || !bookingResult.booking) {
        toast.error(bookingResult.error || "Failed to create booking");
        setBookingSubmitting(false);
        return;
      }

      setBookingNumber(bookingResult.groupBookingNumber || bookingResult.booking.bookingNumber);

      const paymentResponse = await fetch(`${API_URL}create/booking/payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingResult.booking.bookingId,
          amount: bookingResult.totalAmount ?? totalAmount,
        }),
      });

      const paymentResult = await paymentResponse.json();
      setProgress(100);

      if (!paymentResponse.ok || !paymentResult.clientSecret) {
        toast.error(paymentResult.error || "Failed to initialize payment");
        setBookingSubmitting(false);
        return;
      }

      setBookingClientSecret(paymentResult.clientSecret);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Check for payment success in URL and handle order completion (for redirects from Stripe hosted checkout or 3DS)
  useEffect(() => {
    let trackingScript: HTMLScriptElement | null = null;

    const handlePaymentSuccessFromUrl = async () => {
      const queryParams = new URLSearchParams(window.location.search);

      // Check for Stripe hosted checkout session redirect
      const paymentSuccess = queryParams.get("payment_success");
      const sessionId = queryParams.get("session_id");

      // Check for 3DS redirect from embedded payment (fallback)
      const paymentIntentSuccess = queryParams.get("payment_intent_success");
      const paymentIntentClientSecret = queryParams.get("payment_intent_client_secret");

      console.log('ðŸ” Checking payment status:', { paymentSuccess, sessionId, paymentIntentSuccess });

      // Handle 3DS redirect from embedded payment
      if (paymentIntentSuccess === "true" && paymentIntentClientSecret && stripePromise) {
        console.log('âœ… 3DS redirect detected! Handling payment completion...');
        try {
          const stripe = await stripePromise;
          if (stripe) {
            const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
            if (paymentIntent && paymentIntent.status === 'succeeded') {
              // Call the payment success handler from the hook
              handlePaymentSuccess({ paymentIntent });
            }
          }
        } catch (error) {
          console.error("Error handling 3DS redirect:", error);
          router.push("/checkout/thank-you");
        }
        return;
      }

      // Handle Stripe hosted checkout session redirect (legacy fallback)
      if (paymentSuccess === "true" && sessionId) {
        console.log('âœ… Hosted checkout payment success detected! Starting order update...');
        try {
          setProgress(50);

          // Get stored order number from localStorage
          const storedOrderNumber = localStorage.getItem("createdOrderNumber");
          console.log('ðŸ“¦ Stored order number:', storedOrderNumber);

          if (!storedOrderNumber) {
            console.error("âŒ No order number found in localStorage");
            router.push("/checkout/thank-you");
            return;
          }

          // First: Retrieve payment details from Stripe session
          console.log('ðŸ’³ Retrieving payment details from Stripe...');
          let paymentDetails;
          try {
            const userForOrder = JSON.parse(
              localStorage.getItem("userForOrder") || "{}"
            );
            const retrieveEmail =
              userForOrder?.email ||
              auth.user?.email ||
              'pending@checkout.local';
            paymentDetails = await api.retrievePaymentDetailsFromSession(
              sessionId,
              retrieveEmail
            );
            console.log('âœ… Payment details retrieved:', paymentDetails);
          } catch (error) {
            console.error("âŒ Failed to retrieve payment details:", error);
            router.push("/checkout/thank-you");
            return;
          }

          // Get cart data and contact info for order creation
          const cartData = JSON.parse(localStorage.getItem("cart") || "[]");
          const appliedCouponData = JSON.parse(
            localStorage.getItem("appliedcoupon") || "null"
          );

          // Get contact information
          const userForOrder = JSON.parse(
            localStorage.getItem("userForOrder") || "{}"
          );
          const contactInformation: { email?: string; userId?: string } = {};

          if (userForOrder && userForOrder.email && userForOrder._id) {
            contactInformation.email = userForOrder.email;
            contactInformation.userId = userForOrder._id;
          } else if (auth.user) {
            contactInformation.email = auth.user.email;
            contactInformation.userId = auth.user._id;
          }

          // Get shipping information from localStorage or auth user
          let shippingInfo = JSON.parse(
            localStorage.getItem("shippingInformation") || "null"
          );

          if (!shippingInfo && auth.user) {
            shippingInfo = {
              firstName: auth.user.firstname || "",
              lastName: auth.user.lastname || "",
              companyName: auth.user.companyname || "",
              address: auth.user.address?.address || "",
              apartment: auth.user.address?.apartment || "",
              country: auth.user.address?.country || "United Kingdom",
              city: auth.user.address?.city || "",
              county: auth.user.address?.county || "",
              postalCode: auth.user.address?.postalCode || "",
              phoneNumber: auth.user.phoneNumber || "",
            };
          }

          // Create order with "Pending" status
          const orderData = {
            cart: cartData,
            shippingInformation: shippingInfo || shippingInformation,
            contactInformation,
            coupon: appliedCouponData,
            paymentDetails,
            orderNumber: storedOrderNumber,
            status: "Pending",
          };

          console.log('ðŸ“‹ Order data to be sent:', JSON.stringify(orderData, null, 2));

          try {
            console.log('ðŸ”„ Updating order to Pending status...', orderData);
            await api.updateOrderAfterPayment(orderData);
            console.log('âœ… Order updated successfully to Pending!');

            // Calculate total order value with discount
            let totalOrderValue = cartData
              .reduce((sum: number, item: any) => {
                return sum + parseFloat((item.salePrice * item.qty).toFixed(2));
              }, 0);

            if (appliedCouponData) {
              if (appliedCouponData.discount_type === 'flat') {
                totalOrderValue -= appliedCouponData.discount;
              } else if (appliedCouponData.discount_type === 'percentage') {
                const discountAmount = (totalOrderValue * appliedCouponData.discount) / 100;
                totalOrderValue -= appliedCouponData.upto
                  ? Math.min(discountAmount, appliedCouponData.upto)
                  : discountAmount;
              }
            }
            totalOrderValue = Math.max(0, totalOrderValue);

            // Store order data for thank-you page
            const orderForThankYou = {
              totalOrderValue,
              orderNumber: storedOrderNumber,
              cart: cartData.map((item: any) => ({
                productName: item.productName || item.name,
                productId: item.productId || item._id,
                qty: item.qty,
                salePrice: item.salePrice,
              })),
              customerEmail: contactInformation.email || '',
              customerPhone: shippingInfo?.phoneNumber || '',
              customerName: shippingInfo
                ? `${shippingInfo.firstName || ''} ${shippingInfo.lastName || ''}`.trim()
                : '',
            };
            localStorage.setItem('lastOrder', JSON.stringify(orderForThankYou));
            console.log('âœ… Order data stored for thank-you page:', orderForThankYou);

            // Load tracking script
            trackingScript = document.createElement("script");
            trackingScript.src = "https://s.kk-resources.com/ks.js";
            trackingScript.async = true;
            document.body.appendChild(trackingScript);

            // Clean up localStorage
            localStorage.removeItem("clientSecret");
            localStorage.removeItem("cart");
            localStorage.removeItem("appliedcoupon");
            localStorage.removeItem("paymentIntentId");
            localStorage.removeItem("cart-old");
            localStorage.removeItem("createdOrderNumber");
            localStorage.removeItem("shippingInformation");
            localStorage.removeItem("userForOrder");

            setProgress(100);

            // Redirect to thank you page
            router.push("/checkout/thank-you");
          } catch (orderError) {
            console.error("Failed to update order status:", orderError);
            router.push("/checkout/thank-you");
          }
        } catch (error) {
          console.error("Error handling payment success:", error);
          router.push("/checkout/thank-you");
        }
      }
    };

    handlePaymentSuccessFromUrl();

    // Cleanup function
    return () => {
      if (trackingScript && document.body.contains(trackingScript)) {
        document.body.removeChild(trackingScript);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripePromise]); // Re-run when stripePromise is available for 3DS handling

  const handleCreateAccount = async () => {
    // This will be handled by the useCheckout hook
    return true;
  };

  const updateCheckoutSession = () => {
    // This functionality is now handled within the services
    console.log("Checkout session update triggered");
  };

  // Validate stock before placing order
  const validateStockBeforeOrder = (): boolean => {
    const outOfStockItems: string[] = [];
    const insufficientStockItems: { name: string; requested: number; available: number }[] = [];

    // Helper function to clean product name (remove color codes)
    const cleanProductName = (name: string): string => {
      // Remove color codes like (#d70909) or (#000000)
      return name.replace(/\s*\(#[a-fA-F0-9]{6}\)/g, '');
    };

    products.forEach((product: any) => {
      const stock = stockData[product._id];

      if (stock) {
        const cleanName = cleanProductName(product.name || product.productName);

        if (!stock.inStock || stock.availableQuantity === 0) {
          outOfStockItems.push(cleanName);
        } else if (product.qty > stock.availableQuantity) {
          insufficientStockItems.push({
            name: cleanName,
            requested: product.qty,
            available: stock.availableQuantity,
          });
        }
      }
    });

    if (outOfStockItems.length > 0) {
      toast.error(
        `Out of stock: ${outOfStockItems.join(', ')}. Please remove these items from your cart before placing an order.`,
        { autoClose: 5000 }
      );
      return false;
    }

    if (insufficientStockItems.length > 0) {
      const messages = insufficientStockItems.map(
        (item) => `${item.name}: only ${item.available} available (you have ${item.requested} in cart)`
      );
      toast.error(
        `Insufficient stock: ${messages.join('; ')}. Please adjust quantities before placing an order.`,
        { autoClose: 5000 }
      );
      return false;
    }

    return true;
  };

  // Wrapper for handlePlaceOrder with stock validation
  const handlePlaceOrderWithValidation = () => {
    if (!validateStockBeforeOrder()) {
      return;
    }
    handlePlaceOrder();
  };

  // Wrapper for handleRegisterAndPlaceOrder with stock validation
  const handleRegisterAndPlaceOrderWithValidation = () => {
    if (!validateStockBeforeOrder()) {
      return;
    }
    handleRegisterAndPlaceOrder();
  };

  const loader = "auto";

  const getBookingConfirmationPath = () => {
    if (!bookingNumber) return null;
    const customerEmail = encodeURIComponent(email || auth.user?.email || "");
    return `/booking/confirmation/${bookingNumber}?payment_success=true&email=${customerEmail}`;
  };

  const handleBookingPaymentSuccess = () => {
    localStorage.removeItem("bookingData");
    const path = getBookingConfirmationPath();
    if (path) router.push(path);
  };

  return (
    <>
      <PaymentVendorScripts
        enablePayPal={showBnplMessaging}
        enableKlarna={showBnplMessaging}
      />
      <NewsletterModal mode="checkout" />
      <LoadingBar
        color="#046d38"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />

      <header className="relative">
        {/* <TopBar /> */}
        {navbarLoaded && navbarConfig ? (
          <NavbarVariantTestBar config={navbarConfig} />
        ) : (
          <Nav />
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <div className="checkout-themed mx-auto max-w-2xl lg:max-w-none">
          <h1 className="sr-only">Checkout</h1>

          <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
            <div className="checkout-billing-panel">
              <LoginForm
                toggleFormVisibility={toggleFormVisibility}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleLogin={handleLogin}
                showForm={showForm}
                errors={errors}
              />

              <RegisterForm
                handleCreateAcc={handleCreateAccount}
                handleShippingChange={(e) =>
                  handleShippingChange(e.target.name, e.target.value)
                }
                email={email}
                setEmail={setEmail}
                shippingInformation={shippingInformation}
                password={password}
                setPassword={setPassword}
                Cpassword={confirmPassword}
                setCPassword={setConfirmPassword}
                errors={errors}
              />
            </div>

            {/* Order summary */}
            <div className="mt-10 lg:mt-0 checkout-order-summary">
              <div className="bg-gray-200 py-6 px-4 rounded-md xl:flex-row xl:sticky top-[100px]">
                <h2 className="text-lg font-medium text-gray-900 pb-5">
                  Order summary
                </h2>

                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <h3 className="sr-only">Items in your order</h3>

                  <ProductDetails
                    products={products}
                    removeFromCart={removeFromCart}
                    totalSalePrice={totalSalePrice}
                    appliedCoupon={appliedCoupon}
                    showWarning={showWarning}
                    isChecked={isChecked}
                    handleTermsCheckboxChange={(e) =>
                      handleTermsCheckboxChange(e.target.checked)
                    }
                    handleApplyCoupon={(e) => {
                      e.preventDefault();
                      handleApplyCoupon();
                    }}
                    handleCouponInputChange={(e) =>
                      handleCouponInputChange(e.target.value)
                    }
                    isCouponValid={isCouponValid}
                    enteredCoupon={enteredCoupon}
                    updateCheckoutSession={updateCheckoutSession}
                    couponError={couponError}
                    onStockDataUpdate={setStockData}
                    bookingData={bookingData}
                    onRemoveBooking={handleRemoveBooking}
                    shippingMethods={shippingMethods}
                    selectedShippingMethod={selectedShippingMethod}
                    shippingCost={shippingCost}
                    freeShippingThreshold={freeShippingThreshold}
                    freeShippingEnabled={freeShippingEnabled}
                    onShippingMethodChange={handleShippingMethodChange}
                  />

                  <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                    {showBnplMessaging && (
                      <div className="mb-4" key={`bnpl-${bnplAmountPence}`}>
                        <div
                          data-pp-message
                          data-pp-style-layout="text"
                          data-pp-style-logo-type="inline"
                          data-pp-style-text-color="black"
                          data-pp-amount={String(bnplAmountPence)}
                        />
                        <klarna-placement
                          data-key="credit-promotion-badge"
                          data-locale="en-GB"
                          data-purchase-amount={String(bnplAmountPence)}
                        />
                      </div>
                    )}

                    {activeClientSecret && stripePromise ? (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Payment Details
                        </h3>
                        {isBookingOnly && bookingNumber && (
                          <p className="text-sm text-gray-500 mb-4">
                            Booking Reference:{" "}
                            <span className="font-mono font-semibold text-gray-900">{bookingNumber}</span>
                          </p>
                        )}
                        <Elements
                          stripe={stripePromise}
                          options={{
                            clientSecret: activeClientSecret,
                            loader,
                            appearance: {
                              theme: 'stripe',
                              variables: {
                                colorPrimary: '#046d38',
                              },
                            },
                          }}
                        >
                          <PaymentForm
                            onPaymentSuccess={
                              isBookingOnly
                                ? handleBookingPaymentSuccess
                                : handlePaymentSuccess
                            }
                            totalAmount={isBookingOnly && bookingData ? getBookingTotal(bookingData) : discountedPrice}
                            isProcessing={isBookingOnly ? bookingSubmitting : isProcessingPayment}
                            onBeforePayment={
                              isBookingOnly
                                ? async () => ({ success: true })
                                : validateAndCreateOrder
                            }
                            onBeforeExpressPayment={
                              isBookingOnly ? undefined : validateAndCreateOrderFromWallet
                            }
                            expressShippingRates={isBookingOnly ? undefined : expressShippingRates}
                            onExpressShippingRateChange={
                              isBookingOnly ? undefined : handleExpressShippingRateChange
                            }
                            returnUrl={
                              isBookingOnly && bookingNumber
                                ? `${typeof window !== "undefined" ? window.location.origin : ""}${getBookingConfirmationPath()}`
                                : undefined
                            }
                          />
                        </Elements>
                        {!isBookingOnly && paymentError && (
                          <p className="text-red-600 text-sm mt-2 text-center">{paymentError}</p>
                        )}
                        {!isBookingOnly && generalError && (
                          <p className="text-red-600 text-sm mt-2 text-center">{generalError}</p>
                        )}
                      </div>
                    ) : isBookingOnly ? (
                      <button
                        onClick={handleBookingCheckout}
                        disabled={bookingSubmitting}
                        className={`w-full bg-primary text-white py-4 rounded-md font-semibold text-lg transition-all ${
                          bookingSubmitting
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-primary/90"
                        }`}
                      >
                        {bookingSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </span>
                        ) : (
                          `Continue to Payment - £${bookingData ? getBookingTotal(bookingData).toFixed(2) : "0.00"}`
                        )}
                      </button>
                    ) : paymentError ? (
                      <div className="text-center py-8">
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                          <p className="font-medium">Payment Error</p>
                          <p className="text-sm mt-1">{paymentError}</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="mt-3 text-sm text-red-600 underline hover:text-red-800"
                          >
                            Refresh page to try again
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading payment form...</p>
                        {!stripePromise && (
                          <p className="text-gray-400 text-xs mt-1">Initializing Stripe...</p>
                        )}
                        {stripePromise && !clientSecret && (
                          <p className="text-gray-400 text-xs mt-1">Creating payment session...</p>
                        )}
                      </div>
                    )}
                    <PaymentLogos />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <TrustBoxWidget />
        {/* <CheckoutBenefits /> */}
      </main>

      </>
  );
}
