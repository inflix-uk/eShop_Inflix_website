import PaymentVendorScripts from "@/app/components/PaymentVendorScripts";

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PaymentVendorScripts />
      {children}
    </>
  );
}
