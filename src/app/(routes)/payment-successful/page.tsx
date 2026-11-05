import { redirect } from "next/navigation";

/**
 * Legacy success page (hard-coded green theme and placeholder transaction data).
 * Every payment path (Stripe card/wallet, PayPal, COD, express checkout) now lands on
 * the branded `/checkout/thank-you` page, so any old link/redirect is forwarded there.
 */
export default function PaymentSuccessPage() {
  redirect("/checkout/thank-you");
}
