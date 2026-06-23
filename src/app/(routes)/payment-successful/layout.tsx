import type { Metadata } from "next";
import { buildStorePageMetadata } from "@/lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildStorePageMetadata({
    path: "/payment-successful",
    fallbackTitle: "Payment successful",
    fallbackDescription: "Your payment was successful.",
  });
}

export default function PaymentSuccessfulLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
