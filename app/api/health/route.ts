import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    const pong = await redis.ping();
    const ok = pong === "PONG";
    return NextResponse.json({
      ok,
      redis: ok,
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, redis: false, timestamp: Date.now() },
      { status: 503 },
    );
  }
}
