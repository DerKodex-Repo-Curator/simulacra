"use client";

import { useMemo, useEffect } from "react";
import ReactFlow, {
  Node, Edge, Background, BackgroundVariant,
  useNodesState, useEdgesState, MarkerType,
  Handle, Position, NodeProps, Controls, MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";
import { GitFork } from "lucide-react";
import { SimulationEntry, getPersonaColors, AGENTS } from "@/lib/types";

interface Props {
  data: SimulationEntry[];
  activeAgent: string | null;
  onAgentClick: (agent: string) => void;
}

// Circular layout for N agents
function circularLayout(agents: readonly string[], cx = 200, cy = 220, r = 160) {
  const positions: Record<string, { x: number; y: number }> = {};
  agents.forEach((agent, i) => {
    const angle = (i / agents.length) * 2 * Math.PI - Math.PI / 2;
    positions[agent] = {
      x: cx + r * Math.cos(angle) - 32,
      y: cy + r * Math.sin(angle) - 32,
    };
  });
  return positions;
}

const LAYOUT = circularLayout(AGENTS);

function AgentNode({ data }: NodeProps) {
  const colors   = getPersonaColors(data.label);
  const avatars: Record<string, string> = {
    "The Tech Doomer": "☠", "The Crypto Bro": "₿",
    "The Skeptical Banker": "♖", "The AI Accelerationist": "⚡",
    "The Conspiracy Theorist": "👁", "The Doomer Journalist": "📰",
    "The Naive Optimist": "☀",
  };
  const avatar   = avatars[data.label] ?? "◉";
  const isActive = data.isActive;

  return (
    <div className="relative flex flex-col items-center" style={{ cursor:"pointer" }}>
      <Handle type="target" position={Position.Top}    className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1" />
      <Handle type="target" position={Position.Left}   className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Right}  className="!opacity-0 !w-1 !h-1" />

      {isActive && (
        <div className="absolute rounded-full animate-ping" style={{
          width:68, height:68, backgroundColor:`${colors.hex}30`, top:-2, left:-2,
        }} />
      )}

      <div className="absolute inset-0 rounded-full blur-md"
        style={{ backgroundColor:colors.hex, opacity:isActive?0.45:0.2, transform:"scale(1.5)" }} />

      <div className="relative w-14 h-14 rounded-full flex items-center justify-center border-2 text-xl transition-all duration-300"
        style={{
          backgroundColor:`${colors.hex}${isActive?"30":"18"}`,
          borderColor:colors.hex,
          boxShadow:`0 0 ${isActive?"28px":"14px"} ${colors.hex}${isActive?"70":"40"}, 0 0 50px ${colors.hex}20`,
          fontSize: "1.25rem",
        }}>
        {avatar}
      </div>

      <div className="mt-1.5 px-2 py-0.5 rounded text-center whitespace-nowrap"
        style={{
          color:colors.hex,
          textShadow:`0 0 8px ${colors.hex}80`,
          backgroundColor:`${colors.hex}15`,
          border:`1px solid ${colors.hex}30`,
          fontSize:"9px",
          fontFamily:"monospace",
          maxWidth:"90px",
        }}>
        {data.label.replace("The ", "")}
      </div>

      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-bold"
        style={{ backgroundColor:colors.hex, color:"#09090b", fontSize:"9px", fontFamily:"monospace" }}>
        {data.postCount}
      </div>

      {isActive && (
        <div className="flex gap-0.5 mt-1">
          {[0,1,2].map((j) => (
            <div key={j} className="w-1 h-1 rounded-full animate-bounce"
              style={{ backgroundColor:colors.hex, animationDelay:`${j*150}ms` }} />
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

export default function NodeGraph({ data, activeAgent, onAgentClick }: Props) {
  const uniqueAgents = useMemo(
    () => AGENTS.filter((a) => data.some((d) => d.agent === a)),
    [data]
  );

  const edgeMap = useMemo(() => {
    const map = new Map<string, { source: string; target: string; count: number }>();
    data.forEach((entry) => {
      if (
        entry.replying_to &&
        entry.agent !== "SYSTEM" &&
        (AGENTS as readonly string[]).includes(entry.replying_to)
      ) {
        const key = `${entry.agent}__${entry.replying_to}`;
        if (map.has(key)) map.get(key)!.count++;
        else map.set(key, { source:entry.agent, target:entry.replying_to, count:1 });
      }
    });
    return map;
  }, [data]);

  const postCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.filter((d) => d.agent !== "SYSTEM").forEach((d) => { counts[d.agent] = (counts[d.agent] ?? 0) + 1; });
    return counts;
  }, [data]);

  const buildNodes = (): Node[] =>
    uniqueAgents.map((agent) => ({
      id: agent,
      type: "agent",
      position: LAYOUT[agent] ?? { x:200, y:200 },
      data: { label:agent, postCount:postCounts[agent]??0, isActive:activeAgent===agent },
      draggable: true,
    }));

  const buildEdges = (): Edge[] => {
    const edges: Edge[] = [];
    edgeMap.forEach(({ source, target, count }, key) => {
      const sc = getPersonaColors(source);
      edges.push({
        id: key, source, target, animated: true, type: "default",
        style: { stroke:sc.hex, strokeWidth:Math.min(1+count*0.5, 3.5), filter:`drop-shadow(0 0 5px ${sc.hex}90)` },
        markerEnd: { type:MarkerType.ArrowClosed, color:sc.hex, width:16, height:16 },
        label: count>1 ? `×${count}` : undefined,
        labelStyle: { fill:sc.hex, fontSize:8, fontFamily:"monospace" },
        labelBgStyle: { fill:"#09090b", fillOpacity:0.85 },
      });
    });
    return edges;
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges());

  useEffect(() => {
    setNodes(buildNodes());
    // buildNodes closes over latest data/activeAgent/postCounts/uniqueAgents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeAgent, postCounts, uniqueAgents]);

  useEffect(() => {
    setEdges(buildEdges());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeMap]);

  const replyCount = data.filter((d) => d.replying_to && d.agent !== "SYSTEM").length;

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.data?.label) onAgentClick(node.data.label);
  };

  return (
    <section className="panel h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-zinc-800/70 bg-black/20">
        <div className="flex items-center gap-2">
          <GitFork className="w-4 h-4 text-purple-400" />
          <h2 className="font-display text-sm font-bold text-white tracking-[0.2em] uppercase">Node Graph</h2>
        </div>
        <p className="text-zinc-500 text-xs font-mono mt-0.5">
          {uniqueAgents.length} agents · {edgeMap.size} edges · {replyCount} interactions
        </p>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {uniqueAgents.map((agent) => {
            const colors = getPersonaColors(agent);
            return (
              <div key={agent} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor:colors.hex, boxShadow:`0 0 4px ${colors.hex}` }} />
                <span className="text-xs font-mono" style={{ color:colors.hex, fontSize:"10px" }}>
                  {agent.replace("The ","")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding:0.35 }}
          minZoom={0.3} maxZoom={2.5}
          proOptions={{ hideAttribution:true }}
          className="bg-transparent"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#3f3f4640" />
          <Controls style={{ filter:"invert(0.85) hue-rotate(180deg)" }} />
          <MiniMap
            nodeColor={(node) => getPersonaColors(node.data?.label??"").hex}
            maskColor="rgba(9,9,11,0.88)"
            style={{ backgroundColor:"#18181b", border:"1px solid #3f3f46", borderRadius:"8px" }}
          />
        </ReactFlow>

        {edgeMap.size > 0 && (
          <div className="absolute bottom-4 left-4 bg-zinc-900/85 backdrop-blur-sm border border-zinc-700/50 rounded-lg p-3 text-xs font-mono space-y-1 pointer-events-none max-w-[190px]">
            <div className="text-zinc-500 uppercase tracking-wider mb-1.5" style={{ fontSize:"9px" }}>Interaction Matrix</div>
            {Array.from(edgeMap.values()).slice(0, 6).map(({ source, target, count }) => {
              const colors = getPersonaColors(source);
              return (
                <div key={`${source}-${target}`} className="flex items-center gap-1.5">
                  <span style={{ color:colors.hex, fontSize:"10px" }}>{source.replace("The","").trim().slice(0,7)}</span>
                  <span className="text-zinc-600">→</span>
                  <span className="text-zinc-400" style={{ fontSize:"10px" }}>{target.replace("The","").trim().slice(0,7)}</span>
                  <span className="ml-auto" style={{ color:colors.hex, opacity:0.7, fontSize:"10px" }}>×{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {uniqueAgents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-zinc-600 text-xs font-mono">Waiting for agents to appear...</p>
          </div>
        )}
      </div>
    </section>
  );
}