"use client";

import { type ReactNode, type CSSProperties } from "react";

export type DashboardCardProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  compact?: boolean;
};

export function DashboardCard({
  title,
  icon,
  children,
  className = "",
  style,
  compact = false,
}: DashboardCardProps) {
  return (
    <div
      className={`relative group ${className}`}
      style={{
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "16px",
        padding: compact ? "16px 20px" : "24px",
        ...style,
      }}
    >
      {/* Base border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1px solid rgba(255, 255, 255, 0.04)",
          borderRadius: "16px",
          pointerEvents: "none",
          transition: "border-color 0.5s",
        }}
        className="group-hover:!border-transparent"
      />
      {/* Hover gradient border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "1px",
          background:
            "linear-gradient(135deg, transparent, rgba(255,255,255,0.12), transparent)",
          maskImage:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
          borderRadius: "16px",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.5s",
        }}
        className="group-hover:!opacity-100"
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: compact ? "12px" : "20px",
        }}
      >
        {icon && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 16,
            }}
          >
            {icon}
          </span>
        )}
        <h3
          style={{
            margin: 0,
            fontSize: "11px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          {title}
        </h3>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10 }}>{children}</div>
    </div>
  );
}

export default DashboardCard;
