"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  SimulationEntry,
  FactionMatrix,
  initFactionMatrix,
  detectAlignment,
  computeRadicalization,
  AGENTS,
} from "@/lib/types";

// Speed levels in milliseconds between each agent tick
// Lower = faster. MAX is as fast as Ollama can respond.
export const SPEED_LEVELS = {
  "1x":  4500,
  "2x":  2500,
  "5x":  1200,
  "MAX": 100,
} as const;

export type SpeedLevel = keyof typeof SPEED_LEVELS;
export type SimulationStatus = "idle" | "running" | "injecting" | "paused" | "error";

export interface SimulationState {
  messages:       SimulationEntry[];
  status:         SimulationStatus;
  error:          string | null;
  activeAgent:    string | null;
  injectionCount: number;
  factions:       FactionMatrix;
  radicalization: Record<string, number>;
  speed:          SpeedLevel;
  // Agent memory: last 3 key facts each agent said
  agentMemory:    Record<string, string[]>;
}

export interface SimulationControls {
  start:    () => void;
  pause:    () => void;
  reset:    () => void;
  inject:   (thought: string) => Promise<void>;
  setSpeed: (speed: SpeedLevel) => void;
}

export function useSimulation(): [SimulationState, SimulationControls] {
  const [messages,        setMessages]        = useState<SimulationEntry[]>([]);
  const [status,          setStatus]          = useState<SimulationStatus>("idle");
  const [error,           setError]           = useState<string | null>(null);
  const [activeAgent,     setActiveAgent]     = useState<string | null>(null);
  const [injectionCount,  setInjectionCount]  = useState(0);
  const [factions,        setFactions]        = useState<FactionMatrix>(initFactionMatrix());
  const [radicalization,  setRadicalization]  = useState<Record<string, number>>({});
  const [speed,           setSpeedState]      = useState<SpeedLevel>("1x");
  const [agentMemory,     setAgentMemory]     = useState<Record<string, string[]>>({});

  // --- Refs ---
  // useRef stores values that persist across renders but DON'T cause re-renders
  // The tick loop reads these refs directly so it always gets the latest value
  // even though the closure was created once at mount time.
  const isRunningRef  = useRef(false);
  const agentIndexRef = useRef(0);
  const messagesRef   = useRef<SimulationEntry[]>([]);
  const tickTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // KEY LEARNING: speedRef is what makes the speed slider work.
  // The tick function reads speedRef.current, not the speed state directly.
  // If it read state directly, the closure would be stale (always 4500ms).
  const speedRef      = useRef<SpeedLevel>("1x");

  // Keep refs in sync with state on every render
  useEffect(() => {
    messagesRef.current = messages;

    // Recompute radicalization scores whenever messages change
    const scores: Record<string, number> = {};
    AGENTS.forEach((a) => { scores[a] = computeRadicalization(messages, a); });
    setRadicalization(scores);

    // Update agent memory: keep the last 3 messages per agent as "memory"
    const memory: Record<string, string[]> = {};
    AGENTS.forEach((agent) => {
      const agentMsgs = messages
        .filter((m) => m.agent === agent)
        .slice(-3) // last 3 messages
        .map((m) => m.content);
      if (agentMsgs.length > 0) memory[agent] = agentMsgs;
    });
    setAgentMemory(memory);
  }, [messages]);

  const updateFactions = useCallback((entry: SimulationEntry) => {
    if (!entry.replying_to || entry.agent === "SYSTEM") return;
    const alignment = detectAlignment(entry.content);
    if (alignment === 0) return;
    setFactions((prev) => {
      const next    = { ...prev };
      const source  = entry.agent;
      const target  = entry.replying_to!;
      if (!next[source]) next[source] = {};
      if (!next[target]) next[target] = {};
      const current  = next[source][target] ?? 0;
      const newScore = Math.max(-10, Math.min(10, current + alignment));
      next[source]   = { ...next[source], [target]: newScore };
      next[target]   = { ...next[target], [source]: newScore };
      return next;
    });
  }, []);

  const callAgent = useCallback(
    async (agent: string, injectedThought: string | null = null): Promise<SimulationEntry | null> => {
      try {
        setActiveAgent(agent);

        // Pass agent memory to the API so it can inject it into the prompt
        const currentMemory = messagesRef.current
          .filter((m) => m.agent === agent)
          .slice(-3)
          .map((m) => m.content);

        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent,
            conversationHistory: messagesRef.current,
            injectedThought,
            agentMemory: currentMemory, // NEW: send memory to API
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const entry: SimulationEntry = await res.json();
        console.log("API response:", entry);
        return entry;
      } catch (err) {
        setError(String(err));
        setStatus("error");
        return null;
      } finally {
        setActiveAgent(null);
      }
    },
    []
  );

  // The tick function is the heart of the simulation loop.
  // It calls one agent, waits for the response, schedules itself again.
  // KEY LEARNING: it reads speedRef.current (not state) so it always
  // uses the latest speed without needing to be recreated.
  const tick = useCallback(async () => {
    if (!isRunningRef.current) return;

    const agent = AGENTS[agentIndexRef.current % AGENTS.length];
    agentIndexRef.current++;

    const entry = await callAgent(agent, null);
    if (entry) {
      setMessages((prev) => [...prev, entry]);
      updateFactions(entry);
    }

    if (isRunningRef.current) {
      const interval = SPEED_LEVELS[speedRef.current];
      tickTimerRef.current = setTimeout(tick, interval);
    }
  }, [callAgent, updateFactions]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setStatus("running");
    setError(null);
    tickTimerRef.current = setTimeout(tick, 500);
  }, [tick]);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    setStatus("paused");
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
  }, []);

  const reset = useCallback(() => {
    isRunningRef.current = false;
    setStatus("idle");
    setMessages([]);
    setError(null);
    setActiveAgent(null);
    setFactions(initFactionMatrix());
    setRadicalization({});
    setAgentMemory({});
    agentIndexRef.current = 0;
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
  }, []);

  // setSpeed updates BOTH the state (for the UI) and the ref (for the tick loop)
  const setSpeed = useCallback((newSpeed: SpeedLevel) => {
    speedRef.current = newSpeed;   // tick loop reads this
    setSpeedState(newSpeed);       // UI reads this
  }, []);

  const inject = useCallback(
    async (thought: string) => {
      if (!thought.trim()) return;

      const wasRunning = isRunningRef.current;
      if (wasRunning) {
        isRunningRef.current = false;
        if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      }

      setStatus("injecting");
      setInjectionCount((c) => c + 1);

      const injectionEntry: SimulationEntry = {
        agent: "SYSTEM",
        content: `⚡ GOD MODE INJECTION: "${thought}"`,
        replying_to: null,
      };
      setMessages((prev) => [...prev, injectionEntry]);
      messagesRef.current = [...messagesRef.current, injectionEntry];

      for (const agent of AGENTS) {
        const entry = await callAgent(agent, thought);
        if (entry) {
          setMessages((prev) => [...prev, entry]);
          messagesRef.current = [...messagesRef.current, entry];
          updateFactions(entry);
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      if (wasRunning) {
        isRunningRef.current = true;
        setStatus("running");
        tickTimerRef.current = setTimeout(tick, SPEED_LEVELS[speedRef.current]);
      } else {
        setStatus("idle");
      }
    },
    [callAgent, tick, updateFactions]
  );

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
    };
  }, []);

  return [
    { messages, status, error, activeAgent, injectionCount, factions, radicalization, speed, agentMemory },
    { start, pause, reset, inject, setSpeed },
  ];
}