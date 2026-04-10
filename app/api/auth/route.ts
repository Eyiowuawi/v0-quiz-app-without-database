import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, User } from "@/lib/redis";
import { normalizeParticipantName } from "@/lib/participant-name";

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

    let retries = 5;
    let userAdded = false;

    while (retries > 0 && !userAdded) {
      try {
        const currentUsers =
          (await redis.get<User[]>(KEYS.USERS(teamId))) || [];

        const existingIndex = currentUsers.findIndex(
          (u) => u.email === normalizedEmail,
        );

        if (existingIndex >= 0) {
          const next = [...currentUsers];
          next[existingIndex] = {
            ...next[existingIndex],
            name: displayName,
          };
          await redis.set(KEYS.USERS(teamId), next);
          userAdded = true;
          break;
        }

        const doubleCheckUsers =
          (await redis.get<User[]>(KEYS.USERS(teamId))) || [];

        const dupIndex = doubleCheckUsers.findIndex(
          (u) => u.email === normalizedEmail,
        );
        if (dupIndex >= 0) {
          const next = [...doubleCheckUsers];
          next[dupIndex] = { ...next[dupIndex], name: displayName };
          await redis.set(KEYS.USERS(teamId), next);
          userAdded = true;
          break;
        }

        const newUser: User = {
          email: normalizedEmail,
          name: displayName,
          joinedAt: Date.now(),
        };

        await redis.set(KEYS.USERS(teamId), [...doubleCheckUsers, newUser]);
        userAdded = true;
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("Failed to add user after retries:", error);
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, 10 * Math.pow(2, 5 - retries)),
          );
        }
      }
    }

    await redis.set(
      KEYS.USER_SESSION(teamId, normalizedEmail),
      { email: normalizedEmail, name: displayName },
      { ex: 86400 },
    );

    const finalUsers = (await redis.get<User[]>(KEYS.USERS(teamId))) || [];
    const userNowExists = finalUsers.some((u) => u.email === normalizedEmail);
    const isNewUser = userAdded && userNowExists;

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      name: displayName,
      isNewUser: isNewUser,
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
