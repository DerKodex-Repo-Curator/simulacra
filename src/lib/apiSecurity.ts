import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/types";

type RateLimitState = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitState>();

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}

export function enforceRateLimit(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const key = `${bucket}:${getClientIp(req)}`;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  existing.count += 1;
  return null;
}

export function requireConfiguredProvider(provider: string, apiKey?: string) {
  if (provider === "groq" && !apiKey) {
    return NextResponse.json(
      { error: "Server is missing required provider configuration." },
      { status: 500 },
    );
  }

  return null;
}

export function isKnownAgent(agent: string) {
  return (AGENTS as readonly string[]).includes(agent);
}

export function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;

  const sanitized = value.trim().replace(/\0/g, "");
  if (!sanitized) return null;

  return sanitized.slice(0, maxLength);
}
