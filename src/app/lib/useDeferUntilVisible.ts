"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Returns true once `ref` enters the viewport (with optional root margin).
 * Used to defer network + JS until below-the-fold widgets are near the user.
 */
export function useDeferUntilVisible<T extends Element = Element>(
  ref: RefObject<T | null>,
  options?: { rootMargin?: string; once?: boolean }
): boolean {
  const [visible, setVisible] = useState(false);
  const rootMargin = options?.rootMargin ?? "200px 0px";
  const once = options?.once !== false;

  useEffect(() => {
    if (visible && once) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          if (once) observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, once, visible]);

  return visible;
}
