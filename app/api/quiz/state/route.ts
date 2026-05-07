import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, QuizState, User } from "@/lib/redis";
import { quizQuestions, Question } from "@/lib/quiz-data";
import { atomicExpireTimerIfNeeded } from "@/lib/atomic-moderator-quiz";
import { isTeamRegistered } from "@/lib/team-registry";

const DEFAULT_QUIZ_STATE: QuizState = {
  currentQuestionIndex: -1,
  isActive: false,
  showResults: false,
  timerMode: false,
  timerDuration: 30,
};

// Helper to get questions (custom or default)
async function getQuestions(teamId: string): Promise<Question[]> {
  const customQuestions = await redis.get<Question[]>(
    KEYS.CUSTOM_QUESTIONS(teamId)
  );
  return customQuestions && customQuestions.length > 0
    ? customQuestions
    : quizQuestions;
}

export async function GET(request: NextRequest) {
  try {
    const teamId = request.nextUrl.searchParams.get("teamId")?.trim();

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    if (!(await isTeamRegistered(teamId))) {
      return NextResponse.json(
        { error: "Unknown team ID", code: "UNKNOWN_TEAM" },
        { status: 404 }
      );
    }

    const stateKey = KEYS.QUIZ_STATE(teamId);
    let state = await redis.get<QuizState>(stateKey);
    const questions = await getQuestions(teamId);

    if (!state) {
      // SETNX: only one writer initializes; others re-fetch so we never overwrite
      // a state another tab/moderator created between GET and SET.
      await redis.setnx(stateKey, DEFAULT_QUIZ_STATE);
      state = (await redis.get<QuizState>(stateKey)) ?? DEFAULT_QUIZ_STATE;
    }

    // Server-side timer: advance when duration elapsed (no moderator tab required).
    state = await atomicExpireTimerIfNeeded(
      teamId,
      questions.length,
      Date.now()
    );

    const currentQuestion =
      state.currentQuestionIndex >= 0 &&
      state.currentQuestionIndex < questions.length
        ? {
            id: questions[state.currentQuestionIndex].id,
            question: questions[state.currentQuestionIndex].question,
            options: questions[state.currentQuestionIndex].options,
            // Don't send correct answer to client
          }
        : null;

    const users = (await redis.get<User[]>(KEYS.USERS(teamId))) || [];
    const participants = users.map((user) => ({
      email: user.email,
      displayName: user.name?.trim() || user.email.split("@")[0],
      joinedAt: user.joinedAt,
    }));

    return NextResponse.json({
      state: {
        currentQuestionIndex: state.currentQuestionIndex,
        isActive: state.isActive,
        showResults: state.showResults,
        timerMode: state.timerMode,
        timerDuration: state.timerDuration,
        questionStartTime: state.questionStartTime,
      },
      totalQuestions: questions.length,
      currentQuestion,
      participants,
    });
  } catch (error) {
    console.error("Get quiz state error:", error);
    return NextResponse.json(
      { error: "Failed to get quiz state" },
      { status: 500 }
    );
  }
}
