"use client";

import dynamic from "next/dynamic";
import DeferredChatWidget from "@/app/components/DeferredChatWidget";
import { useBackendAvailability } from "@/app/context/BackendAvailabilityContext";

const BlackFridayModal = dynamic(
  () => import("@/app/components/common/BlackFridayModal"),
  { ssr: false }
);
const ToastContainer = dynamic(
  () =>
    import("@/app/components/reactToastifyClient").then((m) => ({
      default: m.ToastContainer,
    })),
  { ssr: false }
);

/** `dynamic(..., { ssr: false })` must live in a Client Component (not root layout). */
export default function DeferredLayoutWidgets() {
  const backendAvailable = useBackendAvailability();

  return (
    <>
      {backendAvailable && <BlackFridayModal />}
      {backendAvailable && <DeferredChatWidget />}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
}
