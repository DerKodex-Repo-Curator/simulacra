export interface SimulationEntry {
  agent: string;
  timestamp?: string;
  content: string;
  replying_to: string | null;
}

export const AGENTS = [
  "The Tech Doomer",
  "The Crypto Bro",
  "The Skeptical Banker",
  "The AI Accelerationist",
  "The Conspiracy Theorist",
  "The Doomer Journalist",
  "The Naive Optimist",
] as const;

export type SimulationAgentName = (typeof AGENTS)[number];

export type AgentPersona = SimulationAgentName | "SYSTEM" | "Unknown";

export const PERSONA_COLORS: Record<
  string,
  {
    text: string;
    border: string;
    glow: string;
    bg: string;
    hex: string;
  }
> = {
  SYSTEM: {
    text: "text-yellow-400",
    border: "border-yellow-500/40",
    glow: "shadow-yellow-500/20",
    bg: "bg-yellow-500/10",
    hex: "#eab308",
  },
  "The Tech Doomer": {
    text: "text-red-400",
    border: "border-red-500/40",
    glow: "shadow-red-500/20",
    bg: "bg-red-500/10",
    hex: "#ef4444",
  },
  "The Crypto Bro": {
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    glow: "shadow-emerald-500/20",
    bg: "bg-emerald-500/10",
    hex: "#22c55e",
  },
  "The Skeptical Banker": {
    text: "text-blue-400",
    border: "border-blue-500/40",
    glow: "shadow-blue-500/20",
    bg: "bg-blue-500/10",
    hex: "#3b82f6",
  },
  "The AI Accelerationist": {
    text: "text-orange-400",
    border: "border-orange-500/40",
    glow: "shadow-orange-500/20",
    bg: "bg-orange-500/10",
    hex: "#f97316",
  },
  "The Conspiracy Theorist": {
    text: "text-yellow-400",
    border: "border-yellow-500/40",
    glow: "shadow-yellow-500/20",
    bg: "bg-yellow-500/10",
    hex: "#eab308",
  },
  "The Doomer Journalist": {
    text: "text-rose-400",
    border: "border-rose-500/40",
    glow: "shadow-rose-500/20",
    bg: "bg-rose-500/10",
    hex: "#f43f5e",
  },
  "The Naive Optimist": {
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    glow: "shadow-cyan-500/20",
    bg: "bg-cyan-500/10",
    hex: "#06b6d4",
  },
};

export function getPersonaColors(agent: string) {
  return (
    PERSONA_COLORS[agent] ?? {
      text: "text-purple-400",
      border: "border-purple-500/40",
      glow: "shadow-purple-500/20",
      bg: "bg-purple-500/10",
      hex: "#a855f7",
    }
  );
}

export type FactionMatrix = Record<string, Record<string, number>>;

export function initFactionMatrix(): FactionMatrix {
  const matrix: FactionMatrix = {};
  AGENTS.forEach((a) => {
    matrix[a] = {};
    AGENTS.forEach((b) => {
      if (a !== b) matrix[a][b] = 0;
    });
  });
  return matrix;
}

export function computeRadicalization(messages: SimulationEntry[], agent: string): number {
  const agentMsgs = messages.filter((m) => m.agent === agent);
  if (agentMsgs.length === 0) return 0;

  let score = 0;
  const extremeWords = [
    "never",
    "always",
    "destroy",
    "collapse",
    "fraud",
    "lie",
    "impossible",
    "catastrophic",
    "criminal",
    "insane",
    "idiots",
    "sheep",
    "wake up",
    "controlled",
    "manipulation",
    "they know",
    "ngmi",
    "apocalypse",
    "inevitable",
    "doomed",
    "corrupt",
    "illusion",
    "trap",
    "scam",
    "end",
  ];

  agentMsgs.forEach((msg) => {
    const text = msg.content;
    score += (text.match(/\b[A-Z]{3,}\b/g) ?? []).length * 4;
    score += (text.match(/!/g) ?? []).length * 3;
    score += (text.match(/\?{2,}/g) ?? []).length * 2;
    extremeWords.forEach((w) => {
      if (text.toLowerCase().includes(w)) score += 4;
    });
  });

  return Math.min(100, Math.floor((score / Math.max(agentMsgs.length, 1)) * 2.5));
}

export function detectAlignment(content: string): number {
  const agreeWords = [
    "exactly",
    "agree",
    "right",
    "correct",
    "based",
    "true",
    "yes",
    "precisely",
    "absolutely",
    "same",
    "confirmed",
  ];
  const disagreeWords = [
    "wrong",
    "no",
    "false",
    "incorrect",
    "disagree",
    "nonsense",
    "ridiculous",
    "idiotic",
    "cope",
    "ngmi",
    "delusional",
    "stupid",
    "naive",
  ];
  const lower = content.toLowerCase();
  let s = 0;
  agreeWords.forEach((w) => {
    if (lower.includes(w)) s += 1;
  });
  disagreeWords.forEach((w) => {
    if (lower.includes(w)) s -= 1;
  });
  return Math.max(-3, Math.min(3, s));
}
