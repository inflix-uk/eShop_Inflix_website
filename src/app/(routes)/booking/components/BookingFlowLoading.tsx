import type { CSSProperties } from "react";
import "./../[packageId]/booking-flow.css";

type BookingFlowLoadingProps = {
  message?: string;
  /** Optional inline style for theme vars (e.g. bookingModuleRootStyle). */
  style?: CSSProperties;
};

/** Same full-page loader used on booking flow + /booking listing. */
export default function BookingFlowLoading({
  message = "Loading...",
  style,
}: BookingFlowLoadingProps) {
  return (
    <div className="booking-module-root booking-flow-v3" style={style}>
      <div className="bf-loading" role="status" aria-busy="true" aria-label={message}>
        <div style={{ textAlign: "center", padding: "0 1rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              borderRadius: "50%",
              border: "3px solid rgba(194,252,18,0.2)",
              borderTopColor: "var(--bf-green, #C2FC12)",
              animation: "bf-spin 0.8s linear infinite",
            }}
          />
          <p className="bf-mono" style={{ color: "var(--bf-muted)" }}>
            {message}
          </p>
        </div>
      </div>
      <style>{`@keyframes bf-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
