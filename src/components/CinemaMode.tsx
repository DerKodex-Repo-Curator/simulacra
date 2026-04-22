"use client";

// ─── Concept: Portal + Fullscreen API ────────────────────────────────────────
// Cinema mode takes over the entire screen. We use two browser APIs:
//
// 1. document.documentElement.requestFullscreen() — native browser fullscreen
//    (hides the URL bar, OS taskbar, everything)
//
// 2. Conditional rendering — when cinemaMode is true, we render a completely
//    different component that overlays the whole viewport using fixed positioning
//
// The component receives the same `data` and `activeAgent` as Feed, but renders
// in a completely stripped-down layout optimized for screen recording / demos.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { SimulationEntry, getPersonaColors } from "@/lib/types";
import { ToxicityState } from "@/hooks/useToxicity";

const AGENT_AVATARS: Record<string, string> = {
  "The Tech Doomer":        "☠",
  "The Crypto Bro":         "₿",
  "The Skeptical Banker":   "♖",
  "The AI Accelerationist": "⚡",
  "The Conspiracy Theorist":"👁",
  "The Doomer Journalist":  "📰",
  "The Naive Optimist":     "☀",
};

interface Props {
  data:        SimulationEntry[];
  activeAgent: string | null;
  toxicity:    ToxicityState;
  onClose:     () => void;
}

export default function CinemaMode({ data, activeAgent, toxicity, onClose }: Props) {
  const feedRef      = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [data.length]);

  // Listen for fullscreen change events (e.g. user presses Escape)
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // Keyboard shortcut: Escape to close cinema mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const realMessages = data.filter((m) => m.agent !== "SYSTEM");
  const last10       = data.slice(-30); // Show last 30 in cinema view

  const toxColor =
    toxicity.level === "CRITICAL" ? "#ef4444" :
    toxicity.level === "HIGH"     ? "#f97316" :
    toxicity.level === "MODERATE" ? "#eab308" : "#22c55e";

  return (
    // fixed inset-0 = covers the ENTIRE viewport, z-50 = on top of everything
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">

      {/* ── Top HUD ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-6">
          <h1 className="font-display text-lg font-black text-white tracking-widest glow-title">
            SIMULACRA
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-mono tracking-widest">LIVE SIMULATION</span>
          </div>
        </div>

        {/* Live stats in HUD */}
        <div className="flex items-center gap-8">
          <HudStat label="POSTS"   value={`${realMessages.length}`}  color="text-blue-400"   />
          <HudStat label="REPLIES" value={`${data.filter(m => m.replying_to && m.agent !== "SYSTEM").length}`} color="text-emerald-400" />
          <HudStat label="AGENTS"  value="7"                         color="text-purple-400" />

          {/* Toxicity meter in HUD */}
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 text-xs font-mono tracking-widest">TOXICITY</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${toxicity.score}%`, backgroundColor: toxColor, boxShadow: `0 0 8px ${toxColor}` }} />
              </div>
              <span className="font-mono font-bold text-sm" style={{ color: toxColor }}>
                {toxicity.score}
              </span>
            </div>
            <span className="font-mono text-xs" style={{ color: toxColor, fontSize: "10px" }}>
              {toxicity.level}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-white transition-all">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-red-400 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main Feed ──────────────────────────────────────────────────── */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {last10.map((entry, i) => {
            if (entry.agent === "SYSTEM") {
              return (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="flex-1 h-px bg-yellow-500/20" />
                  <span className="text-yellow-400 text-sm font-mono text-center px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    {entry.content}
                  </span>
                  <div className="flex-1 h-px bg-yellow-500/20" />
                </div>
              );
            }

            const colors = getPersonaColors(entry.agent);
            const avatar = AGENT_AVATARS[entry.agent] ?? "◉";
            const isLatest = i === last10.length - 1;

            return (
              <div key={i} className={`flex gap-4 transition-all duration-500 ${isLatest ? "opacity-100" : "opacity-70"}`}>
                {/* Avatar */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl border-2"
                  style={{
                    borderColor:     colors.hex,
                    backgroundColor: `${colors.hex}15`,
                    boxShadow:       `0 0 ${isLatest ? "20px" : "8px"} ${colors.hex}${isLatest ? "60" : "30"}`,
                  }}>
                  {avatar}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-base"
                      style={{ color: colors.hex, textShadow: `0 0 12px ${colors.hex}80` }}>
                      {entry.agent}
                    </span>
                    {entry.replying_to && (
                      <span className="text-zinc-600 text-xs font-mono italic">
                        → replying to {entry.replying_to}
                      </span>
                    )}
                  </div>
                  <p className={`text-zinc-200 leading-relaxed ${isLatest ? "text-base" : "text-sm"}`}>
                    {entry.content}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Active agent typing */}
          {activeAgent && (
            <div className="flex gap-4 opacity-60">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 border-dashed"
                style={{ borderColor: getPersonaColors(activeAgent).hex }}>
                {AGENT_AVATARS[activeAgent] ?? "◉"}
              </div>
              <div className="flex-1 flex items-center gap-3">
                <span className="font-mono font-bold" style={{ color: getPersonaColors(activeAgent).hex }}>
                  {activeAgent}
                </span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: getPersonaColors(activeAgent).hex, animationDelay: `${j * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom ticker — scrolling agent names ─────────────────────── */}
      <div className="flex-shrink-0 border-t border-zinc-800/50 py-2 px-8 overflow-hidden">
        <div className="flex items-center gap-8 animate-[tickerScroll_20s_linear_infinite]"
          style={{ whiteSpace: "nowrap" }}>
          {[...Array(3)].flatMap(() =>
            ["The Tech Doomer","The Crypto Bro","The Skeptical Banker",
             "The AI Accelerationist","The Conspiracy Theorist","The Doomer Journalist","The Naive Optimist"]
              .map((agent, i) => {
                const colors = getPersonaColors(agent);
                return (
                  <span key={`${agent}-${i}`} className="font-mono text-xs"
                    style={{ color: colors.hex, opacity: 0.5 }}>
                    {AGENT_AVATARS[agent]} {agent.replace("The ", "").toUpperCase()}
                  </span>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}

function HudStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-zinc-500 text-xs font-mono tracking-widest">{label}</span>
      <span className={`${color} font-display font-bold text-lg stat-number`}>{value}</span>
    </div>
  );
}