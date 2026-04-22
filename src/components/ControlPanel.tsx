"use client";

import { useState, useEffect, useRef } from "react";
import {
  Terminal, Zap, Users, MessageSquare, Activity,
  Wifi, Shield, ChevronRight, AlertTriangle, Cpu,
  Play, Pause, RotateCcw, WifiOff, Sparkles, Newspaper,
  Download, Gauge, BookOpen, GitBranch, Layers,
} from "lucide-react";
import {
  SimulationEntry, getPersonaColors, FactionMatrix, AGENTS,
} from "@/lib/types";
import { SimulationStatus, SpeedLevel, SPEED_LEVELS } from "@/hooks/useSimulation";
import { SavedSession } from "@/hooks/useReplay";

// ─── Scenario Presets ────────────────────────────────────────────────────────
// A preset is just a pre-written injection string.
// When you click one, it fires the inject function with that string.
// The agents then react as if you typed it yourself in God Mode.
const PRESETS: Array<{ label: string; emoji: string; thought: string; color: string }> = [
  {
    label:   "AGI Drops",
    emoji:   "🤖",
    thought: "OpenAI just announced AGI has been achieved. GPT-6 has passed every benchmark including self-replication. The press conference is live right now.",
    color:   "border-orange-500/40 text-orange-400 hover:bg-orange-500/10",
  },
  {
    label:   "BTC $1M",
    emoji:   "₿",
    thought: "Bitcoin just crossed $1,000,000 per coin. Coinbase is down. The NYSE halted trading. Every financial model on earth is broken.",
    color:   "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10",
  },
  {
    label:   "2008 Again",
    emoji:   "🏦",
    thought: "Three major US banks just froze withdrawals simultaneously. The Fed is in emergency session. This is worse than 2008 — sources say derivatives exposure is 10x larger.",
    color:   "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",
  },
  {
    label:   "AI Banned",
    emoji:   "⛔",
    thought: "The EU just passed an emergency law banning all AI models above GPT-3 capability. Violators face criminal charges. The US is expected to follow within 48 hours.",
    color:   "border-red-500/40 text-red-400 hover:bg-red-500/10",
  },
  {
    label:   "Simulation",
    emoji:   "🌀",
    thought: "A leaked Oxford paper proves with 99.7% confidence that we are living inside a computer simulation. The lead researcher has gone missing.",
    color:   "border-purple-500/40 text-purple-400 hover:bg-purple-500/10",
  },
  {
    label:   "Cash Banned",
    emoji:   "💸",
    thought: "The World Economic Forum announced all G20 nations will eliminate physical cash by January 1st next year. A mandatory digital ID wallet is required for all transactions.",
    color:   "border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10",
  },
];

// ─── Agent Icons ─────────────────────────────────────────────────────────────
const AGENT_ICONS: Record<string, string> = {
  "The Tech Doomer":        "☠",
  "The Crypto Bro":         "₿",
  "The Skeptical Banker":   "♖",
  "The AI Accelerationist": "⚡",
  "The Conspiracy Theorist":"👁",
  "The Doomer Journalist":  "📰",
  "The Naive Optimist":     "☀",
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  data:           SimulationEntry[];
  status:         SimulationStatus;
  activeAgent:    string | null;
  injectionCount: number;
  error:          string | null;
  factions:       FactionMatrix;
  radicalization: Record<string, number>;
  speed:          SpeedLevel;
  agentMemory:    Record<string, string[]>;
  onStart:        () => void;
  onPause:        () => void;
  onReset:        () => void;
  onInject:       (thought: string) => Promise<void>;
  onSetSpeed:      (speed: SpeedLevel) => void;
  savedSessions:   SavedSession[];
  isReplaying:     boolean;
  onSaveSession:   () => void;
  onStartReplay:   (session: SavedSession) => void;
  onStopReplay:    () => void;
  onDeleteSession:  (id: string) => void;
  onShowMisinfo:    () => void;
  onShowMultiRoom:  () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ControlPanel({
  data, status, activeAgent, injectionCount, error,
  factions, radicalization, speed, agentMemory,
  savedSessions, isReplaying,
  onStart, onPause, onReset, onInject, onSetSpeed,
  onSaveSession, onStartReplay, onStopReplay, onDeleteSession,
  onShowMisinfo, onShowMultiRoom,
}: Props) {
  const [injectedThought, setInjectedThought] = useState("");
  const [injecting,       setInjecting]       = useState(false);
  const [injected,        setInjected]        = useState(false);
  const [generatingNews,  setGeneratingNews]  = useState(false);
  const [uptime,          setUptime]          = useState(0);
  const [systemLoad,      setSystemLoad]      = useState(20);
  const [activeTab,       setActiveTab]       = useState<"god" | "presets" | "memory" | "replay">("god");
  const [logs,            setLogs]            = useState<string[]>([
    "SYS // Dead Internet OS v2.0 initialized",
    "NET // 7-agent mesh topology loaded",
    "AI  // Ollama llama3 synchronized",
    "SEC // Sandbox containment active",
  ]);
  const prevDataLen = useRef(data.length);

  const isRunning   = status === "running";
  const isInjecting = status === "injecting";

  const totalTweets  = data.filter((d) => d.agent !== "SYSTEM").length;
  const totalReplies = data.filter((d) => d.replying_to !== null && d.agent !== "SYSTEM").length;
  const avgRad       = AGENTS.length > 0
    ? Math.floor(Object.values(radicalization).reduce((a, b) => a + b, 0) / AGENTS.length)
    : 0;

  // Uptime + load ticker
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning || isInjecting) setUptime((u) => u + 1);
      setSystemLoad(
        isInjecting ? Math.floor(75 + Math.random() * 20) :
        isRunning   ? Math.floor(35 + Math.random() * 25) : 15
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isInjecting]);

  // System log — appends a new line every time a new message arrives
  useEffect(() => {
    if (data.length > prevDataLen.current) {
      const newest = data[data.length - 1];
      if (newest) {
        const prefix = newest.agent === "SYSTEM" ? "INJ" : "MSG";
        const name   = newest.agent === "SYSTEM"
          ? "INJECTION"
          : (newest.agent ?? "").replace("The ", "").toUpperCase().slice(0, 10);
        setLogs((prev) => [
          `${prefix} // ${name}: ${(newest.content ?? "").slice(0, 28)}...`,
          ...prev.slice(0, 7),
        ]);
      }
    }
    prevDataLen.current = data.length;
  }, [data]);

  useEffect(() => {
    if (error) setLogs((prev) => [`ERR // ${error.slice(0, 40)}`, ...prev.slice(0, 7)]);
  }, [error]);

  const formatUptime = (s: number) => {
    const h   = Math.floor(s / 3600).toString().padStart(2, "0");
    const m   = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const handleInject = async () => {
    if (!injectedThought.trim() || injecting) return;
    setInjecting(true);
    try {
      await onInject(injectedThought);
      setInjectedThought("");
      setInjected(true);
      setTimeout(() => setInjected(false), 2000);
    } finally {
      setInjecting(false);
    }
  };

  const handlePreset = async (thought: string) => {
    if (injecting) return;
    setInjecting(true);
    try {
      await onInject(thought);
    } finally {
      setInjecting(false);
    }
  };

  const handleGenerateNews = async () => {
    setGeneratingNews(true);
    try {
      const res = await fetch("/api/fakenews");
      const json = await res.json();
      if (json.headline) setInjectedThought(json.headline);
    } catch { /* silently fail */ }
    finally { setGeneratingNews(false); }
  };

  // Export session as JSON file
  // Concept: we build a string, create a Blob (binary file in memory),
  // create a temporary <a> tag, click it programmatically, then remove it.
  // This is the standard browser trick for downloading files without a server.
  const handleExportJSON = () => {
    const exportData = {
      exportedAt:     new Date().toISOString(),
      totalMessages:  totalTweets,
      totalReplies,
      injectionCount,
      radicalization,
      messages: data.map((m, i) => ({ id: i + 1, ...m })),
    };
    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: "application/json" }
    );
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `simulacra-session-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export as plain text transcript
  const handleExportTXT = () => {
    const lines = [
      "SIMULACRA — DEAD INTERNET OS",
      `Session exported: ${new Date().toLocaleString()}`,
      `Total posts: ${totalTweets} | Replies: ${totalReplies} | Injections: ${injectionCount}`,
      "=".repeat(60),
      "",
      ...data.map((m) => {
        if (m.agent === "SYSTEM") return `\n[${m.content}]\n`;
        const replyLine = m.replying_to ? ` (replying to ${m.replying_to})` : "";
        return `[${m.agent}${replyLine}]\n${m.content}\n`;
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `simulacra-session-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusColor = {
    running:"text-emerald-400", injecting:"text-yellow-400",
    paused:"text-zinc-400", idle:"text-zinc-500", error:"text-red-400",
  }[status];

  const statusLabel = {
    running:"RUNNING", injecting:"INJECTING",
    paused:"PAUSED", idle:"IDLE", error:"ERROR",
  }[status];

  return (
    <div className="h-full flex flex-col p-3 gap-2 overflow-y-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${isRunning || isInjecting ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
          <span className={`text-xs font-mono tracking-widest uppercase ${statusColor}`}>{statusLabel}</span>
          {activeAgent && (
            <span className="text-xs font-mono text-zinc-600 truncate ml-auto">
              {activeAgent.replace("The ", "")}...
            </span>
          )}
        </div>
        <h1 className="font-display text-sm font-bold tracking-wider text-white glow-title">SIMULACRA</h1>
        <p className="font-display text-xs text-purple-400/80 tracking-[0.3em] mt-0.5">
          {"// DEAD INTERNET OS v2"}
        </p>
        <div className="mt-2 h-px bg-gradient-to-r from-purple-500/50 via-purple-500/20 to-transparent" />
      </div>

      {/* ── Simulation Controls ─────────────────────────────────────────── */}
      <div className="panel flex-shrink-0 p-3">
        <div className="flex gap-2 mb-3">
          {isRunning || isInjecting ? (
            <button onClick={onPause} disabled={isInjecting}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs font-mono hover:bg-yellow-500/25 transition-all disabled:opacity-50">
              <Pause className="w-3.5 h-3.5" /> PAUSE
            </button>
          ) : (
            <button onClick={onStart}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono hover:bg-emerald-500/25 transition-all">
              <Play className="w-3.5 h-3.5" /> RUN
            </button>
          )}
          <button onClick={onReset} disabled={isInjecting}
            className="px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-700/60 transition-all disabled:opacity-50">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {/* Export buttons */}
          <button onClick={handleExportJSON} title="Export JSON"
            className="px-2.5 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-700/60 hover:text-blue-400 transition-all">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-xs font-mono">⚠ {error}</p>
          </div>
        )}

        {/* Tier 5 Feature Buttons */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={onShowMisinfo}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs font-mono hover:bg-yellow-500/20 transition-all"
            title="Misinformation Spread Graph"
          >
            <GitBranch className="w-3 h-3" />MISINFO GRAPH
          </button>
          <button
            onClick={onShowMultiRoom}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-mono hover:bg-blue-500/20 transition-all"
            title="Multi-Room Simulation"
          >
            <Layers className="w-3 h-3" />MULTI-ROOM
          </button>
        </div>

        {/* Speed Slider */}
        {/* Concept: we map over SPEED_LEVELS keys and render a button for each.
            The active one gets a highlighted style. Clicking calls onSetSpeed.  */}
        <div className="mt-1">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-3 h-3 text-zinc-400" />
            <span className="text-xs text-zinc-400 font-mono tracking-wider uppercase">Simulation Speed</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(Object.keys(SPEED_LEVELS) as SpeedLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => onSetSpeed(lvl)}
                className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-200 border
                  ${speed === lvl
                    ? "bg-purple-500/25 border-purple-500/60 text-purple-300 shadow-sm shadow-purple-500/20"
                    : "bg-zinc-800/40 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                  }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <p className="text-zinc-600 text-xs font-mono mt-1.5">
            {speed === "MAX" ? "⚡ No delay — as fast as Ollama responds" : `${SPEED_LEVELS[speed] / 1000}s between posts`}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-zinc-800/50">
          {[
            { label: "UPTIME",  value: formatUptime(uptime), color: "text-purple-300" },
            { label: "POSTS",   value: `${totalTweets}`,     color: "text-blue-300"   },
            { label: "INJECT",  value: `${injectionCount}`,  color: "text-yellow-300" },
            { label: "REPLIES", value: `${totalReplies}`,    color: "text-emerald-300"},
            { label: "LOAD",    value: `${systemLoad}%`,     color: systemLoad > 70 ? "text-yellow-400" : "text-emerald-400" },
            { label: "NET",     value: isRunning ? "LIVE" : "IDLE", color: isRunning ? "text-emerald-400" : "text-zinc-500" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-zinc-600 text-xs font-mono" style={{ fontSize: "10px" }}>{label}</p>
              <p className={`${color} text-xs font-mono stat-number font-bold`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Radicalization Meter ─────────────────────────────────────────── */}
      <div className="panel flex-shrink-0 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span className="text-xs text-zinc-400 font-mono tracking-wider uppercase">Radicalization</span>
          </div>
          <span className={`text-xs font-mono font-bold ${avgRad > 70 ? "text-red-400" : avgRad > 40 ? "text-orange-400" : "text-emerald-400"}`}>
            {avgRad}% avg
          </span>
        </div>
        <div className="space-y-1.5">
          {AGENTS.map((agent) => {
            const colors = getPersonaColors(agent);
            const score  = radicalization[agent] ?? 0;
            return (
              <div key={agent} className="flex items-center gap-2">
                <span className="text-zinc-600 w-3 text-xs">{AGENT_ICONS[agent]}</span>
                <span className={`${colors.text} font-mono w-16 truncate`} style={{ fontSize: "10px" }}>
                  {agent.replace("The ", "")}
                </span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${score}%`, backgroundColor: colors.hex, boxShadow: `0 0 6px ${colors.hex}80` }} />
                </div>
                <span className="text-zinc-500 font-mono w-6 text-right stat-number" style={{ fontSize: "10px" }}>{score}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Faction Alignment ───────────────────────────────────────────── */}
      <div className="panel flex-shrink-0 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-3 h-3 text-zinc-400" />
          <span className="text-xs text-zinc-400 font-mono tracking-wider uppercase">Faction Alignment</span>
        </div>
        <FactionMap factions={factions} />
      </div>

      {/* ── Agent Roster ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3 h-3 text-zinc-400" />
          <span className="text-xs text-zinc-400 font-mono tracking-wider uppercase">Agent Roster</span>
        </div>
        <div className="space-y-1">
          {AGENTS.map((agent) => {
            const colors   = getPersonaColors(agent);
            const count    = data.filter((d) => d.agent === agent).length;
            const isActive = activeAgent === agent;
            const memCount = agentMemory[agent]?.length ?? 0;
            return (
              <div key={agent}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all duration-300 ${colors.border} ${colors.bg} ${isActive ? "scale-[1.01] brightness-125" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {isActive
                    ? <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: colors.hex }} />
                    : <span className={`${colors.text} text-xs`}>{AGENT_ICONS[agent]}</span>
                  }
                  <span className={`${colors.text} font-mono truncate max-w-[85px]`} style={{ fontSize: "11px" }}>
                    {agent.replace("The ", "")}
                  </span>
                  {isActive && (
                    <span className={`font-mono ${colors.text} opacity-60 animate-pulse`} style={{ fontSize: "10px" }}>typing...</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {memCount > 0 && (
                    <span className="text-zinc-600 font-mono" style={{ fontSize: "10px" }} title={`${memCount} memories`}>
                      🧠{memCount}
                    </span>
                  )}
                  <span className={`${colors.text} font-mono stat-number opacity-70`} style={{ fontSize: "11px" }}>
                    {count}p
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── God Mode / Presets / Memory Tabs ────────────────────────────── */}
      <div className="godmode-focus panel order-first flex-shrink-0 border-purple-500/30 bg-zinc-950/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-purple-500/40 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-purple-500/40 rounded-bl-xl" />

        {/* Tab Bar */}
        <div className="flex border-b border-purple-500/20">
          {([
            { key: "god",     label: "God Mode",  icon: <Zap className="w-3 h-3" /> },
            { key: "presets", label: "Presets",   icon: <Sparkles className="w-3 h-3" /> },
            { key: "memory",  label: "Memory",    icon: <BookOpen className="w-3 h-3" /> },
    { key: "replay",  label: "Replay",    icon: <RotateCcw className="w-3 h-3" /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-mono transition-all
                ${activeTab === key
                  ? "text-purple-300 border-b border-purple-400"
                  : "text-zinc-600 hover:text-zinc-400"
                }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* God Mode Tab */}
        {activeTab === "god" && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3 h-3 text-yellow-500/70" />
              <p className="text-zinc-500 text-xs font-mono">All 7 agents react immediately.</p>
            </div>
            <textarea
              value={injectedThought}
              onChange={(e) => setInjectedThought(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleInject(); }}
              placeholder="Inject a fake headline..."
              rows={2}
              disabled={injecting}
              className="w-full bg-zinc-950/80 border border-zinc-700/70 rounded-lg p-3 text-xs text-zinc-200 font-mono placeholder-zinc-600 resize-none focus:outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
            />
            <button onClick={handleGenerateNews} disabled={generatingNews || injecting}
              className="mt-2 w-full py-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/40 text-zinc-400 text-xs font-mono hover:border-zinc-600 hover:text-zinc-300 transition-all flex items-center justify-center gap-2 disabled:opacity-40">
              {generatingNews
                ? <><span className="w-3 h-3 border border-zinc-500 border-t-zinc-300 rounded-full animate-spin" />GENERATING...</>
                : <><Newspaper className="w-3 h-3" />GENERATE FAKE NEWS</>
              }
            </button>
            <button onClick={handleInject} disabled={injecting || !injectedThought.trim()}
              className={`mt-2 w-full py-2.5 rounded-lg text-xs font-display font-bold tracking-widest uppercase transition-all duration-300
                ${injected ? "bg-emerald-600 text-white"
                : injecting ? "bg-zinc-800 text-zinc-400 cursor-wait"
                : "bg-violet-600 hover:bg-violet-500 text-white hover:shadow-lg hover:shadow-violet-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"}`}>
              {injected
                ? <span className="flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />INJECTED</span>
                : injecting
                ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border border-zinc-500 border-t-zinc-300 rounded-full animate-spin" />AGENTS REACTING...</span>
                : <span className="flex items-center justify-center gap-2"><Zap className="w-3.5 h-3.5" />INJECT THOUGHT</span>
              }
            </button>
            <div className="flex gap-2 mt-2">
              <button onClick={handleExportJSON}
                className="flex-1 py-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/40 text-zinc-400 text-xs font-mono hover:text-blue-400 hover:border-blue-500/30 transition-all flex items-center justify-center gap-1.5">
                <Download className="w-3 h-3" />JSON
              </button>
              <button onClick={handleExportTXT}
                className="flex-1 py-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/40 text-zinc-400 text-xs font-mono hover:text-emerald-400 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-1.5">
                <Download className="w-3 h-3" />TXT
              </button>
            </div>
          </div>
        )}

        {/* Presets Tab */}
        {/* Concept: data-driven UI. Instead of 6 separate buttons hardcoded,
            we map over the PRESETS array. To add a new preset, just add an
            object to the array at the top — no other code changes needed. */}
        {activeTab === "presets" && (
          <div className="p-4">
            <p className="text-zinc-500 text-xs font-mono mb-3">One-click scenario injection. All agents react immediately.</p>
            <div className="space-y-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.thought)}
                  disabled={injecting}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs font-mono transition-all disabled:opacity-40 ${preset.color}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{preset.emoji}</span>
                    <div>
                      <p className="font-bold">{preset.label}</p>
                      <p className="text-zinc-500 mt-0.5 leading-relaxed line-clamp-2" style={{ fontSize: "10px" }}>
                        {preset.thought.slice(0, 80)}...
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Memory Tab */}
        {/* Shows what each agent "remembers" — their last 3 statements */}
        {activeTab === "memory" && (
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            <p className="text-zinc-500 text-xs font-mono mb-2">Last 3 statements per agent — injected into every prompt so they remember what they said.</p>
            {AGENTS.map((agent) => {
              const colors  = getPersonaColors(agent);
              const memories = agentMemory[agent] ?? [];
              if (memories.length === 0) return null;
              return (
                <div key={agent}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs">{AGENT_ICONS[agent]}</span>
                    <span className={`${colors.text} text-xs font-mono font-bold`} style={{ fontSize: "11px" }}>
                      {agent.replace("The ", "")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {memories.map((mem, i) => (
                      <p key={i} className="text-zinc-600 text-xs font-mono leading-relaxed pl-4 border-l border-zinc-800" style={{ fontSize: "10px" }}>
                        &quot;{mem.slice(0, 60)}{mem.length > 60 ? "..." : ""}&quot;
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
            {Object.values(agentMemory).every((m) => m.length === 0) && (
              <p className="text-zinc-600 text-xs font-mono text-center py-4">No memories yet — start the simulation.</p>
            )}
          </div>
        )}

        {/* Replay Tab */}
        {activeTab === "replay" && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-500 text-xs font-mono">Save and replay simulation sessions.</p>
              <button
                onClick={onSaveSession}
                disabled={data.filter(d => d.agent !== "SYSTEM").length === 0}
                className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-mono hover:bg-purple-500/25 transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" />SAVE
              </button>
            </div>
            {isReplaying && (
              <div className="mb-3 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between">
                <span className="text-blue-400 text-xs font-mono animate-pulse">▶ Replaying session...</span>
                <button onClick={onStopReplay} className="text-zinc-400 hover:text-white text-xs font-mono">STOP</button>
              </div>
            )}
            {savedSessions.length === 0 ? (
              <p className="text-zinc-600 text-xs font-mono text-center py-6">No saved sessions yet.<br/>Run the simulation and hit SAVE.</p>
            ) : (
              <div className="space-y-2">
                {[...savedSessions].reverse().map((session) => (
                  <div key={session.id} className="bg-zinc-900/60 border border-zinc-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-zinc-300 text-xs font-mono">
                        {new Date(session.savedAt).toLocaleString()}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onStartReplay(session)}
                          className="text-purple-400 text-xs font-mono hover:text-purple-300 transition-all"
                        >▶ REPLAY</button>
                        <button
                          onClick={() => onDeleteSession(session.id)}
                          className="text-zinc-600 text-xs font-mono hover:text-red-400 transition-all"
                        >✕</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { label:"Posts",     value: session.stats.totalMessages },
                        { label:"Replies",   value: session.stats.totalReplies },
                        { label:"Injections",value: session.stats.injectionCount },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <span className="text-zinc-600 font-mono" style={{fontSize:"10px"}}>{label}: </span>
                          <span className="text-zinc-400 font-mono" style={{fontSize:"10px"}}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── System Log ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-3 h-3 text-zinc-400" />
          <span className="text-xs text-zinc-400 font-mono tracking-wider uppercase">System Log</span>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3 space-y-1.5">
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 text-zinc-600 mt-0.5 flex-shrink-0" />
              <span className={`text-xs font-mono leading-relaxed ${
                i === 0
                  ? log.startsWith("ERR") ? "text-red-400"
                  : log.startsWith("INJ") ? "text-yellow-300"
                  : "text-purple-300"
                  : "text-zinc-600"
              }`}>{log}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 mt-1">
            <ChevronRight className="w-3 h-3 text-purple-500" />
            <span className="w-1.5 h-3 bg-purple-400 cursor-blink ml-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Faction Map component
function FactionMap({ factions }: { factions: FactionMatrix }) {
  const pairs: Array<{ a: string; b: string; score: number }> = [];
  AGENTS.forEach((a, i) => {
    AGENTS.slice(i + 1).forEach((b) => {
      const score = factions[a]?.[b] ?? 0;
      if (score !== 0) pairs.push({ a, b, score });
    });
  });
  pairs.sort((x, y) => Math.abs(y.score) - Math.abs(x.score));
  const top = pairs.slice(0, 5);

  if (top.length === 0) {
    return <p className="text-zinc-600 text-xs font-mono text-center py-2">No factions formed yet...</p>;
  }

  return (
    <div className="space-y-1.5">
      {top.map(({ a, b, score }) => {
        const ca     = getPersonaColors(a);
        const cb     = getPersonaColors(b);
        const isAlly = score > 0;
        return (
          <div key={`${a}-${b}`} className="flex items-center gap-2">
            <span style={{ color: ca.hex, fontSize: "10px", width: 56 }} className="font-mono truncate">
              {a.replace("The ", "")}
            </span>
            <span className={`text-xs font-mono font-bold ${isAlly ? "text-emerald-400" : "text-red-400"}`}>
              {isAlly ? "▲" : "▼"}{Math.abs(score)}
            </span>
            <span style={{ color: cb.hex, fontSize: "10px", width: 56 }} className="font-mono truncate">
              {b.replace("The ", "")}
            </span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.abs(score) * 10}%`,
                  backgroundColor: isAlly ? "#22c55e" : "#ef4444",
                  boxShadow: `0 0 4px ${isAlly ? "#22c55e" : "#ef4444"}80`,
                }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
