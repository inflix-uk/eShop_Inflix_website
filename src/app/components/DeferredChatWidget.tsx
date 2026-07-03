"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ChatWidget = dynamic(() => import("@/app/components/ChatWidget"), {
  ssr: false,
});

const CHAT_ENABLED_POLL_MS = 60_000;

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/**
 * Chat (socket.io + UI) is heavy on the main thread. Load after first interaction
 * or idle so initial Lighthouse / mobile parse-eval stays focused on above-the-fold UI.
 * Also respects admin "Live chat" enable/disable toggle from Visitor Messages.
 */
export default function DeferredChatWidget() {
  const [show, setShow] = useState(false);
  // `null` = still checking (don't render yet); `true` / `false` from API
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEnabled = async () => {
      const base = apiBase();
      if (!base) {
        if (!cancelled) setEnabled(true);
        return;
      }
      try {
        const res = await fetch(`${base}/visitor-messages/chat-enabled/public`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        const value = json?.data?.isEnabled;
        setEnabled(typeof value === "boolean" ? value : true);
      } catch {
        if (!cancelled) setEnabled(true);
      }
    };

    fetchEnabled();
    const interval = window.setInterval(fetchEnabled, CHAT_ENABLED_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

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

  if (enabled === false) return null;
  if (!show) return null;
  return <ChatWidget />;
}
