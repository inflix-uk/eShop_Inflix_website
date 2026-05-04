"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ChatWidget = dynamic(() => import("@/app/components/ChatWidget"), {
  ssr: false,
});

/**
 * Chat (socket.io + UI) is heavy on the main thread. Load after first interaction
 * or idle so initial Lighthouse / mobile parse-eval stays focused on above-the-fold UI.
 */
export default function DeferredChatWidget() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return undefined;

    let cancelled = false;
    const go = () => {
      if (!cancelled) setShow(true);
    };

    let idleHandle: number | undefined;
    let usedIdleCallback = false;

    const clearScheduled = () => {
      if (idleHandle == null) return;
      if (usedIdleCallback && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      } else {
        window.clearTimeout(idleHandle);
      }
      idleHandle = undefined;
    };

    const onInteract = () => {
      go();
      clearScheduled();
      window.removeEventListener("pointerdown", onInteract, true);
      window.removeEventListener("keydown", onInteract, true);
    };

    window.addEventListener("pointerdown", onInteract, { capture: true, passive: true });
    window.addEventListener("keydown", onInteract, { capture: true });

    const bootDelay = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        usedIdleCallback = true;
        idleHandle = window.requestIdleCallback(go, {
          timeout: 20000,
        }) as unknown as number;
      } else {
        usedIdleCallback = false;
        idleHandle = window.setTimeout(go, 12000) as unknown as number;
      }
    }, 6000);

    return () => {
      cancelled = true;
      window.clearTimeout(bootDelay);
      clearScheduled();
      window.removeEventListener("pointerdown", onInteract, true);
      window.removeEventListener("keydown", onInteract, true);
    };
  }, [show]);

  if (!show) return null;
  return <ChatWidget />;
}
