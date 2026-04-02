import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter (no external dependency)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS = 20;
const WINDOW_MS = 60_000; // 1 minute

export async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "global";

    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return null;
    }

    entry.count++;

    if (entry.count > MAX_REQUESTS) {
      const remaining = 0;
      return NextResponse.json(
        { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        {
          status: 429,
          headers: { "X-RateLimit-Remaining": remaining.toString() },
        }
      );
    }
  } catch {
    // If rate limiting fails, allow the request
  }

  return null;
}

// Cleanup stale entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 60_000);
}
