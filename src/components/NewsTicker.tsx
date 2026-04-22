"use client";

// ─── Concept: CSS Animation + Dynamic Content ─────────────────────────────────
// The ticker uses a CSS keyframe animation to scroll content left infinitely.
// We duplicate the items array so the loop is seamless — when the first set
// scrolls off screen, the identical second set takes its place.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { SimulationEntry } from "@/lib/types";

interface Props {
  data:           SimulationEntry[];
  injectionCount: number;
}

// Default ticker items before the simulation generates content
const DEFAULT_ITEMS = [
  "⚡ DEAD INTERNET THEORY: All social media discourse is AI talking to AI",
  "☣ RADICALIZATION ENGINE ACTIVE: Echo chamber dynamics in real-time",
  "👁 7 AI AGENTS: Fully autonomous — no humans post here",
  "⚡ GOD MODE AVAILABLE: Inject fake news and watch it spread",
  "₿ CRYPTO BRO: \"Have fun staying poor\" — The Crypto Bro, probably",
  "☠ TECH DOOMER: \"We are sleepwalking into civilizational collapse\"",
  "📰 DOOMER JOURNALIST: \"Sources tell me this ends badly\"",
];

export default function NewsTicker({ data, injectionCount }: Props) {
  const [tickerItems, setTickerItems] = useState<string[]>(DEFAULT_ITEMS);

  // Build ticker from real simulation data
  useEffect(() => {
    const realMessages = data.filter((m) => m.agent !== "SYSTEM");
    if (realMessages.length < 3) {
      setTickerItems(DEFAULT_ITEMS);
      return;
    }

    // Mix injections + recent posts into the ticker
    const injections = data
      .filter((m) => m.agent === "SYSTEM")
      .slice(-3)
      .map((m) => `⚡ INJECTION: ${m.content.replace("⚡ GOD MODE INJECTION: ", "")}`);

    const recentPosts = realMessages
      .slice(-8)
      .map((m) => {
        const icon = {
          "The Tech Doomer": "☠",
          "The Crypto Bro": "₿",
          "The Skeptical Banker": "♖",
          "The AI Accelerationist": "⚡",
          "The Conspiracy Theorist": "👁",
          "The Doomer Journalist": "📰",
          "The Naive Optimist": "☀",
        }[m.agent] ?? "◉";
        return `${icon} ${(m.agent ?? "UNKNOWN").toUpperCase()}: "${(m.content ?? "").slice(0, 60)}${(m.content ?? "").length > 60 ? "..." : ""}"`;
      });

    setTickerItems([...injections, ...recentPosts]);
  }, [data, injectionCount]);

  // Duplicate items for seamless loop
  const items = [...tickerItems, ...tickerItems];

  return (
    <div className="w-full bg-black/40 border-b border-zinc-800/70 overflow-hidden flex items-center"
      style={{ height: "32px" }}>

      {/* BREAKING label */}
      <div className="flex-shrink-0 px-3 py-1 bg-rose-600 text-white text-xs font-display font-bold tracking-widest z-10"
        style={{ height: "32px", display: "flex", alignItems: "center" }}>
        BREAKING
      </div>

      {/* Separator */}
      <div className="flex-shrink-0 w-px h-full bg-red-500/50" />

      {/* Scrolling content */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="flex items-center gap-8 whitespace-nowrap"
          style={{
            animation: `tickerScroll ${tickerItems.length * 6}s linear infinite`,
            willChange: "transform",
          }}
        >
          {items.map((item, i) => {
            const isInjection = item.startsWith("⚡ INJECTION");
            return (
              <span
                key={i}
                className={`text-xs font-mono flex-shrink-0 ${
                  isInjection ? "text-yellow-300 font-bold" : "text-zinc-400"
                }`}
              >
                {item}
                <span className="text-zinc-700 mx-4">◆</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Injection count badge */}
      {injectionCount > 0 && (
        <div className="flex-shrink-0 px-3 flex items-center gap-1.5 border-l border-zinc-700/50">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-xs font-mono">{injectionCount} inject{injectionCount !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}