import { NextRequest, NextResponse } from "next/server";
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

export interface VoteRequest {
  voter:   string;
  author:  string;
  content: string;
}

async function callLLM(prompt: string): Promise<string> {
  if (PROVIDER === "groq") {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "downvote";
  }

  const res = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model:    OLLAMA_MODEL,
      stream:   false,
      messages: [{ role: "user", content: prompt }],
      options:  { temperature: 0.7, num_predict: 60 },
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "downvote";
}

export async function POST(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, "vote", 60, 60_000);
  if (rateLimited) return rateLimited;

  const misconfigured = requireConfiguredProvider(PROVIDER, GROQ_API_KEY);
  if (misconfigured) return misconfigured;

  const { voter, author, content }: VoteRequest = await req.json();

  if (!isKnownAgent(voter) || !isKnownAgent(author)) {
    return NextResponse.json({ error: "Invalid agent." }, { status: 400 });
  }

  const safeContent = sanitizeText(content, 500);
  if (!safeContent) {
    return NextResponse.json({ error: "Invalid post content." }, { status: 400 });
  }

  const voterPersona  = AGENT_PERSONAS[voter]  ?? "An AI agent.";
  const authorPersona = AGENT_PERSONAS[author] ?? "An AI agent.";

  const prompt = `You are: ${voterPersona}

Another agent (${author}, who is: ${authorPersona}) just posted:
"${safeContent}"

Do you upvote or downvote this post?
Respond with ONLY this JSON, nothing else:
{"vote": "upvote", "reaction": "one short in-character reaction under 8 words"}
or
{"vote": "downvote", "reaction": "one short in-character reaction under 8 words"}`;

  try {
    const raw     = await callLLM(prompt);
    let vote:     "upvote" | "downvote" = "downvote";
    let reaction: string                 = "...";

    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed  = JSON.parse(cleaned);
      vote     = parsed.vote === "upvote" ? "upvote" : "downvote";
      reaction = parsed.reaction ?? "...";
    } catch {
      vote = raw.toLowerCase().includes("upvote") ? "upvote" : "downvote";
    }

    return NextResponse.json({ voter, author, vote, reaction });
  } catch {
    return NextResponse.json({ voter, author, vote: "downvote", reaction: "..." });
  }
}
