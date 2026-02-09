import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, QuizState, User } from "@/lib/redis";
import { quizQuestions, Question } from "@/lib/quiz-data";

interface StoredAnswer {
  email: string;
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  answeredAt: number;
}

// Helper to get questions (custom or default)
async function getQuestions(teamId: string): Promise<Question[]> {
  const customQuestions = await redis.get<Question[]>(
    KEYS.CUSTOM_QUESTIONS(teamId),
  );
  return customQuestions && customQuestions.length > 0
    ? customQuestions
    : quizQuestions;
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    const teamId = request.nextUrl.searchParams.get("teamId");
    const isModerator =
      request.nextUrl.searchParams.get("moderator") === "true";

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 },
      );
    }

    // Check if quiz results are being shown
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE(teamId));
    const showResults = state?.showResults === true;
    const questions = await getQuestions(teamId);

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();

      // If results not shown yet and not moderator, only return basic stats (no answers)
      if (!showResults && !isModerator) {
        // Just return that they need to wait
        return NextResponse.json({
          email: normalizedEmail,
          resultsAvailable: false,
          message: "Results will be available when the quiz ends",
        });
      }

      // Get all user's answers from individual keys
      const userAnswers: StoredAnswer[] = [];
      for (let i = 0; i < questions.length; i++) {
        const answerKey = KEYS.USER_ANSWER(teamId, normalizedEmail, i);
        const answer = await redis.get<StoredAnswer>(answerKey);
        if (answer) {
          userAnswers.push(answer);
        }
      }

      const correctCount = userAnswers.filter((a) => a.isCorrect).length;
      const totalAnswered = userAnswers.length;

      // Create a map of answered questions for quick lookup
      const answeredMap = new Map<number, StoredAnswer>();
      userAnswers.forEach((a) => {
        answeredMap.set(a.questionIndex, a);
      });

      // Build complete answer list including unanswered questions
      const allAnswers = questions.map((question, index) => {
        const answer = answeredMap.get(index);
        if (answer) {
          // Question was answered
          return {
            questionIndex: index,
            question: question.question,
            options: question.options,
            selectedOption: answer.selectedOption,
            correctOption: question.correctOption,
            isCorrect: answer.isCorrect,
            answered: true,
          };
        } else {
          // Question was not answered
          return {
            questionIndex: index,
            question: question.question,
            options: question.options,
            selectedOption: null,
            correctOption: question.correctOption,
            isCorrect: false,
            answered: false,
          };
        }
      });

      return NextResponse.json({
        email: normalizedEmail,
        resultsAvailable: true,
        correctCount,
        totalAnswered,
        totalQuestions: questions.length,
        percentage:
          totalAnswered > 0
            ? Math.round((correctCount / questions.length) * 100)
            : 0,
        answers: allAnswers,
      });
    }

    // Get leaderboard (moderator view or when results are shown)
    const users = (await redis.get<User[]>(KEYS.USERS(teamId))) || [];

    // Build leaderboard by getting answers for each user
    // IMPORTANT: This includes ALL registered users, even those who didn't answer any questions
    // Use individual answer keys as the source of truth for accuracy
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const normalizedEmail = user.email.toLowerCase().trim();
        const userAnswers: StoredAnswer[] = [];

        // Get all answers for this user from individual keys
        for (let i = 0; i < questions.length; i++) {
          const answerKey = KEYS.USER_ANSWER(teamId, normalizedEmail, i);
          const answer = await redis.get<StoredAnswer>(answerKey);
          if (answer) {
            userAnswers.push(answer);
          }
        }

        const correctCount = userAnswers.filter((a) => a.isCorrect).length;
        // Include all users - those with 0 answers will show 0/0 or 0/totalQuestions
        return {
          email: user.email,
          correctCount,
          totalAnswered: userAnswers.length,
          percentage:
            questions.length > 0
              ? Math.round((correctCount / questions.length) * 100)
              : 0,
        };
      }),
    );

    // Sort by correct count (descending), then by percentage (descending)
    // Users with 0 answers will appear at the bottom
    leaderboard.sort((a, b) => {
      // First sort by correct count
      if (b.correctCount !== a.correctCount) {
        return b.correctCount - a.correctCount;
      }
      // Then by percentage
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      // Finally by total answered (users who answered more questions rank higher if scores are equal)
      return b.totalAnswered - a.totalAnswered;
    });

    return NextResponse.json({
      leaderboard,
      totalParticipants: users.length,
      totalQuestions: questions.length,
      showResults,
    });
  } catch (error) {
    console.error("Get results error:", error);
    return NextResponse.json(
      { error: "Failed to get results" },
      { status: 500 },
    );
  }
}
