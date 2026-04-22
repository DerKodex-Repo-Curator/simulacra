"use client";

// ─── Concept: Tree visualization with React Flow ──────────────────────────────
// A misinformation spread graph is a TREE, not a general graph.
// Root node = the injected headline.
// Children = each agent's immediate reaction.
// Grandchildren = replies to those reactions.
//
// We build this tree by:
// 1. Finding all SYSTEM injection messages
// 2. For each injection, finding all messages that came after it
//    before the next injection (its "wave")
// 3. Building parent-child relationships from replying_to fields
// 4. Laying out nodes top-to-bottom using a simple level-based algorithm
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useEffect, useState } from "react";
import ReactFlow, {
  Node, Edge, Background, BackgroundVariant,
  useNodesState, useEdgesState, MarkerType,
  Handle, Position, NodeProps, Controls,
} from "reactflow";
import "reactflow/dist/style.css";
import { X, GitBranch, Zap } from "lucide-react";
import { SimulationEntry, getPersonaColors } from "@/lib/types";

interface Props {
  data:    SimulationEntry[];
  onClose: () => void;
}

interface TreeNode {
  id:       string;
  agent:    string;
  content:  string;
  level:    number;
  parentId: string | null;
  x:        number;
  y:        number;
}

// ── Custom node renderers ─────────────────────────────────────────────────────

function InjectionNode({ data }: NodeProps) {
  return (
    <div className="relative">
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1" />
      <div className="bg-yellow-500/20 border-2 border-yellow-500/60 rounded-xl px-4 py-3 max-w-xs"
        style={{ boxShadow: "0 0 20px rgba(234,179,8,0.3)" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
          <span className="text-yellow-300 text-xs font-display font-bold tracking-wider uppercase">
            INJECTION
          </span>
        </div>
        <p className="text-yellow-100 text-xs font-mono leading-relaxed">
          {data.content}
        </p>
      </div>
    </div>
  );
}

function AgentNode({ data }: NodeProps) {
  const colors = getPersonaColors(data.agent);
  const avatars: Record<string, string> = {
    "The Tech Doomer": "☠", "The Crypto Bro": "₿",
    "The Skeptical Banker": "♖", "The AI Accelerationist": "⚡",
    "The Conspiracy Theorist": "👁", "The Doomer Journalist": "📰",
    "The Naive Optimist": "☀",
  };

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top}    className="!opacity-0 !w-1 !h-1" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-1 !h-1" />

      <div
        className="rounded-xl px-3 py-2.5 max-w-[220px] border transition-all"
        style={{
          backgroundColor: `${colors.hex}12`,
          borderColor:     `${colors.hex}50`,
          boxShadow:       `0 0 12px ${colors.hex}25`,
        }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm">{avatars[data.agent] ?? "◉"}</span>
          <span className="font-mono font-bold text-xs" style={{ color: colors.hex }}>
            {data.agent.replace("The ", "")}
          </span>
          {data.mutationScore > 0 && (
            <span className="ml-auto text-xs font-mono"
              style={{ color: data.mutationScore > 5 ? "#ef4444" : "#eab308", fontSize: "10px" }}>
              ×{data.mutationScore}
            </span>
          )}
        </div>
        <p className="text-zinc-300 leading-relaxed" style={{ fontSize: "10px" }}>
          {data.content.slice(0, 90)}{data.content.length > 90 ? "..." : ""}
        </p>
      </div>
    </div>
  );
}

const nodeTypes = { injection: InjectionNode, agent: AgentNode };

// ── Mutation score: how different is this message from the original? ──────────
// Concept: we count words in the response that were NOT in the original injection.
// High score = agent heavily distorted/mutated the original message.
function computeMutationScore(original: string, response: string): number {
  const origWords = new Set(original.toLowerCase().split(/\s+/));
  const respWords = response.toLowerCase().split(/\s+/);
  const newWords  = respWords.filter((w) => !origWords.has(w) && w.length > 4);
  return Math.min(10, Math.floor(newWords.length / 3));
}

// ── Tree layout algorithm ─────────────────────────────────────────────────────
// Simple level-based layout: nodes at the same depth share horizontal space.
// Each level is 160px below the previous one.
function buildTreeLayout(nodes: TreeNode[]): TreeNode[] {
  // Group by level
  const byLevel: Record<number, TreeNode[]> = {};
  nodes.forEach((n) => {
    if (!byLevel[n.level]) byLevel[n.level] = [];
    byLevel[n.level].push(n);
  });

  // Assign x positions within each level
  const LEVEL_HEIGHT = 160;
  const NODE_WIDTH   = 260;

  Object.entries(byLevel).forEach(([lvl, levelNodes]) => {
    const totalWidth = levelNodes.length * NODE_WIDTH;
    levelNodes.forEach((node, i) => {
      node.x = i * NODE_WIDTH - totalWidth / 2 + NODE_WIDTH / 2;
      node.y = parseInt(lvl) * LEVEL_HEIGHT;
    });
  });

  return nodes;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MisinfoGraph({ data, onClose }: Props) {
  // Find all injections and build a tree for the selected one
  const injections = useMemo(
    () => data.filter((m) => m.agent === "SYSTEM"),
    [data]
  );

  const [selectedInjection, setSelectedInjection] = useState<number>(
    injections.length - 1
  );

  // Update selected to latest injection when new ones arrive
  useEffect(() => {
    if (injections.length > 0) setSelectedInjection(injections.length - 1);
  }, [injections.length]);

  // Build tree from the selected injection's wave
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (injections.length === 0) return { nodes: [], edges: [] };

    const injection = injections[selectedInjection];
    if (!injection) return { nodes: [], edges: [] };

    const injectionIndex = data.indexOf(injection);
    const nextInjectionIndex = data.findIndex(
      (m, i) => i > injectionIndex && m.agent === "SYSTEM"
    );
    const wave = data.slice(
      injectionIndex + 1,
      nextInjectionIndex === -1 ? undefined : nextInjectionIndex
    ).filter((m) => m.agent !== "SYSTEM");

    // Build tree nodes
    const treeNodes: TreeNode[] = [
      {
        id:       "root",
        agent:    "SYSTEM",
        content:  injection.content.replace("⚡ GOD MODE INJECTION: ", "").replace(/^"|"$/g, ""),
        level:    0,
        parentId: null,
        x:        0,
        y:        0,
      },
    ];

    // First wave — direct reactions to the injection (level 1)
    const firstWave = wave.filter((m) => m.replying_to === null || !wave.some((w) => w.agent === m.replying_to));
    firstWave.forEach((msg, i) => {
      treeNodes.push({
        id:       `msg-${data.indexOf(msg)}`,
        agent:    msg.agent,
        content:  msg.content,
        level:    1,
        parentId: "root",
        x:        0,
        y:        0,
      });
    });

    // Subsequent replies — level 2+
    wave.filter((m) => !firstWave.includes(m)).forEach((msg) => {
      const parentMsg = msg.replying_to
        ? wave.find((w) => w.agent === msg.replying_to && wave.indexOf(w) < wave.indexOf(msg))
        : null;
      const parentId = parentMsg ? `msg-${data.indexOf(parentMsg)}` : "root";
      const parentLevel = treeNodes.find((n) => n.id === parentId)?.level ?? 1;

      treeNodes.push({
        id:       `msg-${data.indexOf(msg)}`,
        agent:    msg.agent,
        content:  msg.content,
        level:    parentLevel + 1,
        parentId,
        x:        0,
        y:        0,
      });
    });

    // Apply layout
    const laid = buildTreeLayout(treeNodes);
    const originalContent = injection.content;

    // Convert to React Flow nodes
    const rfNodes: Node[] = laid.map((n) => ({
      id:       n.id,
      type:     n.agent === "SYSTEM" ? "injection" : "agent",
      position: { x: n.x + 400, y: n.y + 40 },
      data: {
        agent:         n.agent,
        content:       n.content,
        mutationScore: n.agent !== "SYSTEM"
          ? computeMutationScore(originalContent, n.content)
          : 0,
      },
    }));

    // Convert to React Flow edges
    const rfEdges: Edge[] = laid
      .filter((n) => n.parentId !== null)
      .map((n) => {
        const colors = n.agent !== "SYSTEM" ? getPersonaColors(n.agent) : { hex: "#eab308" };
        return {
          id:     `e-${n.parentId}-${n.id}`,
          source: n.parentId!,
          target: n.id,
          animated: true,
          style: {
            stroke:      colors.hex,
            strokeWidth: 1.5,
            filter:      `drop-shadow(0 0 4px ${colors.hex}60)`,
          },
          markerEnd: {
            type:   MarkerType.ArrowClosed,
            color:  colors.hex,
            width:  12,
            height: 12,
          },
        };
      });

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, selectedInjection, injections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => { setNodes(flowNodes); }, [flowNodes]);
  useEffect(() => { setEdges(flowEdges); }, [flowEdges]);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-yellow-400" />
          <div>
            <h2 className="font-display font-bold text-white tracking-wider">
              MISINFORMATION SPREAD GRAPH
            </h2>
            <p className="text-zinc-500 text-xs font-mono mt-0.5">
              How one injected headline mutates across the echo chamber
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Injection selector */}
          {injections.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs font-mono">INJECTION:</span>
              <div className="flex gap-1">
                {injections.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedInjection(i)}
                    className={`w-6 h-6 rounded text-xs font-mono font-bold transition-all ${
                      selectedInjection === i
                        ? "bg-yellow-500/30 border border-yellow-500/60 text-yellow-300"
                        : "bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {injections.length > 0 && (
        <div className="flex-shrink-0 px-6 py-2 border-b border-zinc-800/30 flex items-center gap-6">
          <StatBadge label="INJECTION" value={`#${selectedInjection + 1}`} color="text-yellow-400" />
          <StatBadge label="REACTIONS" value={`${nodes.filter(n => n.type === "agent").length}`} color="text-purple-400" />
          <StatBadge label="DEPTH"     value={`${Math.max(0, ...nodes.map(n => {
            const treeNode = n.position.y / 160;
            return Math.round(treeNode);
          }))} levels`} color="text-blue-400" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-yellow-500/30 border border-yellow-500/50" />
            <span className="text-zinc-500 text-xs font-mono">Original</span>
            <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50 ml-3" />
            <span className="text-zinc-500 text-xs font-mono">High mutation ×8+</span>
            <div className="w-3 h-3 rounded-sm bg-zinc-700/50 border border-zinc-600/50 ml-3" />
            <span className="text-zinc-500 text-xs font-mono">Low mutation</span>
          </div>
        </div>
      )}

      {/* React Flow canvas */}
      <div className="flex-1 relative">
        {injections.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Zap className="w-12 h-12 text-yellow-500/30" />
            <p className="text-zinc-500 font-mono text-center">
              No injections yet.<br />
              Use God Mode to inject a headline first.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#3f3f4630"
            />
            <Controls style={{ filter: "invert(0.85) hue-rotate(180deg)" }} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-600 text-xs font-mono">{label}</span>
      <span className={`${color} text-xs font-mono font-bold`}>{value}</span>
    </div>
  );
}