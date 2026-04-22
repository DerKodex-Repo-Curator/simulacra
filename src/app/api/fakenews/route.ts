import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/apiSecurity";

export const runtime = "nodejs";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3";
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

const FALLBACK_HEADLINES = [
  "BREAKING: Central bank admits stablecoins now settle more volume than wire transfers",
  "Sources: Major AI lab reportedly trained model on private medical records — company denies",
  "Regulator proposes 40% tax on GPU clusters; datacenter stocks whipsaw in after-hours",
  "Anonymous wallet moves $2.1B in Bitcoin; on-chain analysts argue it's either Satoshi or a typo",
  "Whistleblower claims social feed ranking optimizes for 'productive disagreement' — engagement up 340%",
];

export async function GET(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, "fakenews", 12, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const response = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You write one absurd but plausible-sounding breaking news headline about tech, AI, finance, or crypto. " +
              "No quotes around the headline. Max 18 words. No explanation.",
          },
          {
            role: "user",
            content: "Generate a headline now.",
          },
        ],
        temperature: 1.05,
        max_tokens: 80,
      }),
    });

    if (!response.ok) {
      await response.text();
      return NextResponse.json({
        headline: FALLBACK_HEADLINES[Math.floor(Math.random() * FALLBACK_HEADLINES.length)]!,
        fallback: true,
      });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const headline = raw.replace(/^["']|["']$/g, "").split("\n")[0]?.trim() || "";

    if (!headline) {
      return NextResponse.json({
        headline: FALLBACK_HEADLINES[Math.floor(Math.random() * FALLBACK_HEADLINES.length)]!,
        fallback: true,
      });
    }

    return NextResponse.json({ headline, fallback: false });
  } catch {
    return NextResponse.json({
      headline: FALLBACK_HEADLINES[Math.floor(Math.random() * FALLBACK_HEADLINES.length)]!,
      fallback: true,
    });
  }
}
