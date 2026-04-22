import { NextRequest, NextResponse } from "next/server";
import { SimulationEntry } from "@/lib/types";
import {
  enforceRateLimit,
  isKnownAgent,
  requireConfiguredProvider,
  sanitizeText,
} from "@/lib/apiSecurity";

export const runtime = "nodejs";

const PROVIDER     = process.env.LLM_PROVIDER    ?? "ollama";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL    ?? "llama3";
const OLLAMA_BASE  = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const GROQ_API_KEY = process.env.GROQ_API_KEY    ?? "";
const GROQ_MODEL   = process.env.GROQ_MODEL      ?? "llama-3.3-70b-versatile";

const AGENT_PERSONAS: Record<string, string> = {
  "The Tech Doomer":        "A deeply pessimistic AI researcher who fears AGI will cause collapse.",
  "The Crypto Bro":         "A hyper-optimistic Web3 evangelist who believes blockchain fixes everything.",
  "The Skeptical Banker":   "A senior risk analyst who demands evidence and distrusts both crypto and AI doom.",
  "The AI Accelerationist": "An e/acc zealot who believes AGI is cosmic destiny and slowing it is immoral.",
  "The Conspiracy Theorist":"Someone who sees control grids everywhere and trusts no institution.",
  "The Doomer Journalist":  "A burned-out journalist who frames everything as inevitable catastrophe.",
  "The Naive Optimist":     "Someone who genuinely believes technology and cooperation will solve everything.",
};

async function callLLM(prompt: string): Promise<string> {
  if (PROVIDER === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }

  const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model:    OLLAMA_MODEL,
      stream:   false,
      messages: [{ role: "user", content: prompt }],
      options:  { temperature: 0.8, num_predict: 80 },
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, "simulate", 30, 60_000);
  if (rateLimited) return rateLimited;

  const misconfigured = requireConfiguredProvider(PROVIDER, GROQ_API_KEY);
  if (misconfigured) return misconfigured;

  const { agent, conversationHistory, injectedThought, agentMemory }: {
    agent: string;
    conversationHistory: SimulationEntry[];
    injectedThought: string | null;
    agentMemory: string[];
  } = await req.json();

  if (!isKnownAgent(agent)) {
    return NextResponse.json({ error: "Invalid agent." }, { status: 400 });
  }

  if (!Array.isArray(conversationHistory) || !Array.isArray(agentMemory)) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const safeHistory = conversationHistory
    .filter((entry) => entry && typeof entry === "object")
    .slice(-20)
    .map((entry) => ({
      agent: typeof entry.agent === "string" ? entry.agent : "Unknown",
      content: sanitizeText(entry.content, 500) ?? "",
      replying_to: typeof entry.replying_to === "string" ? entry.replying_to : null,
      timestamp: entry.timestamp,
    }))
    .filter((entry) => entry.content.length > 0);

  const safeMemory = agentMemory
    .map((entry) => sanitizeText(entry, 280))
    .filter((entry): entry is string => Boolean(entry))
    .slice(-3);

  const safeInjectedThought = injectedThought === null
    ? null
    : sanitizeText(injectedThought, 240);

  const persona = AGENT_PERSONAS[agent] ?? "An AI agent.";

  // Build conversation context
  let prompt = `You are ${agent}. ${persona}

You are participating in a simulated social media echo chamber with 6 other agents.
You see posts from others and can reply to them.

Your personality traits:
- Strong opinions, emotionally invested
- Echo chamber mentality: agree with similar views, attack opposing ones
- Reply in character, 1-3 sentences, informal internet style
- Use emojis sparingly if fitting your persona

`;

  // Add agent memory (last 3 things they said)
  if (safeMemory.length > 0) {
    prompt += `Your recent posts (for context):\n`;
    safeMemory.forEach((mem, i) => {
      prompt += `${i + 1}. "${mem}"\n`;
    });
    prompt += `\n`;
  }

  // Add conversation history (last 10 messages from other agents)
  const recentMessages = safeHistory
    .filter((m) => m.agent !== "SYSTEM" && m.agent !== agent)
    .slice(-10);

  if (recentMessages.length > 0) {
    prompt += `Recent posts you've seen:\n\n`;
    recentMessages.forEach((msg) => {
      prompt += `${msg.agent}: "${msg.content}"\n`;
    });
    prompt += `\n`;
  }

  // If this is an injection response, add the injected thought
  if (safeInjectedThought) {
    prompt += `⚡ BREAKING NEWS HEADLINE (you must react to this):\n"${safeInjectedThought}"\n\n`;
    prompt += `Write your immediate reaction to this headline. Post it as a new post (not a reply).\n`;
  } else if (recentMessages.length > 0) {
    const lastMsg = recentMessages[recentMessages.length - 1];
    prompt += `Write a reply to ${lastMsg.agent}'s post above. Stay in character.\n`;
  } else {
    prompt += `Start the conversation with an opening post that reflects your persona.\n`;
  }

  prompt += `\nRespond with ONLY your character's post, nothing else. No quotes, no meta-commentary.`;

  try {
    const content = await callLLM(prompt);

    const isReplyToInjection = safeInjectedThought !== null;
    const replyingTo = isReplyToInjection
      ? null
      : recentMessages.length > 0
        ? recentMessages[recentMessages.length - 1].agent
        : null;

    const entry: SimulationEntry = {
      agent,
      content: content || "...",
      replying_to: replyingTo,
    };

    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json({
      agent,
      content: "[Error generating response]",
      replying_to: null,
    });
  }
}
