"use client";

// ─── Concept: Multiple independent simulation instances ───────────────────────
// Each "room" is just a separate messages array + running state.
// We store them in a Record<roomId, RoomState>.
//
// Key concept: instead of one global simulation, we have N simulations
// running in parallel. Each calls the same /api/simulate endpoint but
// with its own conversation history and agent rotation index.
//
// This teaches the concept of "lifting state" — instead of one hook
// owning one simulation, we have one hook owning MANY simulations.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { SimulationEntry, AGENTS } from "@/lib/types";

export interface Room {
  id:          string;
  name:        string;
  description: string;
  messages:    SimulationEntry[];
  isRunning:   boolean;
  activeAgent: string | null;
  agents:      readonly string[]; // 👈 Make this readonly
  tickMs:      number;
}

// Preset room configurations
export const ROOM_PRESETS = [
  {
    id:          "doomer_chamber",
    name:        "☠ Doomer Chamber",
    description: "Tech Doomer, Conspiracy Theorist, Doomer Journalist — pure despair",
    agents:      ["The Tech Doomer", "The Conspiracy Theorist", "The Doomer Journalist"],
    tickMs:      4000,
  },
  {
    id:          "crypto_casino",
    name:        "₿ Crypto Casino",
    description: "Crypto Bro vs Skeptical Banker vs AI Accelerationist",
    agents:      ["The Crypto Bro", "The Skeptical Banker", "The AI Accelerationist"],
    tickMs:      4000,
  },
  {
    id:          "full_chaos",
    name:        "🌀 Full Chaos",
    description: "All 7 agents. Maximum radicalization.",
    agents:      AGENTS,
    tickMs:      4500,
  },
  {
    id:          "optimist_vs_world",
    name:        "☀ Optimist vs World",
    description: "The Naive Optimist trying to survive 6 hostile agents",
    agents:      AGENTS,
    tickMs:      3500,
  },
];

export function useMultiRoom() {
  const [rooms,       setRooms]       = useState<Record<string, Room>>({});
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Each room needs its own timer and agent index ref
  const timersRef     = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const agentIndexRef = useRef<Record<string, number>>({});
  const messagesRef   = useRef<Record<string, SimulationEntry[]>>({});

  // Keep messages ref in sync
  useEffect(() => {
    Object.entries(rooms).forEach(([id, room]) => {
      messagesRef.current[id] = room.messages;
    });
  }, [rooms]);

  const callAgent = useCallback(async (
    roomId: string,
    agent:  string,
    agents: readonly string[], // 👈 Update this parameter as well
  ): Promise<SimulationEntry | null> => {
    try {
      const history = messagesRef.current[roomId] ?? [];
      const res = await fetch("/api/simulate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent,
          conversationHistory: history.slice(-10),
          injectedThought:     null,
          agentMemory:         history.filter((m) => m.agent === agent).slice(-3).map((m) => m.content),
        }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const tick = useCallback(async (roomId: string) => {
    const room = rooms[roomId];
    if (!room?.isRunning) return;

    const agents = room.agents;
    if (!agentIndexRef.current[roomId]) agentIndexRef.current[roomId] = 0;

    const agent = agents[agentIndexRef.current[roomId] % agents.length];
    agentIndexRef.current[roomId]++;

    // Update active agent
    setRooms((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], activeAgent: agent },
    }));

    const entry = await callAgent(roomId, agent, agents);

    setRooms((prev) => {
      const current = prev[roomId];
      if (!current) return prev;
      return {
        ...prev,
        [roomId]: {
          ...current,
          activeAgent: null,
          messages: entry ? [...current.messages, entry] : current.messages,
        },
      };
    });

    // Schedule next tick
    const currentRoom = rooms[roomId];
    if (currentRoom?.isRunning) {
      timersRef.current[roomId] = setTimeout(() => tick(roomId), room.tickMs);
    }
  }, [rooms, callAgent]);

  const createRoom = useCallback((preset: typeof ROOM_PRESETS[0]) => {
    const room: Room = {
      id:          preset.id,
      name:        preset.name,
      description: preset.description,
      messages:    [],
      isRunning:   false,
      activeAgent: null,
      agents:      [...preset.agents], // 👈 Spread it here to strip the readonly constraint
      tickMs:      preset.tickMs,
    };
    setRooms((prev) => ({ ...prev, [preset.id]: room }));
    setActiveRoomId(preset.id);
    agentIndexRef.current[preset.id] = 0;
    messagesRef.current[preset.id]   = [];
  }, []);

  const startRoom = useCallback((roomId: string) => {
    setRooms((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], isRunning: true },
    }));
    timersRef.current[roomId] = setTimeout(() => tick(roomId), 500);
  }, [tick]);

  const stopRoom = useCallback((roomId: string) => {
    setRooms((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], isRunning: false },
    }));
    clearTimeout(timersRef.current[roomId]);
  }, []);

  const removeRoom = useCallback((roomId: string) => {
    clearTimeout(timersRef.current[roomId]);
    setRooms((prev) => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
    if (activeRoomId === roomId) {
      const remaining = Object.keys(rooms).filter((id) => id !== roomId);
      setActiveRoomId(remaining[0] ?? null);
    }
  }, [rooms, activeRoomId]);

  const injectToRoom = useCallback(async (roomId: string, thought: string) => {
    const room = rooms[roomId];
    if (!room) return;

    const injectionEntry: SimulationEntry = {
      agent:      "SYSTEM",
      content:    `⚡ GOD MODE INJECTION: "${thought}"`,
      replying_to: null,
    };

    setRooms((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], messages: [...prev[roomId].messages, injectionEntry] },
    }));
    messagesRef.current[roomId] = [...(messagesRef.current[roomId] ?? []), injectionEntry];

    for (const agent of room.agents) {
      const entry = await callAgent(roomId, agent, room.agents);
      if (entry) {
        setRooms((prev) => ({
          ...prev,
          [roomId]: { ...prev[roomId], messages: [...prev[roomId].messages, entry] },
        }));
        messagesRef.current[roomId] = [...(messagesRef.current[roomId] ?? []), entry];
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }, [rooms, callAgent]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return {
    rooms,
    activeRoomId,
    setActiveRoomId,
    createRoom,
    startRoom,
    stopRoom,
    removeRoom,
    injectToRoom,
  };
}
