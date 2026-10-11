"use client";

import { type CSSProperties } from "react";

export type StatusIndicatorProps = {
  status: "running" | "stopped" | "loading";
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function StatusIndicator({
  status,
  size = 12,
  className = "",
  style,
}: StatusIndicatorProps) {
  const colors = {
    running: {
      bg: "rgba(74, 222, 128, 0.2)",
      dot: "#4ade80",
      shadow: "0 0 12px rgba(74, 222, 128, 0.4)",
    },
    stopped: {
      bg: "rgba(248, 113, 113, 0.2)",
      dot: "#f87171",
      shadow: "0 0 12px rgba(248, 113, 113, 0.3)",
    },
    loading: {
      bg: "rgba(250, 204, 21, 0.2)",
      dot: "#facc15",
      shadow: "0 0 12px rgba(250, 204, 21, 0.3)",
    },
  };

  const c = colors[status];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size * 2.5, height: size * 2.5, ...style }}
    >
      {/* Outer pulse ring */}
      {status === "running" && (
        <span
          style={{
            position: "absolute",
            width: size * 2,
            height: size * 2,
            borderRadius: "50%",
            backgroundColor: c.bg,
            animation: "statusPulse 2s ease-in-out infinite",
          }}
        />
      )}
      {status === "loading" && (
        <span
          style={{
            position: "absolute",
            width: size * 2,
            height: size * 2,
            borderRadius: "50%",
            backgroundColor: c.bg,
            animation: "statusPulse 1s ease-in-out infinite",
          }}
        />
      )}
      {/* Core dot */}
      <span
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: c.dot,
          boxShadow: c.shadow,
        }}
      />
    </div>
  );
}

export default StatusIndicator;
