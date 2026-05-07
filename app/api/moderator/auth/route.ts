import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, Moderator, ModeratorSession } from "@/lib/redis";
import { randomBytes } from "crypto";
import { hashPassword, verifyPasswordWithOptionalUpgrade } from "@/lib/password";
import { markTeamRegistered } from "@/lib/team-registry";
import { clientIp, moderatorAuthRatelimit } from "@/lib/rate-limit";

function generateTeamId(): string {
  return randomBytes(8).toString("hex");
}

function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

// Register new moderator
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const { success } = await moderatorAuthRatelimit.limit(`reg:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a minute." },
        { status: 429 },
      );
    }

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

    let retries = 5;
    let teamId: string | null = null;

    while (retries > 0) {
      const existingModerator = await redis.get<Moderator>(
        KEYS.MODERATOR(normalizedEmail),
      );

      if (existingModerator) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 },
        );
      }

      teamId = generateTeamId();
      const passwordHash = await hashPassword(password);

      const moderator: Moderator = {
        email: normalizedEmail,
        name: name.trim(),
        teamId,
        passwordHash,
        createdAt: Date.now(),
      };

      try {
        const doubleCheck = await redis.get<Moderator>(
          KEYS.MODERATOR(normalizedEmail),
        );

        if (doubleCheck) {
          return NextResponse.json(
            { error: "Email already registered" },
            { status: 400 },
          );
        }

        await redis.set(KEYS.MODERATOR(normalizedEmail), moderator);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("Failed to register moderator after retries:", error);
          throw error;
        }
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

    await markTeamRegistered(teamId);

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
        } else {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
    }

    const sessionId = generateSessionId();
    const session: ModeratorSession = {
      sessionId,
      email: normalizedEmail,
      teamId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
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
    const ip = clientIp(request);
    const { success } = await moderatorAuthRatelimit.limit(`login:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in a minute." },
        { status: 429 },
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const moderator = await redis.get<Moderator>(
      KEYS.MODERATOR(normalizedEmail),
    );

    if (!moderator) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const { ok, upgradedHash } = await verifyPasswordWithOptionalUpgrade(
      password,
      moderator.passwordHash,
    );

    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (upgradedHash) {
      await redis.set(KEYS.MODERATOR(normalizedEmail), {
        ...moderator,
        passwordHash: upgradedHash,
      });
    }

    await markTeamRegistered(moderator.teamId);

    const sessionId = generateSessionId();
    const session: ModeratorSession = {
      sessionId,
      email: normalizedEmail,
      teamId: moderator.teamId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
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
