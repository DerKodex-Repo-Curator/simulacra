"use client";

import { useEffect, useRef, useState } from "react";
import {
  Heart, Repeat2, MessageCircle, Share,
  Radio, Filter, Zap, Volume2, VolumeX, Film,
  AlertTriangle,
} from "lucide-react";
import { SimulationEntry, getPersonaColors } from "@/lib/types";
import { SimulationStatus } from "@/hooks/useSimulation";
import { useSounds } from "@/hooks/useSounds";
import { useToxicity } from "@/hooks/useToxicity";

interface Props {
  data:        SimulationEntry[];
  activeAgent: string | null;
  status:      SimulationStatus;
  onCinemaMode: () => void;
}

const AGENT_AVATARS: Record<string, string> = {
  "The Tech Doomer":        "☠",
  "The Crypto Bro":         "₿",
  "The Skeptical Banker":   "♖",
  "The AI Accelerationist": "⚡",
  "The Conspiracy Theorist":"👁",
  "The Doomer Journalist":  "📰",
  "The Naive Optimist":     "☀",
};

function getTweetStats(index: number) {
  const seed = (index + 1) * 7919;
  return {
    likes:    ((seed * 13) % 891) + 12,
    retweets: ((seed * 7)  % 234) + 3,
    replies:  ((seed * 11) % 89)  + 1,
  };
}

export default function Feed({ data, activeAgent, status, onCinemaMode }: Props) {
  const [filter,       setFilter]       = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const feedRef    = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  const sounds   = useSounds(soundEnabled);
  const toxicity = useToxicity(data);

  const filteredData = filter ? data.filter((d) => d.agent === filter) : data;
  
  // FIX: Filter out falsy/undefined agent values before mapping
  const uniqueAgents = Array.from(new Set(data.filter((d) => d.agent && d.agent !== "SYSTEM").map((d) => d.agent)));
  const isLive       = status === "running" || status === "injecting";

  // Auto-scroll + play sounds when new messages arrive
  useEffect(() => {
    if (data.length > prevLenRef.current) {
      // Scroll to bottom
      if (feedRef.current) {
        feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
      }
      // Play appropriate sound
      const newest = data[data.length - 1];
      if (newest) {
        if (newest.agent === "SYSTEM") {
          sounds.playInjection();
        } else {
          sounds.playNewPost();
        }
      }
    }
    prevLenRef.current = data.length;
  }, [data, sounds]);

  // Play typing sound when an agent starts typing
  useEffect(() => {
    if (activeAgent) sounds.playTyping();
  }, [activeAgent, sounds]);

  const toxColor =
    toxicity.level === "CRITICAL" ? "text-red-400" :
    toxicity.level === "HIGH"     ? "text-orange-400" :
    toxicity.level === "MODERATE" ? "text-yellow-400" : "text-emerald-400";

  const toxBgColor =
    toxicity.level === "CRITICAL" ? "#ef444420" :
    toxicity.level === "HIGH"     ? "#f9731620" :
    toxicity.level === "MODERATE" ? "#eab30820" : "#22c55e20";

  return (
    <section className="panel h-full flex flex-col overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-zinc-800/70 bg-black/20">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${isLive ? "text-red-500 animate-pulse" : "text-zinc-600"}`} />
              <h2 className="font-display text-sm font-bold text-white tracking-[0.2em] uppercase">Live Feed</h2>
            </div>
            <p className="text-zinc-500 text-xs font-mono mt-0.5">
              {data.filter((d) => d.agent !== "SYSTEM").length} posts
              {activeAgent && (
                <span className="text-purple-400 ml-2 animate-pulse">
                  · {activeAgent?.replace("The ", "")} is thinking...
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toxicity score badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all duration-700 ${
                toxicity.level === "CRITICAL" ? "toxic-critical border-red-500/40" : "border-zinc-700/50"
              }`}
              style={{ backgroundColor: toxBgColor }}
            >
              {toxicity.level === "CRITICAL" && <AlertTriangle className="w-3 h-3 text-red-400" />}
              <span className={`text-xs font-mono font-bold ${toxColor}`}>
                ☣ {toxicity.score}
              </span>
              <span className={`text-xs font-mono ${toxColor} opacity-70`}>
                {toxicity.level}
              </span>
            </div>

            {/* Sound toggle */}
            <button onClick={() => setSoundEnabled((s) => !s)}
              className={`p-1.5 rounded-lg border transition-all ${soundEnabled ? "border-purple-500/30 text-purple-400 bg-purple-500/10" : "border-zinc-700/50 text-zinc-600"}`}
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}>
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Cinema mode button */}
            <button onClick={onCinemaMode}
              className="p-1.5 rounded-lg border border-zinc-700/50 text-zinc-400 hover:text-purple-400 hover:border-purple-500/30 transition-all"
              title="Cinema mode">
              <Film className="w-3.5 h-3.5" />
            </button>

            {isLive && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-xs font-mono">
                  {status === "injecting" ? "INJECTING" : "LIVE"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Toxicity bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-600 text-xs font-mono">ECHO CHAMBER TOXICITY</span>
            {toxicity.recentSpike && (
              <span className="text-red-400 text-xs font-mono animate-pulse">⚠ SPIKE DETECTED</span>
            )}
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${isLive ? "meter-live" : ""}`}
              style={{
                width: `${toxicity.score}%`,
                background: `linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)`,
                backgroundSize: "400% 100%",
                backgroundPosition: `${toxicity.score}% 0`,
              }} />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3 h-3 text-zinc-500" />
          <button onClick={() => setFilter(null)}
            className={`text-xs font-mono px-2 py-0.5 rounded-full border transition-all ${
              filter === null
                ? "border-purple-500/60 bg-purple-500/15 text-purple-300"
                : "border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
            }`}>
            All
          </button>
          {uniqueAgents.map((agent) => {
            const colors   = getPersonaColors(agent);
            const isActive = filter === agent;
            return (
              <button key={agent} onClick={() => setFilter(isActive ? null : agent)}
                className={`text-xs font-mono px-2 py-0.5 rounded-full border transition-all ${
                  isActive
                    ? `${colors.border} ${colors.bg} ${colors.text}`
                    : "border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400"
                }`} style={{ fontSize: "10px" }}>
                {agent?.replace("The ", "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable Feed ───────────────────────────────────────────── */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {data.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
            <div className="w-16 h-16 border-2 border-purple-500/30 border-t-purple-500/80 rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm font-mono">Agents initializing...</p>
          </div>
        )}

        {filteredData.map((entry, i) => {
          if (entry.agent === "SYSTEM") return <InjectionCard key={i} entry={entry} />;
          return (
            <TweetCard
              key={i}
              entry={entry}
              index={i}
              isNew={i === data.length - 1}
            />
          );
        })}

        {/* Typing indicator */}
        {activeAgent && (
          <div className="bg-zinc-900/30 border border-dashed border-zinc-700/50 rounded-xl p-4">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center border"
                style={{
                  borderColor:     getPersonaColors(activeAgent).hex,
                  backgroundColor: `${getPersonaColors(activeAgent).hex}15`,
                }}>
                {AGENT_AVATARS[activeAgent] ?? "◉"}
              </div>
              <div>
                <span className={`text-sm font-mono ${getPersonaColors(activeAgent).text}`}>{activeAgent}</span>
                <div className="flex gap-1 mt-1.5">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                      style={{ animationDelay: `${j * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {data.length > 0 && !activeAgent && (
          <div className="flex items-center justify-center py-4 gap-3">
            <div className="h-px flex-1 bg-zinc-800/50" />
            <span className="text-zinc-600 text-xs font-mono">
              {"// SIMULATION CONTINUES //"}
            </span>
            <div className="h-px flex-1 bg-zinc-800/50" />
          </div>
        )}
      </div>
    </section>
  );
}

function InjectionCard({ entry }: { entry: SimulationEntry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
      <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
      <p className="text-yellow-300 text-xs font-mono italic">{entry.content}</p>
    </div>
  );
}

function TweetCard({ entry, index, isNew }: {
  entry: SimulationEntry; index: number; isNew: boolean;
}) {
  const colors  = getPersonaColors(entry.agent);
  const stats   = getTweetStats(index);
  const avatar  = AGENT_AVATARS[entry.agent] ?? "◉";
  // FIX: Added optional chaining and fallback for handling undefined agent names safely here too
  const handle  = "@" + (entry.agent || "unknown").toLowerCase().replace(/\s+/g, "_").replace(/the_/, "");
  const [liked,      setLiked]      = useState(false);
  const [retweeted,  setRetweeted]  = useState(false);

  return (
    <div className={`bg-zinc-900/45 border border-zinc-800/60 rounded-xl p-4 cursor-pointer group transition-all duration-200 hover:border-zinc-700/70 hover:bg-zinc-900/70 ${isNew ? "feed-slide-in" : ""}`}>
      {entry.replying_to && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-px opacity-40" style={{ backgroundColor: colors.hex }} />
          <span className="text-zinc-500 text-xs font-mono italic">
            Replying to <span className="text-zinc-400">
              @{entry.replying_to.toLowerCase().replace(/\s+/g, "_").replace(/the_/, "")}
            </span>
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border ${colors.border} ${colors.bg}`}
          style={{ boxShadow: `0 0 12px ${colors.hex}20` }}>
          {avatar}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`${colors.text} text-sm font-semibold font-mono`}
              style={{ textShadow: `0 0 8px ${colors.hex}60` }}>
              {entry.agent}
            </span>
            <span className="text-zinc-600 text-xs font-mono">{handle}</span>
          </div>
          <p className="text-zinc-200 text-sm leading-relaxed">{entry.content}</p>

          <div className="flex items-center gap-5 mt-3 pt-2 border-t border-zinc-800/40">
            <ActionBtn icon={<MessageCircle className="w-3.5 h-3.5" />} count={stats.replies}   color="hover:text-blue-400 hover:bg-blue-500/10" />
            <ActionBtn icon={<Repeat2      className="w-3.5 h-3.5" />} count={stats.retweets + (retweeted ? 1 : 0)}
              color="hover:text-emerald-400 hover:bg-emerald-500/10" active={retweeted} activeColor="text-emerald-400"
              onClick={() => setRetweeted((r) => !r)} />
            <ActionBtn icon={<Heart        className="w-3.5 h-3.5" />} count={stats.likes + (liked ? 1 : 0)}
              color="hover:text-red-400 hover:bg-red-500/10" active={liked} activeColor="text-red-400"
              onClick={() => setLiked((l) => !l)} />
            <button className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors p-1 rounded-md hover:bg-zinc-800/50">
              <Share className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, count, color, active, activeColor, onClick }: {
  icon: React.ReactNode; count: number; color: string;
  active?: boolean; activeColor?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 text-zinc-500 text-xs font-mono transition-all px-1.5 py-1 rounded-md ${color} ${active ? activeColor : ""}`}>
      {icon}<span>{count.toLocaleString()}</span>
    </button>
  );
}