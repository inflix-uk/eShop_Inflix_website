import PaymentVendorScripts from "@/app/components/PaymentVendorScripts";

// Layout Component for SubCategory
export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string[] }>;
}) {
  return (
    <>
      <PaymentVendorScripts />
      <head>
        {/* Product feature icons only needed on product pages */}
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-bold-rounded/css/uicons-bold-rounded.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-solid-rounded/css/uicons-solid-rounded.css"
        />
      </head>
      {children}
    </>
  );
}
