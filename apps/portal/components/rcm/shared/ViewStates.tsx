"use client";

export function LoadingView() {
  return (
    <div style={{ padding: "40px 0", display: "flex", flexDirection: "column", gap: 12 }}>
      {[200, 160, 180, 140].map((w, i) => (
        <div
          key={i}
          style={{
            height: 16,
            width: w,
            borderRadius: 4,
            background: "linear-gradient(90deg, var(--oc-gray-100) 25%, #ede9e0 50%, var(--oc-gray-100) 75%)",
            backgroundSize: "400px 100%",
            animation: "shimmer 1.4s ease infinite",
          }}
        />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }`}</style>
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: "32px 0", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--oc-critical)", marginBottom: 12 }}>
        Unable to load data — {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(31, 56, 100, 0.08)",
            fontSize: 13, background: "var(--oc-white)", cursor: "pointer", fontFamily: "var(--font-body)",
          }}
        >
          ↻ Retry
        </button>
      )}
    </div>
  );
}

export function EmptyView({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <p style={{ fontSize: 13, color: "var(--oc-gray-600)" }}>{message}</p>
    </div>
  );
}

export function StaleBanner() {
  return (
    <div style={{
      background: "var(--oc-warning-bg)", color: "var(--oc-warning)", borderRadius: 10,
      padding: "8px 14px", marginBottom: 16, fontSize: 13,
      border: "1px solid rgba(230, 81, 0, 0.25)",
    }}>
      ⚠ Data may be outdated — last sync stale
    </div>
  );
}
