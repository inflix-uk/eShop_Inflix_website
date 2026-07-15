import Link from "next/link";
import { StarIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import ProductCardLinkSpinner from "./ProductCardLinkSpinner";
import type { ProductCardDisplay } from "./productCardUtils";
import type { ProductCardDesign } from "@/app/services/productCardSettingsService";

type ProductCardViewProps = {
  display: ProductCardDisplay;
  isInStock: boolean;
  variant?: "default" | "withStock";
  cardDesign?: ProductCardDesign;
};

export default function ProductCardView({
  display,
  isInStock,
  variant = "withStock",
  cardDesign = "classic",
}: ProductCardViewProps) {
  const {
    name,
    condition,
    productHref,
    thumbnailSrc,
    thumbnailAlt,
    thumbnailTitle,
    displayPrice,
    displayOriginalPrice,
    discountPercentage,
    hasGroupPrice,
    averageRating,
  } = display;

  // Modern Card Design - Clean & Minimal
  if (cardDesign === "modern") {
    return (
      <div className="w-full py-2 sm:py-3">
        <div className="relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md">
          {/* Product Image */}
          <div className="relative w-full aspect-[9/16] overflow-hidden bg-white rounded-sm flex items-center justify-center">
            {/* Discount Badge - Top Left */}
            {discountPercentage > 0 && (
              <div className="absolute top-2 left-2 z-10 sm:text-sm text-[10px] bg-black px-2 py-0.5 text-white rounded-lg flex items-center justify-center text-nowrap">
                <span>{discountPercentage}% OFF</span>
              </div>
            )}
            
            {thumbnailSrc ? (
              <Image
                className={`object-contain ${!isInStock ? "opacity-50" : ""}`}
                src={thumbnailSrc}
                alt={thumbnailAlt}
                title={thumbnailTitle}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}

          </div>

          {/* Product Info */}
          <div className="mt-3 space-y-1 px-2">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-800 uppercase tracking-wide leading-tight">
              <Link href={productHref} className="line-clamp-2 hover:text-gray-600">
                {name}
                <span className="absolute inset-0 z-[1]" aria-hidden="true" />
                <ProductCardLinkSpinner />
              </Link>
            </h3>
            <p className="text-xs sm:text-sm font-normal text-gray-600 transition-opacity duration-200">
              £{displayPrice}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "default") {
    return (
      <div className="max-w-screen-xl mx-auto py-5 sm:py-10">
        <div className="relative bg-white rounded-lg shadow-xl sm:p-5 p-2 md:mb-0 mb-5 transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-card-shadow group cursor-pointer flex flex-col justify-between h-full">
          <div className="mb-2 flex justify-between align-middle">
            <div>
              <span className="bg-gray-200 text-black xs:px-2 px-1 py-1 rounded-lg text-sm text-nowrap">
                {condition}
              </span>
            </div>
            <div className="sm:text-sm text-[10px] bg-black px-2 text-white rounded-lg flex flex-col items-center justify-center ms-1 text-nowrap">
              <span>{discountPercentage}% OFF</span>
            </div>
          </div>

          <h3 className="text-lg mb-2 h-16 flex items-start font-normal">
            <Link href={productHref} className="line-clamp-2 md:line-clamp-2">
              {name}
              <span className="absolute inset-0 z-[1]" aria-hidden="true" />
              <ProductCardLinkSpinner />
            </Link>
          </h3>

          <div className="relative w-full h-56 min-h-[14rem] shrink-0 overflow-hidden flex items-center justify-center bg-gray-50">
            {thumbnailSrc ? (
              <Image
                className={`object-contain transform transition-transform duration-1500 ease-in-out scale-105 group-hover:scale-110 ${
                  !isInStock ? "opacity-60" : ""
                }`}
                src={thumbnailSrc}
                alt={thumbnailAlt}
                title={thumbnailTitle}
                width={200}
                height={200}
                sizes="(max-width: 768px) 50vw, 200px"
                quality={60}
                loading="lazy"
              />
            ) : (
              <span className="text-sm text-gray-400">Image not available</span>
            )}

            {!isInStock && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg transform -rotate-12">
                  <span className="text-lg font-bold">Out of Stock</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-row justify-between items-end md:mt-5 mt-auto w-full">
            <div className="transition-opacity duration-200">
              <small className="text-gray-500 flex gap-1">
                {hasGroupPrice ? "Was" : "From"} <del>£{displayOriginalPrice}</del>
              </small>
              <div className="text-xl sm:text-2xl">£{displayPrice}</div>
            </div>
            <ProductCardStars averageRating={averageRating} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full py-3 sm:py-5">
      <div className="relative rounded-lg shadow-xl sm:p-5 p-2 md:mb-0 mb-5 transition-all duration-500 ease-in-out hover:scale-100 hover:shadow-card-shadow group cursor-pointer flex flex-col justify-between h-full min-w-0">
        <div className="mb-2 flex justify-between align-middle">
          <div>
            <span className="bg-gray-200 text-black xs:px-2 px-1 py-1 rounded-lg text-sm text-nowrap">
              {condition}
            </span>
          </div>
          <div className="sm:text-sm text-[10px] bg-black px-2 text-white rounded-lg flex flex-col items-center justify-center ms-1 text-nowrap">
            <span>{discountPercentage}% OFF</span>
          </div>
        </div>

        <h3 className="text-lg mb-2 h-16 flex items-start font-normal m-0">
          <Link href={productHref} className="line-clamp-2 md:line-clamp-2">
            {name}
            <span className="absolute inset-0 z-[1]" aria-hidden="true" />
            <ProductCardLinkSpinner />
          </Link>
        </h3>

        <div className="relative w-full h-56 min-h-[14rem] shrink-0 overflow-hidden flex items-center justify-center">
          {thumbnailSrc ? (
            <Image
              className={`object-contain transform transition-transform duration-1500 ease-in-out scale-100 group-hover:scale-105 ${
                !isInStock ? "opacity-60" : ""
              }`}
              src={thumbnailSrc}
              alt={thumbnailAlt}
              title={thumbnailTitle}
              fill
              sizes="(max-width: 50px) 60vw, (max-width: 1024px) 43vw, 25vw"
              loading="lazy"
            />
          ) : (
            <div
              className={`w-full h-full bg-gray-100 flex items-center justify-center ${
                !isInStock ? "opacity-60" : ""
              }`}
            >
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}

          {!isInStock && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg transform -rotate-12">
                <span className="text-lg font-bold">Out of Stock</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-row justify-between items-end md:mt-5 mt-auto w-full">
          <div className="transition-opacity duration-200">
            <small className="text-gray-500 flex gap-1">
              {hasGroupPrice ? "Was" : "From"} <del>£{displayOriginalPrice}</del>
            </small>
            <div className="text-xl sm:text-2xl">£{displayPrice}</div>
          </div>
          <ProductCardStars averageRating={averageRating} />
        </div>
      </div>
    </div>
  );
}

function ProductCardStars({ averageRating }: { averageRating: number }) {
  return (
    <div className="py-1 text-sm font-regular text-yellow-400 flex flex-row items-center">
      {[0, 1, 2, 3, 4].map((ratingIndex) => {
        const isFullStar = ratingIndex + 1 <= Math.floor(averageRating);
        const isHalfStar = !isFullStar && ratingIndex < averageRating;
        return (
          <StarIcon
            key={ratingIndex}
            className={`h-4 w-4 ${
              isFullStar
                ? "text-amber-300"
                : isHalfStar
                  ? "text-amber-200"
                  : "text-gray-300"
            }`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
