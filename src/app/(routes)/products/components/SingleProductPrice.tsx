import React from "react";

export default function SingleProductPrice({
  product,
  groupOverridePrice,
  suppressPrice,
}: any) {
  const original =
    product?.variantValues &&
    product?.variantValues?.length > 0 &&
    Number.isFinite(Number(product?.variantValues[0]?.Price))
      ? Number(product?.variantValues[0]?.Price)
      : 0;
  const fallbackSale =
    product?.variantValues &&
    product?.variantValues.length > 0 &&
    Number.isFinite(Number(product?.variantValues[0]?.salePrice))
      ? Number(product?.variantValues[0]?.salePrice)
      : 0;
  const sale =
    typeof groupOverridePrice === "number" && groupOverridePrice > 0
      ? groupOverridePrice
      : fallbackSale;

  return (
    <>
      {product?.productType?.type === "single" && (
        suppressPrice ? (
          <div className="mt-1 h-7 w-40 animate-pulse rounded bg-gray-100" />
        ) : (
          <div className="flex flex-row items-center gap-1">
            <s>
              <p className="text-sm font-light text-gray-900">
                £{original.toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {typeof groupOverridePrice === "number" ? "was" : "new"}
              </p>
            </s>
            <p className="md:text-xl sm:text-lg text-md font-bold text-gray-900">
              £{sale.toLocaleString("en-GB", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        )
      )}
    </>
  );
}
