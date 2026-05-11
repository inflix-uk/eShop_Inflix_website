"use client";

import { useState, useEffect, useId } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Product } from "../../../../types";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

type ImageLike = { url?: string; path?: string; filename?: string };

type SuggestionProduct = Product & {
  Gallery_Images?: ImageLike[];
  gallery_images?: ImageLike[];
  productType?: { type?: string | null };
  variantValues?: { variantImages?: ImageLike[] }[];
  varImgGroup?: { varImg?: ImageLike[] }[];
};

/**
 * Match PDP / listing behaviour: prefer `url`, else `${NEXT_PUBLIC_API_URL/}${path}`
 * (see ImagePart `getImageUrl`, ProductCard). Optional `filename` → `/uploads/products/…`.
 */
function suggestionImageObjectToSrc(image: ImageLike | null | undefined): string {
  if (!image) return "";
  const base = `${String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "")}/`;

  const url = String(image.url ?? "").trim();
  if (url) {
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const trimmed = url.replace(/^\/+/, "");
    return `${base}${trimmed}`;
  }

  const path = String(image.path ?? "").trim();
  if (path) {
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
      return path;
    }
    return `${base}${path.replace(/^\/+/, "")}`;
  }

  const filename = String(image.filename ?? "").trim();
  if (filename) {
    if (
      filename.startsWith("http://") ||
      filename.startsWith("https://") ||
      filename.startsWith("data:")
    ) {
      return filename;
    }
    return `${base}uploads/products/${filename.replace(/^\/+/, "")}`;
  }

  return "";
}

function firstVariantSuggestionImage(s: SuggestionProduct): string {
  const values = s.variantValues;
  if (!Array.isArray(values)) return "";
  for (const v of values) {
    const imgs = v?.variantImages;
    if (!Array.isArray(imgs) || imgs.length === 0) continue;
    const src = suggestionImageObjectToSrc(imgs[0]);
    if (src) return src;
  }
  return "";
}

function firstVarImgGroupSuggestionImage(s: SuggestionProduct): string {
  const groups = s.varImgGroup;
  if (!Array.isArray(groups)) return "";
  for (const g of groups) {
    const imgs = g?.varImg;
    if (!Array.isArray(imgs) || imgs.length === 0) continue;
    const src = suggestionImageObjectToSrc(imgs[0]);
    if (src) return src;
  }
  return "";
}

function resolveSuggestionThumbSrc(s: SuggestionProduct): string {
  const fromThumb = suggestionImageObjectToSrc(s.thumbnail_image ?? null);
  if (fromThumb) return fromThumb;

  const gallery = s.Gallery_Images?.[0] ?? s.gallery_images?.[0];
  const fromGallery = suggestionImageObjectToSrc(gallery ?? null);
  if (fromGallery) return fromGallery;

  const fromVariant = firstVariantSuggestionImage(s);
  if (fromVariant) return fromVariant;

  return firstVarImgGroupSuggestionImage(s);
}

export type NavbarSearchProps = {
  /**
   * `default` — block field + right submit (Nav.tsx).
   * `compact` — bordered row, icon submit right (retail strip, drawers).
   * `compactDark` — light pill (dark text) for dark headers / drawers so input stays readable.
   * `compactPill` — light rounded-full pill, optional leading icon (bold-left style).
   */
  variant?: "default" | "compact" | "compactDark" | "compactPill";
  className?: string;
  /** Shown in the input; defaults to "Search for Products". */
  placeholder?: string;
  /** e.g. close mobile drawer after navigating */
  onSearchNavigate?: () => void;
};

const MIN_SEARCH_LENGTH = 2;
const DEFAULT_PLACEHOLDER = "Search for Products";

export default function NavbarSearch({
  variant = "default",
  className = "",
  placeholder = DEFAULT_PLACEHOLDER,
  onSearchNavigate,
}: NavbarSearchProps) {
  const [filteredSuggestions, setFilteredSuggestions] = useState<SuggestionProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const inputId = useId();

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length < MIN_SEARCH_LENGTH) {
        setFilteredSuggestions([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/navbar/suggestions?q=${encodeURIComponent(searchTerm)}&limit=20`
        );
        const data = await response.json();

        if (data.status === 200 && data.suggestions) {
          setFilteredSuggestions(data.suggestions);
        } else {
          setFilteredSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setFilteredSuggestions([]);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() !== "") {
      const formattedSearchTerm = searchTerm
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      router.push(`/searchproduct/${formattedSearchTerm}`);
      onSearchNavigate?.();
    }
  };

  const handleSuggestionClick = (suggestion: SuggestionProduct) => {
    setSearchTerm(suggestion.producturl);
    const cleanSlug = suggestion.producturl?.replace(/-\d{13}$/, "") ?? "";
    const productUrl = `/products/${cleanSlug}`;
    if (pathname !== productUrl) {
      router.push(productUrl);
      onSearchNavigate?.();
    }
  };

  const suggestionsListClass =
    variant === "default"
      ? "absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg scrollbar-thin scrollbar-webkit"
      : "absolute z-[120] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg scrollbar-thin scrollbar-webkit";

  const suggestionItemClass =
    variant === "default"
      ? "flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-100"
      : "flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50";

  const suggestionsList =
    filteredSuggestions.length > 0 ? (
      <ul className={suggestionsListClass} role="listbox" aria-label="Product suggestions">
        {filteredSuggestions.map((suggestion) => {
          const src = resolveSuggestionThumbSrc(suggestion);
          return (
            <li
              key={suggestion._id}
              role="option"
              className={suggestionItemClass}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-slate-100 ring-1 ring-slate-200/80">
                {src ? (
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="h-full w-full bg-slate-200/90" aria-hidden />
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium leading-snug text-slate-900">
                {suggestion.name}
              </span>
            </li>
          );
        })}
      </ul>
    ) : null;

  if (variant !== "default") {
    const shellClass =
      variant === "compactDark"
        ? "flex min-h-[40px] items-center rounded-full border border-slate-200/90 bg-white px-4 py-1.5 text-slate-900 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25"
        : variant === "compactPill"
          ? "flex min-h-[38px] items-center rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          : "flex min-h-[44px] items-center rounded-md border border-slate-300 bg-white py-2.5 pl-6 pr-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25";

    const inputClass =
      variant === "compactDark"
        ? "min-w-0 flex-1 appearance-none border-0 bg-transparent py-1 pr-2 text-sm text-slate-900 caret-slate-900 outline-none ring-0 placeholder:text-slate-500 focus:outline-none focus:ring-0"
        : variant === "compactPill"
          ? "min-w-0 flex-1 appearance-none border-0 bg-transparent py-1 pl-1 pr-1 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          : "min-w-0 flex-1 appearance-none border-0 bg-transparent py-1 pr-2 text-[15px] leading-snug text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:outline-none focus:ring-0";

    const btnClass =
      variant === "compactDark"
        ? "flex shrink-0 items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        : "flex shrink-0 items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

    const iconClass =
      variant === "compactDark"
        ? "h-[18px] w-[18px] text-slate-600"
        : "h-[18px] w-[18px]";

    return (
      <div className={`relative w-full ${className}`.trim()}>
        <form className="w-full" onSubmit={handleSearchSubmit}>
          <label htmlFor={inputId} className="sr-only">
            Search products
          </label>
          <div className="relative">
            <div className={shellClass}>
              <input
                id={inputId}
                type="search"
                enterKeyHint="search"
                className={inputClass}
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
                style={{
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  fontSize: "16px",
                }}
              />
              <button
                type="submit"
                className={btnClass}
                aria-label="Search products"
                title="Search"
              >
                <MagnifyingGlassIcon className={iconClass} aria-hidden />
              </button>
            </div>
            {suggestionsList}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`.trim()}>
      <form className="w-full" onSubmit={handleSearchSubmit}>
        <label htmlFor={inputId} className="mb-2 text-sm font-medium text-gray-900 sr-only">
          Search
        </label>
        <div className="relative">
          <button
            type="submit"
            className="absolute inset-y-0 right-2 flex h-11 w-11 items-center justify-center rounded-md hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white active:bg-gray-200"
            aria-label="Search products"
            title="Search"
          >
            <MagnifyingGlassIcon
              className="pointer-events-none h-5 w-5 text-gray-600"
              aria-hidden
              focusable="false"
            />
          </button>
          <input
            type="search"
            id={inputId}
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-4 pr-14 text-sm text-gray-900 focus:border-primary focus:ring-primary"
            placeholder={placeholder}
            required
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
            style={{
              WebkitAppearance: "none",
              MozAppearance: "none",
              fontSize: "16px",
            }}
          />
          {suggestionsList}
        </div>
      </form>
    </div>
  );
}
