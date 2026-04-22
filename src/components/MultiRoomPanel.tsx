"use client";

import { useState } from "react";
import { Plus, Play, Square, Trash2, X, Layers, Zap } from "lucide-react";
import { getPersonaColors } from "@/lib/types";
import { useMultiRoom, ROOM_PRESETS, Room } from "@/hooks/useMultiRoom";

interface Props {
  onClose: () => void;
}

export default function MultiRoomPanel({ onClose }: Props) {
  const {
    rooms, activeRoomId, setActiveRoomId,
    createRoom, startRoom, stopRoom, removeRoom, injectToRoom,
  } = useMultiRoom();

  const [injection, setInjection] = useState("");
  const roomList = Object.values(rooms);
  const activeRoom = activeRoomId ? rooms[activeRoomId] : null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="font-display font-bold text-white tracking-wider">MULTI-ROOM SIMULATION</h2>
            <p className="text-zinc-500 text-xs font-mono mt-0.5">
              Run parallel echo chambers simultaneously
            </p>
          </div>
        </div>
        <button onClick={onClose}
          className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-white transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex min-h-0">

        {/* Left: Room list + presets */}
        <div className="w-72 flex-shrink-0 border-r border-zinc-800/50 flex flex-col">
          <div className="p-4 border-b border-zinc-800/50">
            <p className="text-zinc-500 text-xs font-mono mb-3 uppercase tracking-wider">Create Room</p>
            <div className="space-y-2">
              {ROOM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => createRoom(preset)}
                  disabled={!!rooms[preset.id]}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-700/30 hover:border-zinc-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <p className="text-zinc-200 text-xs font-mono font-bold">{preset.name}</p>
                  <p className="text-zinc-500 text-xs font-mono mt-0.5 leading-relaxed">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Active rooms list */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-zinc-500 text-xs font-mono mb-3 uppercase tracking-wider">
              Active Rooms ({roomList.length})
            </p>
            {roomList.length === 0 ? (
              <p className="text-zinc-700 text-xs font-mono text-center py-6">
                No rooms yet.<br/>Create one above.
              </p>
            ) : (
              <div className="space-y-2">
                {roomList.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setActiveRoomId(room.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      activeRoomId === room.id
                        ? "border-purple-500/50 bg-purple-500/10"
                        : "border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-zinc-200 text-xs font-mono font-bold">{room.name}</span>
                      <div className="flex items-center gap-1">
                        {room.isRunning
                          ? <button onClick={(e) => { e.stopPropagation(); stopRoom(room.id); }}
                              className="p-1 rounded text-yellow-400 hover:bg-yellow-500/15 transition-all">
                              <Square className="w-3 h-3" />
                            </button>
                          : <button onClick={(e) => { e.stopPropagation(); startRoom(room.id); }}
                              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/15 transition-all">
                              <Play className="w-3 h-3" />
                            </button>
                        }
                        <button onClick={(e) => { e.stopPropagation(); removeRoom(room.id); }}
                          className="p-1 rounded text-zinc-600 hover:text-red-400 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono ${room.isRunning ? "text-emerald-400" : "text-zinc-600"}`}>
                        {room.isRunning ? "● LIVE" : "○ IDLE"}
                      </span>
                      <span className="text-zinc-600 text-xs font-mono">
                        {room.messages.filter(m => m.agent !== "SYSTEM").length} posts
                      </span>
                    </div>
                    {room.activeAgent && (
                      <p className="text-purple-400 text-xs font-mono mt-1 animate-pulse">
                        {room.activeAgent.replace("The ", "")} typing...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Active room feed */}
        <div className="flex-1 flex flex-col min-h-0">
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Layers className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-mono">Select a room to view its feed</p>
              </div>
            </div>
          ) : (
            <>
              {/* Room header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-white text-sm">{activeRoom.name}</h3>
                  <p className="text-zinc-500 text-xs font-mono mt-0.5">
                    {activeRoom.agents.length} agents · {activeRoom.messages.filter(m => m.agent !== "SYSTEM").length} posts
                  </p>
                </div>
                {/* Agent chips */}
                <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                  {activeRoom.agents.map((agent) => {
                    const colors = getPersonaColors(agent);
                    return (
                      <span key={agent} className="px-2 py-0.5 rounded-full text-xs font-mono border"
                        style={{ borderColor: `${colors.hex}40`, color: colors.hex, backgroundColor: `${colors.hex}10`, fontSize: "10px" }}>
                        {agent.replace("The ", "")}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Feed */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {activeRoom.messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-zinc-600 font-mono text-sm">
                      {activeRoom.isRunning ? "Agents initializing..." : "Press ▶ to start the simulation"}
                    </p>
                  </div>
                )}
                {activeRoom.messages.map((msg, i) => {
                  if (msg.agent === "SYSTEM") {
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                        <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                        <p className="text-yellow-300 text-xs font-mono italic">{msg.content}</p>
                      </div>
                    );
                  }
                  const colors = getPersonaColors(msg.agent);
                  return (
                    <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                      {msg.replying_to && (
                        <p className="text-zinc-600 text-xs font-mono italic mb-1.5">
                          → replying to {msg.replying_to}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono font-bold text-sm" style={{ color: colors.hex }}>
                          {msg.agent}
                        </span>
                      </div>
                      <p className="text-zinc-200 text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  );
                })}
              </div>

              {/* God Mode for this room */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-zinc-800/50 flex gap-3">
                <input
                  type="text"
                  value={injection}
                  onChange={(e) => setInjection(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && injection.trim()) {
                      injectToRoom(activeRoom.id, injection);
                      setInjection("");
                    }
                  }}
                  placeholder="Inject a headline into this room..."
                  className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500/60 transition-all"
                />
                <button
                  onClick={() => { if (injection.trim()) { injectToRoom(activeRoom.id, injection); setInjection(""); }}}
                  disabled={!injection.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" /> INJECT
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
