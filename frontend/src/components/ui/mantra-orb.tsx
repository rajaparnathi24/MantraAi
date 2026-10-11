"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type MantraOrbStatus = "offline" | "starting" | "listening" | "speaking";

export type MantraOrbProps = {
  status: MantraOrbStatus;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * MantraOrb — A central animated orb that visualises MantraAI's current state.
 *
 *   offline   → dim, static concentric rings
 *   starting  → spinning gradient ring loader
 *   listening → gentle breathing/pulse glow
 *   speaking  → dynamic wave-ring expansion (audio-reactive style)
 */
export function MantraOrb({
  status,
  size = 220,
  className = "",
  style,
}: MantraOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Canvas wave animation for "speaking" state
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      if (status === "speaking") {
        // Dynamic wave rings
        const numRings = 5;
        for (let i = 0; i < numRings; i++) {
          const baseRadius = 30 + i * 16;
          const wave = Math.sin(t * 3 + i * 1.2) * (8 + i * 3);
          const radius = baseRadius + wave;
          const alpha = 0.15 - i * 0.025;

          ctx.beginPath();
          // Organic shape via variable radius
          for (let a = 0; a <= Math.PI * 2; a += 0.05) {
            const wobble =
              Math.sin(a * 3 + t * 4 + i) * (3 + i * 1.5) +
              Math.sin(a * 5 - t * 2.5) * 2;
            const r = radius + wobble;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (a === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else if (status === "listening") {
        // Gentle breathing rings
        const numRings = 4;
        for (let i = 0; i < numRings; i++) {
          const baseRadius = 35 + i * 18;
          const breathe = Math.sin(t * 1.5 + i * 0.8) * 4;
          const radius = baseRadius + breathe;
          const alpha = 0.08 - i * 0.015;

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.01, alpha)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (status === "starting") {
        // Spinning arc
        const radius = 50;
        const startAngle = t * 4;
        const arcLen = Math.PI * 0.8;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + arcLen);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();

        // Background ring
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Offline — static dim rings
        for (let i = 0; i < 3; i++) {
          const radius = 35 + i * 20;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 - i * 0.01})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      t += 0.016;
      frameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [status, size, mounted]);

  // Core dot colour per state
  const coreColors: Record<MantraOrbStatus, string> = {
    offline: "rgba(255, 255, 255, 0.08)",
    starting: "rgba(250, 204, 21, 0.25)",
    listening: "rgba(74, 222, 128, 0.3)",
    speaking: "rgba(120, 180, 255, 0.4)",
  };

  const glowColors: Record<MantraOrbStatus, string> = {
    offline: "transparent",
    starting: "rgba(250, 204, 21, 0.08)",
    listening: "rgba(74, 222, 128, 0.12)",
    speaking: "rgba(120, 180, 255, 0.15)",
  };

  const coreDotSize = size * 0.18;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {/* Ambient glow behind orb */}
      <div
        style={{
          position: "absolute",
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColors[status]} 0%, transparent 70%)`,
          transition: "all 1s ease",
          animation:
            status === "listening"
              ? "orbBreathe 3s ease-in-out infinite"
              : status === "speaking"
                ? "orbSpeak 1.5s ease-in-out infinite"
                : undefined,
        }}
      />

      {/* Canvas for ring animations */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          width: size,
          height: size,
          pointerEvents: "none",
        }}
      />

      {/* Core dot */}
      <div
        style={{
          position: "relative",
          width: coreDotSize,
          height: coreDotSize,
          borderRadius: "50%",
          background: coreColors[status],
          boxShadow:
            status !== "offline"
              ? `0 0 30px ${glowColors[status]}, 0 0 60px ${glowColors[status]}`
              : "none",
          transition: "all 0.8s ease",
          animation:
            status === "listening"
              ? "orbCorePulse 3s ease-in-out infinite"
              : status === "speaking"
                ? "orbCorePulse 1s ease-in-out infinite"
                : undefined,
        }}
      />

      {/* Keyframe styles */}
      <style>{`
        @keyframes orbBreathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes orbSpeak {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          30% { transform: scale(1.3); opacity: 1; }
          60% { transform: scale(0.95); opacity: 0.9; }
        }
        @keyframes orbCorePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

export default MantraOrb;
