import PaymentVendorScripts from "@/app/components/PaymentVendorScripts";

// Layout Component for SubCategory
export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PaymentVendorScripts />
      {children}
    </>
  );
}
