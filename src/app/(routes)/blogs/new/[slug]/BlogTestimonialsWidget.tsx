"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

export type TestimonialItem = {
  id?: string;
  quote?: string;
  authorName?: string;
  authorRole?: string;
  /** 0–5 */
  rating?: number;
  avatarUrl?: string;
};

/** Auto-advance: next slide on an infinite loop (ms) */
const AUTO_SLIDE_MS = 4500;

function clampRating(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}

function StarRow({ rating }: { rating: number }) {
  if (rating <= 0) return null;
  return (
    <div className="mb-3 flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem] ${
            i < rating ? "fill-primary text-primary" : "fill-gray-200 text-gray-200"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d={dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );
}

export default function BlogTestimonialsWidget({
  items,
  heading,
  description,
  resolveImageUrl,
}: {
  items: TestimonialItem[];
  heading?: string;
  /** Optional intro under the section heading */
  description?: string;
  resolveImageUrl: (path: string | undefined) => string;
}) {
  const list = useMemo(
    () =>
      (Array.isArray(items) ? items : []).filter(
        (it) => it?.quote && String(it.quote).trim().length > 0
      ),
    [items]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    dragFree: false,
    watchDrag: true,
  });

  const scrollToIndex = useCallback(
    (i: number) => {
      if (!emblaApi || list.length === 0) return;
      const idx = Math.max(0, Math.min(i, list.length - 1));
      emblaApi.scrollTo(idx);
    },
    [emblaApi, list.length]
  );

  const scrollPrev = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setActiveIndex(emblaApi.selectedScrollSnap());
    };
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  /** Infinite auto-advance (always “next”, wraps last → first) */
  useEffect(() => {
    if (!emblaApi || list.length <= 1 || hoverPaused || prefersReducedMotion) return;

    const tick = () => {
      emblaApi.scrollNext();
    };

    const id = window.setInterval(tick, AUTO_SLIDE_MS);
    return () => window.clearInterval(id);
  }, [emblaApi, list.length, hoverPaused, prefersReducedMotion]);

  if (list.length === 0) return null;

  const showHeading = Boolean(heading?.trim());
  const descTrim = description?.trim() ?? "";
  const showDescription = Boolean(descTrim);
  const multi = list.length > 1;

  return (
    <section
      className="relative w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border border-green-100 bg-gradient-to-b from-green-50/90 to-white py-6 shadow-sm sm:py-8"
      aria-label={showHeading ? heading!.trim() : "Testimonials"}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className="mb-4 flex flex-col gap-3 px-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          {showHeading ? (
            <h2 className="text-xl font-semibold text-primary sm:text-2xl">{heading!.trim()}</h2>
          ) : (
            <span className="sr-only">Testimonials</span>
          )}
          {showDescription ? (
            <p className="max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">{descTrim}</p>
          ) : null}
        </div>

        {multi ? (
          <div className="flex shrink-0 justify-center gap-2 sm:justify-end sm:pt-0.5">
            <button
              type="button"
              onClick={scrollPrev}
              className="rounded-full border border-green-200 bg-white p-2 text-green-800 shadow-sm transition hover:bg-green-50"
              aria-label="Previous testimonial"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="rounded-full border border-green-200 bg-white p-2 text-green-800 shadow-sm transition hover:bg-green-50"
              aria-label="Next testimonial"
            >
              <ChevronIcon dir="right" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="px-4 sm:px-6">
        <div
          ref={emblaRef}
          className="overflow-hidden select-none [touch-action:pan-y] cursor-grab active:cursor-grabbing [&_*]:cursor-grab active:[&_*]:cursor-grabbing"
        >
          <div className="embla__container flex">
            {list.map((item, index) => {
            const rating = clampRating(item.rating);
            const avatarSrc = resolveImageUrl(item.avatarUrl);
            const hasAvatar = Boolean(avatarSrc);

            return (
              <article
                key={item.id || `tm-${index}`}
                className="flex w-full min-w-0 shrink-0 basis-full justify-center px-1 sm:basis-1/2 sm:px-2"
              >
                <div className="w-full overflow-hidden rounded-xl border border-green-100/80 bg-white/95 p-5 shadow-sm ring-1 ring-green-50 sm:p-6">
                  <StarRow rating={rating} />
                  <blockquote className="flex-1 border-l-4 border-green-200 pl-4 text-base italic leading-relaxed text-gray-700 sm:text-lg">
                    <p className="not-italic text-gray-700">{item.quote!.trim()}</p>
                  </blockquote>
                  <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                    {hasAvatar ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-2 ring-white shadow-sm">
                        <Image
                          src={avatarSrc}
                          alt={
                            item.authorName?.trim()
                              ? `${item.authorName.trim()} avatar`
                              : "Customer avatar"
                          }
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized={avatarSrc.startsWith("http://localhost")}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800"
                        aria-hidden
                      >
                        {(item.authorName?.trim() || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      {item.authorName?.trim() ? (
                        <p className="font-semibold text-gray-900">{item.authorName.trim()}</p>
                      ) : null}
                      {item.authorRole?.trim() ? (
                        <p className="text-sm text-gray-600">{item.authorRole.trim()}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
            })}
          </div>
        </div>
      </div>

      {/* {multi ? (
        <div className="mt-4 px-4 sm:px-6">
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {list.map((item, i) => {
              const avatarSrc = resolveImageUrl(item.avatarUrl);
              const hasAvatar = Boolean(avatarSrc);
              const author = item.authorName?.trim() || `User ${i + 1}`;
              return (
                <button
                  type="button"
                  key={item.id || `thumb-${i}`}
                  onClick={() => scrollToIndex(i)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    i === activeIndex
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "border-green-200 bg-white text-gray-700 hover:bg-green-50"
                  }`}
                  aria-label={`Show testimonial by ${author}`}
                >
                  {hasAvatar ? (
                    <span className="relative h-6 w-6 overflow-hidden rounded-full bg-gray-100">
                      <Image
                        src={avatarSrc}
                        alt={`${author} avatar`}
                        width={24}
                        height={24}
                        className="h-full w-full object-cover"
                        unoptimized={avatarSrc.startsWith("http://localhost")}
                      />
                    </span>
                  ) : (
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                        i === activeIndex
                          ? "bg-primary/20 text-primary"
                          : "bg-green-100 text-green-800"
                      }`}
                      aria-hidden
                    >
                      {author.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[7.5rem] truncate">{author}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null} */}
    </section>
  );
}
