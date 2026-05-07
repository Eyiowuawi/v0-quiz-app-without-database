import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, User } from "@/lib/redis";
import { quizQuestions } from "@/lib/quiz-data";

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const sessionId = request.headers.get("x-admin-session-id");

  if (!sessionId) {
    return false;
  }

  const session = await redis.get(KEYS.ADMIN_SESSION(sessionId));
  return !!session;
}

// Clear data for a specific team
export async function DELETE(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId, clearAll } = await request.json();

    if (clearAll) {
      // Clear ENTIRE database
      // Get all moderators first
      const allModeratorEmails =
        (await redis.get<string[]>(KEYS.ALL_MODERATORS)) || [];

      // Clear all team data
      for (const email of allModeratorEmails) {
        const moderator = await redis.get(KEYS.MODERATOR(email));
        if (moderator) {
          const tid = (moderator as any).teamId;
          await clearTeamData(tid);
        }
      }

      // Clear all moderator data
      for (const email of allModeratorEmails) {
        await redis.del(KEYS.MODERATOR(email));
      }

      // Clear moderator sessions (we'll need to scan, but for now just clear the list)
      await redis.del(KEYS.ALL_MODERATORS);

      // Note: We can't easily delete all moderator sessions without scanning
      // They'll expire naturally after 24 hours

      return NextResponse.json({
        success: true,
        message: "Entire database cleared successfully",
      });
    } else if (teamId) {
      // Clear specific team
      await clearTeamData(teamId);

      return NextResponse.json({
        success: true,
        message: `Team ${teamId} data cleared successfully`,
      });
    } else {
      return NextResponse.json(
        { error: "teamId or clearAll is required" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Admin clear error:", error);
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 },
    );
  }
}

async function clearTeamData(teamId: string) {
  // Clear quiz state
  await redis.del(KEYS.QUIZ_STATE(teamId));

  // Clear team registration marker
  await redis.del(KEYS.TEAM_REGISTERED(teamId));

  // Clear main answers array
  await redis.del(KEYS.ANSWERS(teamId));

  // Get all users to clear their session and answer keys
  const users = (await redis.get<User[]>(KEYS.USERS(teamId))) || [];
  const questions =
    (await redis.get(KEYS.CUSTOM_QUESTIONS(teamId))) || quizQuestions;
  const questionCount = Array.isArray(questions) ? questions.length : 0;

  for (const user of users) {
    // Clear user session
    await redis.del(KEYS.USER_SESSION(teamId, user.email));

    // Clear all user answers
    for (let i = 0; i < questionCount; i++) {
      await redis.del(KEYS.USER_ANSWER(teamId, user.email, i));
    }
  }

  // Clear users list
  await redis.del(KEYS.USERS(teamId));

  // Clear custom questions
  await redis.del(KEYS.CUSTOM_QUESTIONS(teamId));
}
