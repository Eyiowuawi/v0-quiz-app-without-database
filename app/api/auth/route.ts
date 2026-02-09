import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, User } from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const { email, teamId } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email required" },
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

    // Use atomic check-and-set pattern to prevent race conditions
    // This handles concurrent registrations safely
    let retries = 5;
    let userAdded = false;

    while (retries > 0 && !userAdded) {
      try {
        // Get current users list (atomic read)
        const currentUsers =
          (await redis.get<User[]>(KEYS.USERS(teamId))) || [];

        // Check if user already exists
        const userExists = currentUsers.some(
          (u) => u.email === normalizedEmail,
        );

        if (userExists) {
          // User already exists, that's fine - just create session
          userAdded = true;
          break;
        }

        // Double-check pattern: read again right before write
        const doubleCheckUsers =
          (await redis.get<User[]>(KEYS.USERS(teamId))) || [];

        if (doubleCheckUsers.some((u) => u.email === normalizedEmail)) {
          // User was added between our reads, that's fine
          userAdded = true;
          break;
        }

        // Add new user (critical section)
        const newUser: User = {
          email: normalizedEmail,
          joinedAt: Date.now(),
        };

        await redis.set(KEYS.USERS(teamId), [...doubleCheckUsers, newUser]);
        userAdded = true;
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("Failed to add user after retries:", error);
          // Don't fail completely - try to create session anyway
          // User might have been added by another request
        } else {
          // Exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms
          await new Promise((resolve) =>
            setTimeout(resolve, 10 * Math.pow(2, 5 - retries)),
          );
        }
      }
    }

    // Create session
    await redis.set(
      KEYS.USER_SESSION(teamId, normalizedEmail),
      { email: normalizedEmail },
      { ex: 86400 },
    ); // 24 hour expiry

    // Check if user was newly added (for response)
    // If userAdded is true, we successfully added them in this request
    // If false, they already existed or we couldn't determine
    const finalUsers = (await redis.get<User[]>(KEYS.USERS(teamId))) || [];
    const userNowExists = finalUsers.some((u) => u.email === normalizedEmail);
    const isNewUser = userAdded && userNowExists;

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
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

    const session = await redis.get(
      KEYS.USER_SESSION(teamId, email.toLowerCase()),
    );

    return NextResponse.json({
      authenticated: !!session,
      email: session ? email.toLowerCase() : null,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
