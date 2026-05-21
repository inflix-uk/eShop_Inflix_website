"use client";



import {

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

  type RefObject,

  type CSSProperties,

} from "react";

import useEmblaCarousel from "embla-carousel-react";

import type { EmblaOptionsType } from "embla-carousel";

import { getFullImageUrl } from "./blogUtils";

import {

  bleedStyle,

  useBlogContentFullBleed,

} from "./useBlogContentFullBleed";



/** Common video layouts for web + social (admin select values). */

export type VideoAspectRatio =

  | "16:9"

  | "9:16"

  | "1:1"

  | "4:5"

  | "4:3"

  | "21:9"

  | "2:3";



export const VIDEO_ASPECT_RATIO_OPTIONS: {

  value: VideoAspectRatio;

  label: string;

  hint: string;

}[] = [

  { value: "16:9", label: "16:9 Widescreen", hint: "YouTube, TV, most website heroes" },

  { value: "9:16", label: "9:16 Vertical", hint: "TikTok, Reels, Stories, Shorts" },

  { value: "1:1", label: "1:1 Square", hint: "Instagram feed, LinkedIn square posts" },

  { value: "4:5", label: "4:5 Portrait", hint: "Instagram / Facebook feed portrait" },

  { value: "4:3", label: "4:3 Standard", hint: "Classic TV, presentations" },

  { value: "21:9", label: "21:9 Ultrawide", hint: "Cinematic, film-style banners" },

  { value: "2:3", label: "2:3 Tall", hint: "Pinterest pins, tall promos" },

];



const VIDEO_ASPECT_RATIO_CSS: Record<VideoAspectRatio, string> = {

  "16:9": "16 / 9",

  "9:16": "9 / 16",

  "1:1": "1 / 1",

  "4:5": "4 / 5",

  "4:3": "4 / 3",

  "21:9": "21 / 9",

  "2:3": "2 / 3",

};



const DEFAULT_VIDEO_ASPECT_RATIO: VideoAspectRatio = "16:9";

/** Max videos visible at once in the multi-video slider (tablet/desktop). */
const VIDEO_SLIDES_PER_VIEW_MAX = 4;

/** Tailwind `md` — phones show one slide; multi-visible from this width up. */
const VIDEO_SLIDER_MULTI_VIEW_MIN_WIDTH = 768;

/** Horizontal gap between slides (matches Tailwind `gap-3`). */
const VIDEO_SLIDE_GAP_PX = 12;



/** Soft upper caps on storefront only — no minimum floor (admin custom sizes). */

const VIDEO_PLAYER_WIDTH_MAX = 2400;

const VIDEO_PLAYER_HEIGHT_MAX = 1600;

export function clampVideoPlayerWidthPx(raw?: unknown): number | undefined {

  const n = Number(raw);

  if (!Number.isFinite(n) || n <= 0) return undefined;

  const rounded = Math.round(n);

  return rounded > VIDEO_PLAYER_WIDTH_MAX ? VIDEO_PLAYER_WIDTH_MAX : rounded;

}

export function clampVideoPlayerHeightPx(raw?: unknown): number | undefined {

  const n = Number(raw);

  if (!Number.isFinite(n) || n <= 0) return undefined;

  const rounded = Math.round(n);

  return rounded > VIDEO_PLAYER_HEIGHT_MAX ? VIDEO_PLAYER_HEIGHT_MAX : rounded;

}

/** Layout from admin fields only — never mix fixed height with aspect-ratio (prevents size flash). */

function buildVideoPlayerBoxStyle(

  aspectRatio: string | undefined,

  playerWidthPx: unknown,

  playerHeightPx: unknown,

  multiSlide: boolean

): CSSProperties {

  const widthPx = clampVideoPlayerWidthPx(playerWidthPx);

  const heightPx = clampVideoPlayerHeightPx(playerHeightPx);

  const ratioKey = String(aspectRatio || DEFAULT_VIDEO_ASPECT_RATIO).trim() as VideoAspectRatio;

  const ratioCss =

    VIDEO_ASPECT_RATIO_CSS[ratioKey] ?? VIDEO_ASPECT_RATIO_CSS[DEFAULT_VIDEO_ASPECT_RATIO];

  const style: CSSProperties = {

    maxWidth: "100%",

    boxSizing: "border-box",

    position: "relative",

    overflow: "hidden",

  };

  if (multiSlide) {

    style.width = "100%";

  } else if (widthPx) {

    style.width = `${widthPx}px`;

    style.marginLeft = "auto";

    style.marginRight = "auto";

  } else {

    style.width = "100%";

  }

  if (heightPx) {

    style.height = `${heightPx}px`;

    style.minHeight = `${heightPx}px`;

    style.maxHeight = `${heightPx}px`;

  } else {

    style.aspectRatio = ratioCss;

    style.height = "auto";

  }

  return style;

}



export type VideoWidgetItem = {

  id?: string;

  videoUrl?: string;

};



/** Normalize admin payload: `items[]` or legacy single `videoUrl`. */

export function normalizeVideoWidgetItems(

  videoUrl?: string,

  items?: VideoWidgetItem[]

): VideoWidgetItem[] {

  const fromItems = (Array.isArray(items) ? items : [])

    .map((it, index) => ({

      id: it?.id || `video-${index}`,

      videoUrl: String(it?.videoUrl || "").trim(),

    }))

    .filter((it) => it.videoUrl.length > 0);

  if (fromItems.length > 0) return fromItems;

  const legacy = String(videoUrl || "").trim();

  if (legacy) return [{ id: "legacy", videoUrl: legacy }];

  return [];

}



type EmbedResult =

  | { kind: "youtube"; id: string }

  | { kind: "vimeo"; id: string }

  | { kind: "file"; src: string }

  | null;



type ResolvedSlide = {

  id: string;

  embed: NonNullable<EmbedResult>;

};



const YT_ID = /^[\w-]{11}$/;



function parseYouTubeId(raw: string): string | null {

  const href = raw.trim();

  if (!href) return null;

  const withProto = href.startsWith("http") ? href : `https://${href}`;

  try {

    const u = new URL(withProto);

    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {

      const id = u.pathname.split("/").filter(Boolean)[0] || "";

      return YT_ID.test(id) ? id : null;

    }

    if (!host.endsWith("youtube.com")) return null;

    if (u.pathname.startsWith("/embed/")) {

      const id = u.pathname.slice(7).split("/")[0];

      return YT_ID.test(id) ? id : null;

    }

    if (u.pathname.startsWith("/shorts/")) {

      const id = u.pathname.slice(8).split("/")[0];

      return YT_ID.test(id) ? id : null;

    }

    const v = u.searchParams.get("v");

    return v && YT_ID.test(v) ? v : null;

  } catch {

    return null;

  }

}



function parseVimeoId(raw: string): string | null {

  const href = raw.trim();

  if (!href) return null;

  const withProto = href.startsWith("http") ? href : `https://${href}`;

  try {

    const u = new URL(withProto);

    const host = u.hostname.replace(/^www\./, "");

    if (!host.endsWith("vimeo.com")) return null;

    const parts = u.pathname.split("/").filter(Boolean);

    if (parts[0] === "video" && /^\d+$/.test(parts[1] || "")) return parts[1];

    if (/^\d+$/.test(parts[0] || "")) return parts[0];

    return null;

  } catch {

    return null;

  }

}



function parseDirectVideo(raw: string): string | null {

  const t = raw.trim();

  if (!t || /^javascript:/i.test(t)) return null;

  if (t.startsWith("/") && !t.startsWith("//")) {

    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(t)) return t;

    return null;

  }

  try {

    const u = new URL(t);

    if (u.protocol !== "https:" && u.protocol !== "http:") return null;

    if (!/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.pathname)) return null;

    return u.toString();

  } catch {

    return null;

  }

}



function resolveEmbed(videoUrl: string): EmbedResult {

  const yt = parseYouTubeId(videoUrl);

  if (yt) return { kind: "youtube", id: yt };

  const vm = parseVimeoId(videoUrl);

  if (vm) return { kind: "vimeo", id: vm };

  const direct = parseDirectVideo(videoUrl);

  if (direct) {

    const src =

      direct.startsWith("http://") || direct.startsWith("https://")

        ? direct

        : getFullImageUrl(direct.replace(/^\//, ""));

    if (src && !src.includes("placeholder")) return { kind: "file", src };

  }

  return null;

}

/** Admin checkbox / API may send boolean, 1, or "true". */
export function parsePlaybackMuted(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  }
  return false;
}

function youtubeEmbedSrc(id: string, playbackMuted: boolean): string {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });
  if (playbackMuted) {
    /** YouTube only applies mute when autoplay is set. */
    params.set("mute", "1");
    params.set("autoplay", "1");
    params.set("controls", "0");
    params.set("disablekb", "1");
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

function vimeoEmbedSrc(id: string, playbackMuted: boolean): string {
  const params = new URLSearchParams({
    title: "0",
    byline: "0",
    portrait: "0",
  });
  if (playbackMuted) {
    params.set("muted", "1");
    params.set("controls", "0");
    params.set("autopause", "1");
  }
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}

function useEnforcedVideoMute(
  ref: RefObject<HTMLVideoElement | null>,
  playbackMuted: boolean
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !playbackMuted) return;
    const enforce = () => {
      el.muted = true;
      el.volume = 0;
    };
    enforce();
    el.addEventListener("volumechange", enforce);
    el.addEventListener("play", enforce);
    return () => {
      el.removeEventListener("volumechange", enforce);
      el.removeEventListener("play", enforce);
    };
  }, [ref, playbackMuted]);
}

function VideoPlayerEmbed({
  embed,
  title,
  boxStyle,
  playbackMuted = false,
  inCarousel = false,
}: {
  embed: EmbedResult;
  title: string;
  boxStyle: CSSProperties;
  /** From admin — no mute control on the public site. */
  playbackMuted?: boolean;
  inCarousel?: boolean;
}) {
  const fileVideoRef = useRef<HTMLVideoElement>(null);
  const forceMute = parsePlaybackMuted(playbackMuted);
  useEnforcedVideoMute(fileVideoRef, forceMute);

  if (!embed) return null;

  const embedSrcKey = forceMute ? "muted" : "sound";

  return (
    <div
      className={
        inCarousel
          ? "relative w-full min-w-0 overflow-hidden rounded-lg bg-black"
          : "relative w-full max-w-full shrink-0 overflow-hidden rounded-lg bg-black [contain:layout]"
      }
      style={boxStyle}
    >
      {embed.kind === "youtube" ? (
        <iframe
          key={`yt-${embed.id}-${embedSrcKey}`}
          title={title}
          src={youtubeEmbedSrc(embed.id, forceMute)}
          className="absolute inset-0 h-full w-full border-0"
          allow={
            forceMute
              ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              : "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          }
          allowFullScreen={!forceMute}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : embed.kind === "vimeo" ? (
        <iframe
          key={`vm-${embed.id}-${embedSrcKey}`}
          title={title}
          src={vimeoEmbedSrc(embed.id, forceMute)}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen={!forceMute}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <video
          ref={fileVideoRef}
          key={`file-${embed.src}-${embedSrcKey}`}
          className="absolute inset-0 h-full w-full object-contain"
          controls={!forceMute}
          muted={forceMute}
          autoPlay={forceMute}
          loop={forceMute && inCarousel}
          playsInline
          preload="metadata"
          src={embed.src}
        />
      )}
    </div>
  );
}



function ChevronIcon({ dir }: { dir: "left" | "right" }) {

  return (

    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>

      <path

        strokeLinecap="round"

        strokeLinejoin="round"

        strokeWidth={2}

        d={dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}

      />

    </svg>

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



function useMinViewportWidth(minWidthPx: number): boolean {

  const [matches, setMatches] = useState(false);

  useEffect(() => {

    const mq = window.matchMedia(`(min-width: ${minWidthPx}px)`);

    setMatches(mq.matches);

    const onChange = () => setMatches(mq.matches);

    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);

  }, [minWidthPx]);

  return matches;

}



export default function BlogVideoWidget({

  videoUrl,

  items,

  aspectRatio,

  playerWidthPx,

  playerHeightPx,

  playbackMuted,

  title,

  description,

  heading,

  caption,

}: {

  videoUrl?: string;

  items?: VideoWidgetItem[];

  aspectRatio?: VideoAspectRatio | string;

  playerWidthPx?: number;

  playerHeightPx?: number;

  /** Admin: force muted playback on the storefront (no visitor mute toggle). */
  playbackMuted?: boolean;

  title?: string;

  description?: string;

  heading?: string;

  caption?: string;

}) {

  const displayTitle = String(title ?? heading ?? "").trim();

  const displayDescription = String(description ?? caption ?? "").trim();

  const isPlaybackMuted = parsePlaybackMuted(playbackMuted);

  const slides = useMemo((): ResolvedSlide[] => {

    const out: ResolvedSlide[] = [];

    normalizeVideoWidgetItems(videoUrl, items).forEach((item, index) => {

      const embed = resolveEmbed(item.videoUrl || "");

      if (embed) out.push({ id: item.id || `slide-${index}`, embed });

    });

    return out;

  }, [videoUrl, items]);

  const multiSlide = slides.length > 1;

  const playerBoxStyle = useMemo(

    () => buildVideoPlayerBoxStyle(aspectRatio, playerWidthPx, playerHeightPx, multiSlide),

    [aspectRatio, playerWidthPx, playerHeightPx, multiSlide]

  );

  const playerLayoutKey = useMemo(

    () =>

      `${aspectRatio ?? DEFAULT_VIDEO_ASPECT_RATIO}-${playerWidthPx ?? ""}-${playerHeightPx ?? ""}-${isPlaybackMuted ? "1" : "0"}-${multiSlide ? "m" : "s"}`,

    [aspectRatio, playerWidthPx, playerHeightPx, isPlaybackMuted, multiSlide]

  );



  const rootRef = useRef<HTMLDivElement>(null);

  const bleed = useBlogContentFullBleed(rootRef, slides.length > 0);

  const prefersReducedMotion = usePrefersReducedMotion();

  const isMultiViewViewport = useMinViewportWidth(VIDEO_SLIDER_MULTI_VIEW_MIN_WIDTH);

  const visiblePerView = useMemo(() => {

    const maxVisible = isMultiViewViewport ? VIDEO_SLIDES_PER_VIEW_MAX : 1;

    return Math.min(maxVisible, slides.length);

  }, [isMultiViewViewport, slides.length]);

  const showControls = slides.length > 1;

  /** All videos fit in the viewport — no track scroll (prevents empty right on last “snap”). */
  const allSlidesFit = slides.length <= visiblePerView;

  /**
   * Each slide flex-basis; gap is padding-left on slides + negative margin on track (box-sizing).
   */
  const slideSizeCss = useMemo(() => {
    if (slides.length <= 1) return "100%";
    const gaps = (visiblePerView - 1) * VIDEO_SLIDE_GAP_PX;
    return `calc((100% - ${gaps}px) / ${visiblePerView})`;
  }, [slides.length, visiblePerView]);

  const emblaMulti = slides.length > 1;

  const emblaOptions = useMemo<EmblaOptionsType>(

    () => ({

      loop: false,

      align: "start",

      axis: "x",

      duration: prefersReducedMotion ? 0 : 36,

      skipSnaps: false,

      dragFree: false,

      watchDrag: !allSlidesFit,

      watchSlides: true,

      slidesToScroll: allSlidesFit ? "auto" : 1,

      /** Drops end snaps that leave blank space on the right. */
      containScroll: "trimSnaps",

    }),

    [allSlidesFit, prefersReducedMotion]

  );



  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [snapCount, setSnapCount] = useState(0);

  const [dragPaused, setDragPaused] = useState(false);



  useEffect(() => {

    if (!emblaApi) return;

    emblaApi.reInit();

  }, [emblaApi, slides.length, slideSizeCss, visiblePerView]);



  useEffect(() => {

    if (!emblaApi) return;

    const syncFromEmbla = () => {
      setSnapCount(emblaApi.scrollSnapList().length);
      if (!allSlidesFit) {
        setSelectedIndex(emblaApi.selectedScrollSnap());
      }
    };

    syncFromEmbla();

    emblaApi.on("select", syncFromEmbla);

    emblaApi.on("reInit", syncFromEmbla);

    return () => {

      emblaApi.off("select", syncFromEmbla);

      emblaApi.off("reInit", syncFromEmbla);

    };

  }, [emblaApi, slides.length, allSlidesFit]);

  useEffect(() => {
    if (!emblaMulti || prefersReducedMotion || dragPaused) return;
    const intervalMs = 5500;
    const id = window.setInterval(() => {
      if (allSlidesFit) {
        setSelectedIndex((i) => (i + 1) % slides.length);
        return;
      }
      if (!emblaApi) return;
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollTo(0);
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [emblaApi, emblaMulti, allSlidesFit, slides.length, prefersReducedMotion, dragPaused]);

  const pauseAutoOnDrag = useCallback(() => setDragPaused(true), []);

  const resumeAutoAfterDrag = useCallback(() => setDragPaused(false), []);

  const scrollPrev = useCallback(() => {
    if (slides.length <= 1) return;
    if (allSlidesFit) {
      setSelectedIndex((i) => (i - 1 + slides.length) % slides.length);
      return;
    }
    if (!emblaApi) return;
    if (emblaApi.canScrollPrev()) emblaApi.scrollPrev();
    else emblaApi.scrollTo(Math.max(0, snapCount - 1));
  }, [emblaApi, slides.length, allSlidesFit, snapCount]);

  const scrollNext = useCallback(() => {
    if (slides.length <= 1) return;
    if (allSlidesFit) {
      setSelectedIndex((i) => (i + 1) % slides.length);
      return;
    }
    if (!emblaApi) return;
    if (emblaApi.canScrollNext()) emblaApi.scrollNext();
    else emblaApi.scrollTo(0);
  }, [emblaApi, slides.length, allSlidesFit]);

  const goToDot = useCallback(
    (index: number) => {
      if (allSlidesFit) {
        setSelectedIndex(index);
        return;
      }
      emblaApi?.scrollTo(index);
    },
    [emblaApi, allSlidesFit]
  );

  const dotCount = allSlidesFit ? slides.length : snapCount || slides.length;



  if (slides.length === 0) return null;



  const iframeTitle = displayTitle || "Embedded video";



  return (

    <div

      ref={rootRef}

      className="relative my-8 min-w-0 max-w-full"

      style={bleedStyle(bleed)}

    >

      {displayTitle ? (

        <h3 className="mb-3 text-left text-xl font-semibold leading-snug text-gray-900 sm:mb-4 sm:text-3xl">

          {displayTitle}

        </h3>

      ) : null}



      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 shadow-sm">

        <div className="relative min-w-0 px-1 py-1 sm:px-2 sm:py-2">

          {showControls ? (

            <>

              <button

                type="button"

                onClick={scrollPrev}

                className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-md transition hover:bg-gray-50 active:scale-95 sm:left-2"

                aria-label="Previous video"

              >

                <ChevronIcon dir="left" />

              </button>

              <button

                type="button"

                onClick={scrollNext}

                className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-md transition hover:bg-gray-50 active:scale-95 sm:right-2"

                aria-label="Next video"

              >

                <ChevronIcon dir="right" />

              </button>

            </>

          ) : null}



          <div

            className={
              showControls
                ? "relative overflow-hidden px-9 sm:px-11 select-none cursor-grab active:cursor-grabbing [touch-action:pan-x_pan-y]"
                : "overflow-hidden"
            }

            ref={emblaRef}

            onPointerDown={showControls ? pauseAutoOnDrag : undefined}

            onPointerUp={showControls ? resumeAutoAfterDrag : undefined}

            onPointerCancel={showControls ? resumeAutoAfterDrag : undefined}

            role={showControls ? "region" : undefined}

            aria-label={showControls ? "Video slider — drag or swipe to change video" : undefined}

          >

            <div
              className="embla__container flex will-change-transform"
              style={
                showControls
                  ? { marginLeft: `-${VIDEO_SLIDE_GAP_PX}px` }
                  : undefined
              }
            >

              {slides.map((slide, index) => (

                <div

                  key={`video-slide-${index}`}

                  className="embla__slide box-border min-w-0 shrink-0 grow-0 overflow-hidden"

                  style={
                    showControls
                      ? {
                          flex: `0 0 ${slideSizeCss}`,
                          paddingLeft: VIDEO_SLIDE_GAP_PX,
                        }
                      : { flex: "0 0 100%" }
                  }

                >

                  <div className="h-full w-full min-w-0 max-w-full overflow-hidden">

                    <VideoPlayerEmbed

                      key={`${slide.id}-${playerLayoutKey}`}

                      embed={slide.embed}

                      title={`${iframeTitle}${slides.length > 1 ? ` (${index + 1} of ${slides.length})` : ""}`}

                      boxStyle={playerBoxStyle}

                      playbackMuted={isPlaybackMuted}
                      inCarousel={multiSlide}

                    />

                  </div>

                </div>

              ))}

            </div>

            {showControls ? (
              <div
                className="absolute inset-0 z-[6] cursor-grab active:cursor-grabbing touch-pan-x pointer-events-auto md:pointer-events-none"
                aria-hidden
              />
            ) : null}

          </div>



          {slides.length > 1 ? (

            <div className="mt-2 flex justify-center gap-1.5 pb-1">

              {Array.from({ length: dotCount }, (_, index) => (

                <button

                  key={`video-dot-${index}`}

                  type="button"

                  onClick={() => goToDot(index)}

                  className={`h-2 rounded-full transition-all ${

                    index === selectedIndex

                      ? "w-6 bg-gray-800"

                      : "w-2 bg-gray-300 hover:bg-gray-500"

                  }`}

                  aria-label={`Go to video ${index + 1}`}

                  aria-current={index === selectedIndex ? "true" : undefined}

                />

              ))}

            </div>

          ) : null}

          {showControls ? (
            <p className="mt-1.5 text-center text-xs text-gray-500">
              Drag or swipe to browse videos
            </p>
          ) : null}

        </div>

      </div>



      {displayDescription ? (

        <p className="mt-3 text-left text-base leading-relaxed text-gray-600 sm:mt-4 sm:text-lg">

          {displayDescription}

        </p>

      ) : null}

    </div>

  );

}


