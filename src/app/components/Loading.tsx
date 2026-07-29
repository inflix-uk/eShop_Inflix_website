import React from "react";
import ClipLoader from "react-spinners/ClipLoader";

/** Full-viewport overlay so loading always covers the page (including footer slot). */
export default function Loading({
  message,
}: {
  message?: string;
} = {}) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-bodyBg"
      role="status"
      aria-busy="true"
      aria-label={message || "Loading"}
    >
      <ClipLoader color="#36D7B7" size={100} />
      {message ? (
        <p className="mt-4 text-sm text-gray-500 animate-pulse">{message}</p>
      ) : null}
    </div>
  );
}
