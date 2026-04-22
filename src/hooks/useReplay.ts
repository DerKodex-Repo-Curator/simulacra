"use client";

// ─── Concept: localStorage + JSON serialization ───────────────────────────────
// localStorage is a key-value store built into every browser.
// It persists data even after you close the tab — unlike React state.
// Values must be strings, so we use JSON.stringify/parse to convert objects.
//
// Concept: Replay loop
// We store a saved session (array of messages with timestamps).
// To replay, we use a setTimeout loop that adds one message at a time,
// waiting a fixed interval between each — exactly like a real simulation
// but reading from saved data instead of calling the API.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";
import { SimulationEntry } from "@/lib/types";

const STORAGE_KEY = "simulacra_sessions";
const MAX_SESSIONS = 5; // Keep only the last 5 sessions

export interface SavedSession {
  id:        string;
  savedAt:   string;  // ISO date string
  messages:  SimulationEntry[];
  stats: {
    totalMessages:  number;
    totalReplies:   number;
    injectionCount: number;
    duration:       number; // seconds
  };
}

export interface ReplayState {
  savedSessions:  SavedSession[];
  isReplaying:    boolean;
  replayMessages: SimulationEntry[];
  replayIndex:    number;
}

export interface ReplayControls {
  saveSession:   (messages: SimulationEntry[], injectionCount: number, uptimeSeconds: number) => void;
  startReplay:   (session: SavedSession) => void;
  stopReplay:    () => void;
  deleteSession: (id: string) => void;
}

export function useReplay(): [ReplayState, ReplayControls] {
  // Load saved sessions from localStorage on first render
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isReplaying,    setIsReplaying]    = useState(false);
  const [replayMessages, setReplayMessages] = useState<SimulationEntry[]>([]);
  const [replayIndex,    setReplayIndex]    = useState(0);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper: persist sessions array to localStorage
  const persistSessions = useCallback((sessions: SavedSession[]) => {
    setSavedSessions(sessions);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // localStorage can fail if storage is full
      console.warn("Could not save to localStorage");
    }
  }, []);

  const saveSession = useCallback((
    messages:       SimulationEntry[],
    injectionCount: number,
    uptimeSeconds:  number,
  ) => {
    const newSession: SavedSession = {
      id:      `session_${Date.now()}`,
      savedAt: new Date().toISOString(),
      messages,
      stats: {
        totalMessages:  messages.filter((m) => m.agent !== "SYSTEM").length,
        totalReplies:   messages.filter((m) => m.replying_to !== null && m.agent !== "SYSTEM").length,
        injectionCount,
        duration:       uptimeSeconds,
      },
    };

    // Keep only the last MAX_SESSIONS sessions (oldest first, trim from front)
    const updated = [...savedSessions, newSession].slice(-MAX_SESSIONS);
    persistSessions(updated);
  }, [savedSessions, persistSessions]);

  // Replay: add one message every 800ms from the saved session
  const startReplay = useCallback((session: SavedSession) => {
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);

    setIsReplaying(true);
    setReplayMessages([]);
    setReplayIndex(0);

    let index = 0;

    const addNext = () => {
      if (index >= session.messages.length) {
        setIsReplaying(false);
        return;
      }

      const msg = session.messages[index];
      setReplayMessages((prev) => [...prev, msg]);
      setReplayIndex(index);
      index++;

      // Injection messages get a longer pause for dramatic effect
      const delay = msg.agent === "SYSTEM" ? 1500 : 800;
      replayTimerRef.current = setTimeout(addNext, delay);
    };

    replayTimerRef.current = setTimeout(addNext, 300);
  }, []);

  const stopReplay = useCallback(() => {
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    setIsReplaying(false);
    setReplayMessages([]);
    setReplayIndex(0);
  }, []);

  const deleteSession = useCallback((id: string) => {
    const updated = savedSessions.filter((s) => s.id !== id);
    persistSessions(updated);
  }, [savedSessions, persistSessions]);

  return [
    { savedSessions, isReplaying, replayMessages, replayIndex },
    { saveSession, startReplay, stopReplay, deleteSession },
  ];
}