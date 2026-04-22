"use client";

// ─── Concept: Derived data + conditional rendering ────────────────────────────
// This panel receives the full messages array and a selected agent name.
// All stats (post count, reply count, most controversial post, etc.) are
// computed from the messages array — no extra state needed.
// Conditional rendering: if no agent is selected, show nothing (return null).
// ─────────────────────────────────────────────────────────────────────────────

import { X, MessageSquare, Reply, TrendingUp, Brain } from "lucide-react";
import { SimulationEntry, getPersonaColors, AGENTS } from "@/lib/types";
import { computeRadicalization } from "@/lib/types";

const AGENT_AVATARS: Record<string, string> = {
  "The Tech Doomer":        "☠",
  "The Crypto Bro":         "₿",
  "The Skeptical Banker":   "♖",
  "The AI Accelerationist": "⚡",
  "The Conspiracy Theorist":"👁",
  "The Doomer Journalist":  "📰",
  "The Naive Optimist":     "☀",
};

const AGENT_BIOS: Record<string, string> = {
  "The Tech Doomer":
    "Former ML researcher at a major AI lab. Left after seeing internal safety reports get buried. Now writes long Twitter threads nobody reads. Hasn't slept properly in 3 years.",
  "The Crypto Bro":
    "Early Bitcoin adopter. Made and lost three fortunes. Currently 'DCA-ing into the chaos.' Runs a paid Telegram channel with 50,000 subscribers. Definitely not financial advice.",
  "The Skeptical Banker":
    "20 years in risk management at bulge-bracket banks. Predicted 2008 internally. Was ignored. Has been trying to warn people about the next one ever since. Secretly fascinated by crypto.",
  "The AI Accelerationist":
    "Software engineer turned e/acc evangelist. Believes slowing AI development is the greatest moral crime of the 21st century. Writes manifestos at 3am. Has a lot of energy.",
  "The Conspiracy Theorist":
    "Former government contractor. Saw something they weren't supposed to see. Now connects dots for a living. The pattern is always there if you know where to look.",
  "The Doomer Journalist":
    "Covered the dot-com bubble, 2008, crypto winter, and every AI hype cycle. Has seen every narrative collapse. Still files stories. Still gets ignored. Still right.",
  "The Naive Optimist":
    "23 years old. Just graduated with a CS degree. Genuinely believes technology will solve climate change, poverty, and war. Everyone in this simulation is trying to break them.",
};

interface Props {
  agent:    string | null;
  data:     SimulationEntry[];
  onClose:  () => void;
}

export default function AgentProfile({ agent, data, onClose }: Props) {
  if (!agent || agent === "SYSTEM") return null;

  const colors     = getPersonaColors(agent);
  const avatar     = AGENT_AVATARS[agent] ?? "◉";
  const bio        = AGENT_BIOS[agent] ?? "An autonomous AI agent participating in the simulation.";
  const handle     = "@" + agent.toLowerCase().replace(/\s+/g, "_").replace(/the_/, "");

  // Compute stats from messages
  const agentMessages  = data.filter((m) => m.agent === agent);
  const postCount      = agentMessages.length;
  const replyCount     = agentMessages.filter((m) => m.replying_to !== null).length;
  const receivedCount  = data.filter((m) => m.replying_to === agent).length;
  const radicalization = computeRadicalization(data, agent);

  // Who this agent talks to most
  const targetCounts: Record<string, number> = {};
  agentMessages.forEach((m) => {
    if (m.replying_to) targetCounts[m.replying_to] = (targetCounts[m.replying_to] ?? 0) + 1;
  });
  const topTarget = Object.entries(targetCounts).sort(([, a], [, b]) => b - a)[0];

  // Most recent 3 posts
  const recentPosts = agentMessages.slice(-3).reverse();

  return (
    // fixed right panel sliding in from the right
    <div className="fixed right-0 top-0 h-full w-80 bg-zinc-900 border-l border-zinc-700/50 z-40 flex flex-col shadow-2xl"
      style={{ boxShadow: `-8px 0 40px ${colors.hex}20` }}>

      {/* Header */}
      <div className="flex-shrink-0 p-5 border-b border-zinc-800/50"
        style={{ background: `linear-gradient(135deg, ${colors.hex}15, transparent)` }}>
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2"
            style={{
              borderColor:     colors.hex,
              backgroundColor: `${colors.hex}20`,
              boxShadow:       `0 0 24px ${colors.hex}40`,
            }}>
            {avatar}
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="font-display font-bold text-white text-sm tracking-wide"
          style={{ textShadow: `0 0 12px ${colors.hex}60` }}>
          {agent}
        </h2>
        <p className="font-mono text-xs mt-0.5" style={{ color: colors.hex }}>{handle}</p>
        <p className="text-zinc-500 text-xs font-mono mt-3 leading-relaxed">{bio}</p>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3 p-4 border-b border-zinc-800/50">
        {[
          { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Posts",      value: postCount     },
          { icon: <Reply         className="w-3.5 h-3.5" />, label: "Replies sent", value: replyCount   },
          { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Replies recv", value: receivedCount },
          { icon: <TrendingUp    className="w-3.5 h-3.5" />, label: "Radicalization", value: `${radicalization}%` },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-zinc-800/40 rounded-lg p-3 border border-zinc-700/30">
            <div className="flex items-center gap-1.5 mb-1" style={{ color: colors.hex }}>
              {icon}
              <span className="text-zinc-500 text-xs font-mono">{label}</span>
            </div>
            <span className="text-white font-display font-bold text-lg stat-number">{value}</span>
          </div>
        ))}
      </div>

      {/* Radicalization bar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-zinc-500 text-xs font-mono">RADICALIZATION LEVEL</span>
          <span className="font-mono text-xs font-bold" style={{ color: colors.hex }}>{radicalization}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width:           `${radicalization}%`,
              backgroundColor: colors.hex,
              boxShadow:       `0 0 8px ${colors.hex}`,
            }} />
        </div>
      </div>

      {/* Top target */}
      {topTarget && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800/50">
          <p className="text-zinc-500 text-xs font-mono mb-1.5">MOST ARGUED WITH</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm border"
              style={{ borderColor: getPersonaColors(topTarget[0]).hex, backgroundColor: `${getPersonaColors(topTarget[0]).hex}15` }}>
              {AGENT_AVATARS[topTarget[0]] ?? "◉"}
            </div>
            <span className="font-mono text-xs" style={{ color: getPersonaColors(topTarget[0]).hex }}>
              {topTarget[0]}
            </span>
            <span className="text-zinc-600 text-xs font-mono ml-auto">{topTarget[1]}× replies</span>
          </div>
        </div>
      )}

      {/* Recent posts */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-3 h-3 text-zinc-400" />
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider">Recent Posts</span>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-zinc-600 text-xs font-mono text-center py-4">No posts yet</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post, i) => (
              <div key={i} className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-3">
                {post.replying_to && (
                  <p className="text-zinc-600 text-xs font-mono italic mb-1">
                    → replying to {post.replying_to}
                  </p>
                )}
                <p className="text-zinc-300 text-xs leading-relaxed">{post.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
