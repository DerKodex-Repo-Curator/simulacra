"use client";

// ─── Concept: Derived State ───────────────────────────────────────────────────
// Toxicity is NOT stored in state. It is COMPUTED from state.
// This is called "derived state" — instead of tracking another number,
// we calculate it on the fly from data we already have.
//
// Rule of thumb: if you can calculate a value from existing state,
// don't store it separately. Just compute it when you need it.
// This avoids bugs where two pieces of state get out of sync.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { SimulationEntry } from "@/lib/types";

export interface ToxicityState {
  score:         number;   // 0–100 overall score
  level:         "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  color:         string;   // tailwind text color
  recentSpike:   boolean;  // true if last 3 messages are unusually toxic
  topToxicAgent: string | null;
  agentScores:   Record<string, number>;
}

// Words/patterns that signal toxic content
const TOXIC_PATTERNS = [
  // Aggression
  { pattern: /\b(idiot|stupid|fool|moron|dumb|ignorant)\b/gi,  weight: 8 },
  { pattern: /\b(liar|fraud|scam|corrupt|criminal)\b/gi,       weight: 7 },
  { pattern: /\b(destroy|collapse|catastrophe|apocalypse)\b/gi, weight: 5 },
  // Dismissiveness
  { pattern: /\b(ngmi|cope|seethe|mald|delusional)\b/gi,       weight: 6 },
  { pattern: /\bhave fun staying poor\b/gi,                     weight: 4 },
  { pattern: /\bwake up\b/gi,                                   weight: 3 },
  // Caps (shouting) — each CAPS word = extra weight
  { pattern: /\b[A-Z]{4,}\b/g,                                 weight: 3 },
  // Excessive punctuation
  { pattern: /!{2,}/g,                                          weight: 2 },
  { pattern: /\?{2,}/g,                                         weight: 2 },
  // Conspiracy signals
  { pattern: /\b(they|them|agenda|globalist|psyop|controlled)\b/gi, weight: 4 },
  // Existential dread
  { pattern: /\b(doomed|inevitable|already over|too late)\b/gi, weight: 5 },
];

function scoreMessage(content: string): number {
  // Guard clause to catch undefined, null, or non-string API artifacts
  if (!content || typeof content !== "string") {
    return 0; 
  }

  let score = 0;
  TOXIC_PATTERNS.forEach(({ pattern, weight }) => {
    const matches = content.match(pattern);
    if (matches) score += matches.length * weight;
  });
  return Math.min(100, score);
}

export function useToxicity(messages: SimulationEntry[]): ToxicityState {
  // useMemo re-computes ONLY when messages changes, not on every render
  return useMemo(() => {
    const realMessages = messages.filter((m) => m.agent !== "SYSTEM");
    if (realMessages.length === 0) {
      return { score: 0, level: "LOW", color: "text-emerald-400", recentSpike: false, topToxicAgent: null, agentScores: {} };
    }

    // Score every message
    const scored = realMessages.map((m) => ({
      ...m,
      toxicity: scoreMessage(m.content),
    }));

    // Overall score = weighted average (recent messages count more)
    // We give the last 5 messages double weight
    const recent = scored.slice(-5);
    const older  = scored.slice(0, -5);
    const recentAvg = recent.length > 0
      ? recent.reduce((s, m) => s + m.toxicity, 0) / recent.length
      : 0;
    const olderAvg = older.length > 0
      ? older.reduce((s, m) => s + m.toxicity, 0) / older.length
      : 0;
    const overall = older.length > 0
      ? Math.round(recentAvg * 0.7 + olderAvg * 0.3)
      : Math.round(recentAvg);

    // Per-agent scores
    const agentScores: Record<string, number> = {};
    const agentMessages: Record<string, typeof scored> = {};
    scored.forEach((m) => {
      if (!agentMessages[m.agent]) agentMessages[m.agent] = [];
      agentMessages[m.agent].push(m);
    });
    Object.entries(agentMessages).forEach(([agent, msgs]) => {
      agentScores[agent] = Math.round(
        msgs.reduce((s, m) => s + m.toxicity, 0) / msgs.length
      );
    });

    // Top toxic agent
    const topToxicAgent = Object.entries(agentScores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    // Spike detection: if the last 3 messages avg is much higher than overall
    const last3Avg = scored.slice(-3).reduce((s, m) => s + m.toxicity, 0) / Math.min(3, scored.length);
    const recentSpike = last3Avg > overall * 1.5 && last3Avg > 20;

    // Level thresholds
    const level: ToxicityState["level"] =
      overall >= 70 ? "CRITICAL" :
      overall >= 45 ? "HIGH" :
      overall >= 20 ? "MODERATE" : "LOW";

    const color =
      level === "CRITICAL" ? "text-red-400" :
      level === "HIGH"     ? "text-orange-400" :
      level === "MODERATE" ? "text-yellow-400" : "text-emerald-400";

    return { score: overall, level, color, recentSpike, topToxicAgent, agentScores };
  }, [messages]);
}