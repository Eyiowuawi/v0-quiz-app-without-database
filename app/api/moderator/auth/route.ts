import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, Moderator, ModeratorSession } from "@/lib/redis";
import { randomBytes } from "crypto";

// Simple password hashing (use bcrypt in production)
function hashPassword(password: string): string {
  // This is a simple hash - use bcrypt or similar in production
  return Buffer.from(password).toString("base64");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function generateTeamId(): string {
  return randomBytes(8).toString("hex");
}

function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

// Register new moderator
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 },
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Use atomic check-and-set pattern to prevent race conditions
    // Try to set moderator with NX (only if not exists) - this is atomic
    let retries = 5;
    let teamId: string | null = null;

    while (retries > 0) {
      // Check if moderator already exists (atomic read)
      const existingModerator = await redis.get<Moderator>(
        KEYS.MODERATOR(normalizedEmail),
      );

      if (existingModerator) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 },
        );
      }

      // Generate unique teamId
      teamId = generateTeamId();
      const passwordHash = hashPassword(password);

      const moderator: Moderator = {
        email: normalizedEmail,
        name: name.trim(),
        teamId,
        passwordHash,
        createdAt: Date.now(),
      };

      // Try to save - if it fails due to race condition, retry
      try {
        // Check again right before setting (double-check pattern)
        const doubleCheck = await redis.get<Moderator>(
          KEYS.MODERATOR(normalizedEmail),
        );

        if (doubleCheck) {
          return NextResponse.json(
            { error: "Email already registered" },
            { status: 400 },
          );
        }

        // Save moderator (this is the critical section)
        await redis.set(KEYS.MODERATOR(normalizedEmail), moderator);

        // If we get here, we successfully created the moderator
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("Failed to register moderator after retries:", error);
          throw error;
        }
        // Exponential backoff: 10ms, 20ms, 40ms, 80ms, 160ms
        await new Promise((resolve) =>
          setTimeout(resolve, 10 * Math.pow(2, 5 - retries)),
        );
      }
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "Failed to generate team ID" },
        { status: 500 },
      );
    }

    // Add to all moderators list with retry logic
    let listRetries = 3;
    while (listRetries > 0) {
      try {
        const allModerators =
          (await redis.get<string[]>(KEYS.ALL_MODERATORS)) || [];
        if (!allModerators.includes(normalizedEmail)) {
          allModerators.push(normalizedEmail);
          await redis.set(KEYS.ALL_MODERATORS, allModerators);
        }
        break;
      } catch (error) {
        listRetries--;
        if (listRetries === 0) {
          console.error("Failed to update moderators list:", error);
          // Don't fail registration if list update fails
        } else {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
    }

    // Create session
    const sessionId = generateSessionId();
    const session: ModeratorSession = {
      sessionId,
      email: normalizedEmail,
      teamId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    await redis.set(KEYS.MODERATOR_SESSION(sessionId), session);

    return NextResponse.json({
      success: true,
      sessionId,
      teamId,
      email: normalizedEmail,
      name: name,
    });
  } catch (error) {
    console.error("Moderator registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

// Login moderator
export async function PUT(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get moderator
    const moderator = await redis.get<Moderator>(
      KEYS.MODERATOR(normalizedEmail),
    );

    if (!moderator) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Verify password
    if (!verifyPassword(password, moderator.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Create session
    const sessionId = generateSessionId();
    const session: ModeratorSession = {
      sessionId,
      email: normalizedEmail,
      teamId: moderator.teamId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    await redis.set(KEYS.MODERATOR_SESSION(sessionId), session);

    return NextResponse.json({
      success: true,
      sessionId,
      teamId: moderator.teamId,
      email: normalizedEmail,
      name: moderator.name,
    });
  } catch (error) {
    console.error("Moderator login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

// Verify session
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id");

    if (!sessionId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const session = await redis.get<ModeratorSession>(
      KEYS.MODERATOR_SESSION(sessionId),
    );

    if (!session || session.expiresAt < Date.now()) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const moderator = await redis.get<Moderator>(KEYS.MODERATOR(session.email));

    if (!moderator) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      sessionId,
      teamId: moderator.teamId,
      email: moderator.email,
      name: moderator.name,
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
