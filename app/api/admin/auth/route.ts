import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS } from "@/lib/redis";
import { randomBytes } from "crypto";

const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";

function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

// Admin login
export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json();

    if (!adminKey) {
      return NextResponse.json(
        { error: "Admin key is required" },
        { status: 400 },
      );
    }

    if (adminKey !== ADMIN_KEY) {
      return NextResponse.json(
        { error: "Invalid admin key" },
        { status: 401 },
      );
    }

    // Create session (24 hour expiry)
    const sessionId = generateSessionId();
    await redis.set(
      KEYS.ADMIN_SESSION(sessionId),
      { authenticated: true, createdAt: Date.now() },
      { ex: 86400 },
    );

    return NextResponse.json({
      success: true,
      sessionId,
      message: "Admin login successful",
    });
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}

// Verify admin session
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-admin-session-id");

    if (!sessionId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await redis.get(KEYS.ADMIN_SESSION(sessionId));

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("Admin session check error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
