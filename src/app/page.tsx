"use client";

import { useEffect, useState } from "react";
import ControlPanel  from "@/components/ControlPanel";
import Feed          from "@/components/Feed";
import NodeGraph     from "@/components/NodeGraph";
import CinemaMode    from "@/components/CinemaMode";
import NewsTicker    from "@/components/NewsTicker";
import AgentProfile    from "@/components/AgentProfile";
import MisinfoGraph    from "@/components/MisinfoGraph";
import MultiRoomPanel  from "@/components/MultiRoomPanel";
import { useSimulation } from "@/hooks/useSimulation";
import { useReplay     } from "@/hooks/useReplay";
import { useToxicity   } from "@/hooks/useToxicity";

export default function Home() {
  const [state, controls]           = useSimulation();
  const [replayState, replayCtrls]  = useReplay();
  const [cinemaMode,  setCinemaMode] = useState(false);
  const [selectedAgent,  setSelectedAgent]  = useState<string | null>(null);
  const [showMisinfo,    setShowMisinfo]    = useState(false);
  const [showMultiRoom,  setShowMultiRoom]  = useState(false);
  const toxicity = useToxicity(state.messages);

  useEffect(() => {
    controls.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayData = replayState.isReplaying
    ? replayState.replayMessages
    : state.messages;

  return (
    <>
      {/* Cinema Mode */}
      {cinemaMode && (
        <CinemaMode
          data={displayData}
          activeAgent={state.activeAgent}
          toxicity={toxicity}
          onClose={() => setCinemaMode(false)}
        />
      )}

      {/* Misinfo Graph */}
      {showMisinfo && (
        <MisinfoGraph
          data={state.messages}
          onClose={() => setShowMisinfo(false)}
        />
      )}

      {/* Multi-Room Panel */}
      {showMultiRoom && (
        <MultiRoomPanel onClose={() => setShowMultiRoom(false)} />
      )}

      {/* Agent Profile Side Panel */}
      <AgentProfile
        agent={selectedAgent}
        data={displayData}
        onClose={() => setSelectedAgent(null)}
      />

      {/* Main Dashboard */}
      <main className="terminal-shell relative h-screen w-screen overflow-hidden scanlines flex flex-col">

        {/* Breaking News Ticker — sits at the very top */}
        <NewsTicker data={displayData} injectionCount={state.injectionCount} />

        {/* 12-column grid — fills remaining height below ticker */}
        <div className="relative z-10 grid grid-cols-12 flex-1 min-h-0 gap-3 p-3">
          <div className="col-span-3 col-separator h-full overflow-hidden pr-3">
            <ControlPanel
              data={state.messages}
              status={state.status}
              activeAgent={state.activeAgent}
              injectionCount={state.injectionCount}
              error={state.error}
              factions={state.factions}
              radicalization={state.radicalization}
              speed={state.speed}
              agentMemory={state.agentMemory}
              savedSessions={replayState.savedSessions}
              isReplaying={replayState.isReplaying}
              onStart={controls.start}
              onPause={controls.pause}
              onReset={controls.reset}
              onInject={controls.inject}
              onSetSpeed={controls.setSpeed}
              onSaveSession={() =>
                replayCtrls.saveSession(state.messages, state.injectionCount, 0)
              }
              onStartReplay={replayCtrls.startReplay}
              onStopReplay={replayCtrls.stopReplay}
              onDeleteSession={replayCtrls.deleteSession}
              onShowMisinfo={() => setShowMisinfo(true)}
              onShowMultiRoom={() => setShowMultiRoom(true)}
            />
          </div>

          <div className="col-span-6 col-separator h-full overflow-hidden pr-3">
            <Feed
              data={displayData}
              activeAgent={replayState.isReplaying ? null : state.activeAgent}
              status={replayState.isReplaying ? "paused" : state.status}
              onCinemaMode={() => setCinemaMode(true)}
            />
          </div>

          <div className="col-span-3 h-full overflow-hidden">
            <NodeGraph
              data={displayData}
              activeAgent={replayState.isReplaying ? null : state.activeAgent}
              onAgentClick={(agent) => setSelectedAgent(
                selectedAgent === agent ? null : agent
              )}
            />
          </div>

        </div>
      </main>
    </>
  );
}
