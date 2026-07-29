import React from "react";

/** Full-viewport loading overlay — covers navbar/footer white gaps while content loads. */
export default function FullPageLoading({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-bodyBg"
      role="status"
      aria-busy="true"
      aria-label={message}
    >
      <div className="text-center px-4">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        {message ? (
          <p className="text-gray-500 animate-pulse">{message}</p>
        ) : null}
      </div>
    </div>
  );
}
