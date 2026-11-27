"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FunnelIcon } from "@heroicons/react/24/outline";

export default function FilterDrawer({
  children,
}: {
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const { body, documentElement } = document;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: documentElement.style.overflow,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      documentElement.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close filters"
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          onClick={close}
        />
      )}
      <div
        className={`fixed inset-y-0 right-0 z-[101] h-full w-screen max-w-md overflow-y-auto overscroll-contain bg-white shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        aria-hidden={!open}
        inert={open ? undefined : true}
      >
        {children(close)}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        <FunnelIcon className="h-5 w-5" aria-hidden="true" />
        Filters
      </button>
    </>
  );
}
