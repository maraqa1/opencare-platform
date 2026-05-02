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
            background: "linear-gradient(90deg, #f5f4f0 25%, #ede9e0 50%, #f5f4f0 75%)",
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
      <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>
        Unable to load data — {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: "6px 14px", borderRadius: 6, border: "0.5px solid #ddd",
            fontSize: 12, background: "#fff", cursor: "pointer", fontFamily: "inherit",
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
      <p style={{ fontSize: 13, color: "#888" }}>{message}</p>
    </div>
  );
}

export function StaleBanner() {
  return (
    <div style={{
      background: "#fef5e4", color: "#b7600a", borderRadius: 6,
      padding: "8px 14px", marginBottom: 16, fontSize: 12,
      border: "0.5px solid #f5c84a",
    }}>
      ⚠ Data may be outdated — last sync stale
    </div>
  );
}
