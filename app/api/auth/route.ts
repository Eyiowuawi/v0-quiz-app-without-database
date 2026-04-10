import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS } from "@/lib/redis";
import { normalizeParticipantName } from "@/lib/participant-name";
import { atomicUpsertParticipant } from "@/lib/participants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, teamId } = body;
    const displayName = normalizeParticipantName(body.name);

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 },
      );
    }

    if (!displayName || displayName.length < 2) {
      return NextResponse.json(
        { error: "Please enter your name (at least 2 characters)" },
        { status: 400 },
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const joinedAt = Date.now();

    const upsert = await atomicUpsertParticipant(
      teamId,
      normalizedEmail,
      displayName,
      joinedAt,
    );

    if (!upsert.ok) {
      return NextResponse.json(
        { error: "Could not register right now. Please try again." },
        { status: 503 },
      );
    }

    await redis.set(
      KEYS.USER_SESSION(teamId, normalizedEmail),
      { email: normalizedEmail, name: displayName },
      { ex: 86400 },
    );

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      name: displayName,
      isNewUser: upsert.wasNew,
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    const teamId = request.nextUrl.searchParams.get("teamId");

    if (!email || !teamId) {
      return NextResponse.json({ authenticated: false });
    }

    const normalized = email.toLowerCase().trim();
    const session = await redis.get<{ email: string; name?: string }>(
      KEYS.USER_SESSION(teamId, normalized),
    );

    return NextResponse.json({
      authenticated: !!session,
      email: session ? normalized : null,
      name: session?.name?.trim() || null,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
