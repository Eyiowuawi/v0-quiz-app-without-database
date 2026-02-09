import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, Moderator, QuizState, User } from "@/lib/redis";
import { quizQuestions } from "@/lib/quiz-data";

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const sessionId = request.headers.get("x-admin-session-id");

  if (!sessionId) {
    return false;
  }

  const session = await redis.get(KEYS.ADMIN_SESSION(sessionId));
  return !!session;
}

// Get all application data
export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all moderators
    const allModeratorEmails =
      (await redis.get<string[]>(KEYS.ALL_MODERATORS)) || [];
    const moderators = await Promise.all(
      allModeratorEmails.map(async (email) => {
        const moderator = await redis.get<Moderator>(KEYS.MODERATOR(email));
        return moderator;
      }),
    );

    const validModerators = moderators.filter((m) => m !== null) as Moderator[];

    // Get data for each team
    const teamsData = await Promise.all(
      validModerators.map(async (moderator) => {
        const teamId = moderator.teamId;
        const state = await redis.get<QuizState>(KEYS.QUIZ_STATE(teamId));
        const users = (await redis.get<User[]>(KEYS.USERS(teamId))) || [];
        const customQuestions = await redis.get(
          KEYS.CUSTOM_QUESTIONS(teamId),
        );

        // Count answers
        const answers = (await redis.get(KEYS.ANSWERS(teamId))) || [];
        const totalAnswers = Array.isArray(answers) ? answers.length : 0;

        // Count active sessions
        let activeSessions = 0;
        for (const user of users) {
          const session = await redis.get(
            KEYS.USER_SESSION(teamId, user.email),
          );
          if (session) activeSessions++;
        }

        return {
          teamId,
          moderator: {
            email: moderator.email,
            name: moderator.name,
            createdAt: moderator.createdAt,
          },
          quizState: state || null,
          participantCount: users.length,
          totalAnswers,
          activeSessions,
          hasCustomQuestions: !!customQuestions,
          customQuestionCount: Array.isArray(customQuestions)
            ? customQuestions.length
            : 0,
        };
      }),
    );

    // Calculate totals
    const totalModerators = validModerators.length;
    const totalParticipants = teamsData.reduce(
      (sum, team) => sum + team.participantCount,
      0,
    );
    const totalAnswers = teamsData.reduce(
      (sum, team) => sum + team.totalAnswers,
      0,
    );
    const activeQuizzes = teamsData.filter(
      (team) => team.quizState?.isActive,
    ).length;

    return NextResponse.json({
      summary: {
        totalModerators,
        totalTeams: totalModerators,
        totalParticipants,
        totalAnswers,
        activeQuizzes,
      },
      teams: teamsData,
    });
  } catch (error) {
    console.error("Admin data fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin data" },
      { status: 500 },
    );
  }
}
