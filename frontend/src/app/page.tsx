"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MantraOrb, type MantraOrbStatus } from "@/components/ui/mantra-orb";

const API = "http://localhost:8000";

// ── API helper ──────────────────────────────────────────────────────────────────

async function api(
  path: string,
  method: "GET" | "POST" = "POST",
  body?: Record<string, unknown>
) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Prompt messages that animate in sequence when Mantra speaks ──────────────

const MANTRA_PROMPTS = [
  "Initializing core systems…",
  "Calibrating microphone, one moment.",
  "Loading voice recognition engine…",
  "Warming up neural pathways…",
  'I\'m ready. Say "Hello Mantra" whenever you need me.',
];

// ── Particle Flow Canvas (native React — no iframe) ─────────────────────────

function ParticleFlowCanvas({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let width = 0;
    let height = 0;
    type Explosion = { x: number; y: number; radius: number; life: number };
    let explosions: Explosion[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener("resize", resize);
    resize();

    const handleClick = (e: MouseEvent) => {
      explosions.push({ x: e.clientX, y: e.clientY, radius: 0, life: 1 });
    };
    window.addEventListener("click", handleClick);

    // Create flow paths
    type PathDef = {
      isLeft: boolean;
      startY: number;
      particles: { t: number; speed: number }[];
    };
    const numPaths = 80;
    const paths: PathDef[] = [];
    for (let i = 0; i < numPaths; i++) {
      paths.push({
        isLeft: i % 2 === 0,
        startY: (i / numPaths) * height * 1.4 - height * 0.2,
        particles: [
          { t: Math.random(), speed: 0.0015 + Math.random() * 0.002 },
        ],
      });
    }

    function getBezierPoint(
      t: number,
      p0: { x: number; y: number },
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      p3: { x: number; y: number }
    ) {
      const u = 1 - t;
      return {
        x:
          u * u * u * p0.x +
          3 * u * u * t * p1.x +
          3 * u * t * t * p2.x +
          t * t * t * p3.x,
        y:
          u * u * u * p0.y +
          3 * u * u * t * p1.y +
          3 * u * t * t * p2.y +
          t * t * t * p3.y,
      };
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;

      // Update explosions
      for (let e = explosions.length - 1; e >= 0; e--) {
        explosions[e].radius += 15;
        explosions[e].life -= 0.015;
        if (explosions[e].life <= 0) explosions.splice(e, 1);
      }

      paths.forEach((path) => {
        const p0 = { x: path.isLeft ? 0 : width, y: path.startY };
        const p1 = {
          x: path.isLeft ? centerX * 0.5 : width - centerX * 0.5,
          y: path.startY,
        };
        const p2 = {
          x: path.isLeft ? centerX * 0.8 : width - centerX * 0.8,
          y: centerY,
        };
        const p3 = { x: centerX, y: centerY };

        // Draw path
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([1, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animate particles
        path.particles.forEach((p) => {
          p.t += p.speed;
          if (p.t > 1) {
            p.t = 0;
            path.startY += (Math.random() - 0.5) * 10;
          }

          let pos = getBezierPoint(p.t, p0, p1, p2, p3);

          // Apply explosion forces
          let dxTotal = 0;
          let dyTotal = 0;
          explosions.forEach((exp) => {
            const dx = pos.x - exp.x;
            const dy = pos.y - exp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < exp.radius + 100) {
              const force =
                (1 - dist / (exp.radius + 100)) * exp.life * 60;
              dxTotal += (dx / (dist || 1)) * force;
              dyTotal += (dy / (dist || 1)) * force;
            }
          });

          pos = { x: pos.x + dxTotal, y: pos.y + dyTotal };

          // Glow at convergence point
          const distToCenter = Math.sqrt(
            (pos.x - centerX) ** 2 + (pos.y - centerY) ** 2
          );
          const glowIntensity = Math.max(0, 1 - distToCenter / 300);
          const particleAlpha = 0.3 + glowIntensity * 0.7;
          const particleSize = 1 + glowIntensity * 2;

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, particleSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha})`;
          ctx.fill();

          // Trailing glow
          if (glowIntensity > 0.3) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, particleSize * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${glowIntensity * 0.1})`;
            ctx.fill();
          }
        });
      });

      // Central glow
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        200
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.03)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.01)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(centerX - 200, centerY - 200, 400, 400);

      frameRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 1.5s ease-in",
      }}
    />
  );
}

// ── Cinematic Intro Overlay ─────────────────────────────────────────────────

type IntroPhase = 0 | 1 | 2 | 3 | 4 | 5;

function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<IntroPhase>(0);
  const [subtitleText, setSubtitleText] = useState("");
  const subtitleFull = "STARTER ENGINE";

  // Phase progression
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),      // Phase 1: dot appears
      setTimeout(() => setPhase(2), 1500),      // Phase 2: title text
      setTimeout(() => setPhase(3), 3000),      // Phase 3: lines expand
      setTimeout(() => setPhase(4), 4000),      // Phase 4: subtitle typewriter
      setTimeout(() => setPhase(5), 5500),      // Phase 5: fade out intro
      setTimeout(() => onComplete(), 6200),     // Complete
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Subtitle typewriter effect during phase 4
  useEffect(() => {
    if (phase < 4) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setSubtitleText(subtitleFull.slice(0, i));
      if (i >= subtitleFull.length) clearInterval(timer);
    }, 60);
    return () => clearInterval(timer);
  }, [phase]);

  const titleLetters = "MANTRA AI".split("");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.7s ease-out",
        opacity: phase >= 5 ? 0 : 1,
        pointerEvents: phase >= 5 ? "none" : "auto",
      }}
    >
      {/* Phase 1: Central Glowing Dot */}
      <div
        style={{
          position: "absolute",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.9)",
          boxShadow:
            "0 0 20px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.15), 0 0 120px rgba(255,255,255,0.05)",
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 4 ? "scale(3)" : phase >= 1 ? "scale(1)" : "scale(0)",
          transition:
            phase >= 4
              ? "transform 1s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s"
              : "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease-in",
          animation: phase >= 1 && phase < 4 ? "introDotPulse 2s ease-in-out infinite" : undefined,
        }}
      />

      {/* Phase 3: Radial expanding lines */}
      {phase >= 3 && (
        <div style={{ position: "absolute", width: "100%", height: "100%" }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * 360;
            const delay = i * 0.04;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 1,
                  height: 0,
                  background: `linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)`,
                  transformOrigin: "top center",
                  transform: `rotate(${angle}deg)`,
                  animation: `introLineExpand 1s ${delay}s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Phase 2: Title "MANTRA AI" with staggered letter reveal */}
      <div
        style={{
          position: "relative",
          display: "flex",
          gap: 0,
          marginBottom: 8,
          overflow: "hidden",
          height: phase >= 2 ? 52 : 0,
          transition: "height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {titleLetters.map((char, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontSize: 42,
              fontWeight: 100,
              color: "#fff",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? "translateY(0)" : "translateY(100%)",
              transition: `transform 0.7s ${0.05 * i}s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ${0.05 * i}s ease`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>

      {/* Phase 4: Subtitle "STARTER ENGINE" typewriter */}
      <div
        style={{
          height: 24,
          overflow: "hidden",
          opacity: phase >= 4 ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 200,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          {subtitleText}
          {phase === 4 && (
            <span
              style={{
                display: "inline-block",
                width: 1,
                height: 12,
                background: "rgba(255,255,255,0.5)",
                marginLeft: 2,
                verticalAlign: "text-bottom",
                animation: "cursorBlink 0.6s step-end infinite",
              }}
            />
          )}
        </span>
      </div>

      {/* Intro keyframes */}
      <style>{`
        @keyframes introDotPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.15); }
          50% { box-shadow: 0 0 30px rgba(255,255,255,0.6), 0 0 80px rgba(255,255,255,0.2), 0 0 140px rgba(255,255,255,0.08); }
        }
        @keyframes introLineExpand {
          from { height: 0; opacity: 0.8; }
          to { height: min(40vw, 300px); opacity: 0; }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Main Page — Mantra Starter Engine ───────────────────────────────────────

export default function Home() {
  const [introComplete, setIntroComplete] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [mantraStatus, setMantraStatus] = useState<
    "running" | "stopped" | "loading"
  >("stopped");
  const [orbStatus, setOrbStatus] = useState<MantraOrbStatus>("offline");
  const [toast, setToast] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const [promptIdx, setPromptIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Status polling ────────────────────────────────────────────────────────

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await api("/api/mantra/status", "GET");
        setApiConnected(true);
        const running = data.status === "running";
        setMantraStatus(running ? "running" : "stopped");
        if (running) {
          setOrbStatus("listening");
        } else {
          setOrbStatus("offline");
        }
      } catch {
        setApiConnected(false);
        setMantraStatus("stopped");
        setOrbStatus("offline");
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Simulated speaking animation: cycle prompts when running ──────────────

  useEffect(() => {
    if (mantraStatus !== "running") {
      setIsSpeaking(false);
      setPromptIdx(0);
      setCharIdx(0);
      setPromptText("");
      return;
    }

    // Start the prompt sequence after a brief delay
    const startDelay = setTimeout(() => {
      setIsSpeaking(true);
    }, 500);

    return () => clearTimeout(startDelay);
  }, [mantraStatus]);

  // Typewriter effect for prompt text
  useEffect(() => {
    if (!isSpeaking) return;

    const currentPrompt = MANTRA_PROMPTS[promptIdx];
    if (!currentPrompt) {
      // Finished all prompts → settle to listening
      setOrbStatus("listening");
      setIsSpeaking(false);
      return;
    }

    setOrbStatus("speaking");

    if (charIdx < currentPrompt.length) {
      const timer = setTimeout(() => {
        setPromptText(currentPrompt.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, 35);
      return () => clearTimeout(timer);
    } else {
      // Pause after finishing a prompt, then move to the next
      const pauseTimer = setTimeout(() => {
        setPromptIdx((i) => i + 1);
        setCharIdx(0);
        setPromptText("");
      }, 2000);
      return () => clearTimeout(pauseTimer);
    }
  }, [isSpeaking, promptIdx, charIdx]);

  // Intermittent "speaking" pulses after initial prompts finish
  useEffect(() => {
    if (mantraStatus !== "running" || isSpeaking) return;

    // Every 8-12s, briefly switch to speaking mode to simulate activity
    const pulse = () => {
      setOrbStatus("speaking");
      setPromptText("Listening for wake word…");
      const dur = 2000 + Math.random() * 1500;
      setTimeout(() => {
        setOrbStatus("listening");
        setPromptText('Say "Hello Mantra" to begin a session.');
      }, dur);
    };

    // Initial idle text
    setPromptText('Say "Hello Mantra" to begin a session.');

    const interval = setInterval(pulse, 8000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [mantraStatus, isSpeaking]);

  // ── Start / Stop ──────────────────────────────────────────────────────────

  const startMantra = async () => {
    if (!apiConnected) {
      showToast("API server offline — run: python api_server.py");
      return;
    }
    setMantraStatus("loading");
    setOrbStatus("starting");
    setPromptText("Initializing Mantra Engine…");
    try {
      await api("/api/mantra/start");
      setMantraStatus("running");
      setOrbStatus("listening");
      showToast("MantraAI started! Say 'Hello Mantra'");
    } catch (e: unknown) {
      setMantraStatus("stopped");
      setOrbStatus("offline");
      setPromptText("");
      const msg = e instanceof Error ? e.message : "Unknown";
      showToast(msg === "Failed to fetch" ? "API server unreachable" : `Error: ${msg}`);
    }
  };

  const stopMantra = async () => {
    if (!apiConnected) {
      showToast("API server offline — run: python api_server.py");
      return;
    }
    setMantraStatus("loading");
    setOrbStatus("starting");
    setPromptText("Shutting down…");
    try {
      await api("/api/mantra/stop");
      setMantraStatus("stopped");
      setOrbStatus("offline");
      setPromptText("");
      showToast("MantraAI stopped");
    } catch (e: unknown) {
      setMantraStatus("stopped");
      setOrbStatus("offline");
      setPromptText("");
      const msg = e instanceof Error ? e.message : "Unknown";
      showToast(msg === "Failed to fetch" ? "API server unreachable" : `Error: ${msg}`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isRunning = mantraStatus === "running";
  const isLoading = mantraStatus === "loading";
  const showApiWarning = introComplete && !apiConnected;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#000",
        color: "#e2e8f0",
        fontFamily: "'Inter', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Cinematic Intro ──────────────────────────────────────────────── */}
      {!introComplete && <CinematicIntro onComplete={handleIntroComplete} />}

      {/* Dither overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: 0.08,
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%202%202%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%221%22%20height%3D%221%22%20fill%3D%22%23ffffff%22%2F%3E%3Crect%20x%3D%221%22%20y%3D%221%22%20width%3D%221%22%20height%3D%221%22%20fill%3D%22%23ffffff%22%2F%3E%3C%2Fsvg%3E')",
          backgroundSize: "2px 2px",
        }}
      />

      {/* Particle Flow Background — fades in during phase 3 */}
      <ParticleFlowCanvas visible={introComplete} />

      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          opacity: introComplete ? 1 : 0,
          transform: introComplete ? "translateY(0)" : "translateY(-20px)",
          transition: "opacity 0.8s 0.2s ease, transform 0.8s 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 200,
                color: "#fff",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Mantra AI
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                color: "rgba(255,255,255,0.25)",
                fontWeight: 200,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Starter Engine
            </p>
          </div>
        </div>
      </header>

      {/* ── Center Content: Orb + Button ──────────────────────────────── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "80px 24px 40px",
          gap: 0,
        }}
      >
        {/* Mantra Orb — slides up from below */}
        <div
          style={{
            opacity: introComplete ? 1 : 0,
            transform: introComplete ? "translateY(0) scale(1)" : "translateY(40px) scale(0.8)",
            transition: "opacity 1s 0.1s ease, transform 1s 0.1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <MantraOrb status={orbStatus} size={240} />
        </div>

        {/* Status Label */}
        <div
          style={{
            marginTop: 32,
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: introComplete ? 1 : 0,
            transform: introComplete ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s 0.3s ease, transform 0.8s 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Status dot */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isRunning
                ? "#4ade80"
                : isLoading
                  ? "#facc15"
                  : "rgba(255,255,255,0.15)",
              boxShadow: isRunning
                ? "0 0 12px rgba(74,222,128,0.5)"
                : isLoading
                  ? "0 0 12px rgba(250,204,21,0.4)"
                  : "none",
              transition: "all 0.5s",
              animation:
                isLoading
                  ? "statusBlink 1s ease-in-out infinite"
                  : isRunning
                    ? "statusBlink 2.5s ease-in-out infinite"
                    : undefined,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 200,
              color: isRunning
                ? "#4ade80"
                : isLoading
                  ? "#facc15"
                  : "rgba(255,255,255,0.4)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: "color 0.5s",
            }}
          >
            {isRunning
              ? "Active & Listening"
              : isLoading
                ? "Initializing…"
                : "Offline"}
          </span>
        </div>

        {/* Prompt Text (typewriter) */}
        <div
          style={{
            marginTop: 16,
            minHeight: 24,
            textAlign: "center",
            maxWidth: 400,
            opacity: introComplete ? 1 : 0,
            transition: "opacity 0.8s 0.4s ease",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 200,
              color: "rgba(255,255,255,0.45)",
              fontStyle: "italic",
              letterSpacing: "0.02em",
              transition: "opacity 0.3s",
              opacity: promptText ? 1 : 0,
            }}
          >
            {promptText}
            {isSpeaking && (
              <span
                style={{
                  display: "inline-block",
                  width: 1,
                  height: 14,
                  background: "rgba(255,255,255,0.5)",
                  marginLeft: 2,
                  verticalAlign: "text-bottom",
                  animation: "cursorBlink 0.8s step-end infinite",
                }}
              />
            )}
          </p>
        </div>

        {/* Start / Stop Button */}
        <div
          style={{
            marginTop: 40,
            opacity: introComplete ? 1 : 0,
            transform: introComplete ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s 0.5s ease, transform 0.8s 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {!isRunning ? (
            <button
              onClick={startMantra}
              disabled={isLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 40px",
                fontSize: 14,
                fontWeight: 300,
                fontFamily: "inherit",
                color: isLoading ? "rgba(250,204,21,0.6)" : "#4ade80",
                background: isLoading
                  ? "rgba(250,204,21,0.06)"
                  : "rgba(74, 222, 128, 0.06)",
                border: `1px solid ${
                  isLoading
                    ? "rgba(250,204,21,0.2)"
                    : "rgba(74, 222, 128, 0.2)"
                }`,
                borderRadius: 14,
                cursor: isLoading ? "wait" : "pointer",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                transition: "all 0.4s",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background =
                    "rgba(74, 222, 128, 0.12)";
                  e.currentTarget.style.borderColor =
                    "rgba(74, 222, 128, 0.35)";
                  e.currentTarget.style.boxShadow =
                    "0 0 30px rgba(74, 222, 128, 0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background =
                    "rgba(74, 222, 128, 0.06)";
                  e.currentTarget.style.borderColor =
                    "rgba(74, 222, 128, 0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {/* Play icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon
                  points="10 8 16 12 10 16 10 8"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
              {isLoading ? "Starting Engine…" : "Start Mantra Engine"}
            </button>
          ) : (
            <button
              onClick={stopMantra}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 40px",
                fontSize: 14,
                fontWeight: 300,
                fontFamily: "inherit",
                color: "#f87171",
                background: "rgba(248, 113, 113, 0.06)",
                border: "1px solid rgba(248, 113, 113, 0.2)",
                borderRadius: 14,
                cursor: "pointer",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                transition: "all 0.4s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(248, 113, 113, 0.12)";
                e.currentTarget.style.borderColor =
                  "rgba(248, 113, 113, 0.35)";
                e.currentTarget.style.boxShadow =
                  "0 0 30px rgba(248, 113, 113, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "rgba(248, 113, 113, 0.06)";
                e.currentTarget.style.borderColor =
                  "rgba(248, 113, 113, 0.2)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Stop icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <rect
                  x="9"
                  y="9"
                  width="6"
                  height="6"
                  rx="1"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
              Stop Mantra Engine
            </button>
          )}
        </div>

        {/* Version tag */}
        <p
          style={{
            marginTop: 48,
            fontSize: 10,
            fontWeight: 200,
            color: "rgba(255,255,255,0.15)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: introComplete ? 1 : 0,
            transition: "opacity 0.8s 0.6s ease",
          }}
        >
          MantraAI v3.0 — Starter Engine
        </p>
      </main>

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 13,
            fontWeight: 300,
            color: "#e2e8f0",
            backdropFilter: "blur(20px)",
            zIndex: 100,
            animation: "toastIn 0.3s ease-out",
          }}
        >
          {toast}
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes statusBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
