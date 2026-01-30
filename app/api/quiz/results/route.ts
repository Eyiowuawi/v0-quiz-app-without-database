import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState, User } from '@/lib/redis'
import { quizQuestions, Question } from '@/lib/quiz-data'

interface StoredAnswer {
  email: string
  questionIndex: number
  selectedOption: number
  isCorrect: boolean
  answeredAt: number
}

// Helper to get questions (custom or default)
async function getQuestions(): Promise<Question[]> {
  const customQuestions = await redis.get<Question[]>(KEYS.CUSTOM_QUESTIONS)
  return customQuestions && customQuestions.length > 0 ? customQuestions : quizQuestions
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    const isModerator = request.nextUrl.searchParams.get('moderator') === 'true'
    
    // Check if quiz results are being shown
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE)
    const showResults = state?.showResults === true
    const questions = await getQuestions()

    if (email) {
      const normalizedEmail = email.toLowerCase().trim()
      
      // If results not shown yet and not moderator, only return basic stats (no answers)
      if (!showResults && !isModerator) {
        // Just return that they need to wait
        return NextResponse.json({
          email: normalizedEmail,
          resultsAvailable: false,
          message: 'Results will be available when the quiz ends',
        })
      }

      // Get all user's answers from individual keys
      const userAnswers: StoredAnswer[] = []
      for (let i = 0; i < questions.length; i++) {
        const answerKey = KEYS.USER_ANSWER(normalizedEmail, i)
        const answer = await redis.get<StoredAnswer>(answerKey)
        if (answer) {
          userAnswers.push(answer)
        }
      }

      const correctCount = userAnswers.filter(a => a.isCorrect).length
      const totalAnswered = userAnswers.length

      return NextResponse.json({
        email: normalizedEmail,
        resultsAvailable: true,
        correctCount,
        totalAnswered,
        totalQuestions: questions.length,
        percentage: totalAnswered > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
        answers: userAnswers.map(a => ({
          questionIndex: a.questionIndex,
          question: questions[a.questionIndex]?.question,
          options: questions[a.questionIndex]?.options,
          selectedOption: a.selectedOption,
          correctOption: questions[a.questionIndex]?.correctOption,
          isCorrect: a.isCorrect,
        }))
      })
    }

    // Get leaderboard (moderator view or when results are shown)
    const users = await redis.get<User[]>(KEYS.USERS) || []
    const allAnswers = await redis.get<StoredAnswer[]>(KEYS.ANSWERS) || []

    // Build leaderboard by getting answers for each user
    // Use individual answer keys as the source of truth for accuracy
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const normalizedEmail = user.email.toLowerCase().trim()
        const userAnswers: StoredAnswer[] = []
        
        // Get all answers for this user from individual keys
        for (let i = 0; i < questions.length; i++) {
          const answerKey = KEYS.USER_ANSWER(normalizedEmail, i)
          const answer = await redis.get<StoredAnswer>(answerKey)
          if (answer) {
            userAnswers.push(answer)
          }
        }
        
        const correctCount = userAnswers.filter(a => a.isCorrect).length
        return {
          email: user.email,
          correctCount,
          totalAnswered: userAnswers.length,
          percentage: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
        }
      })
    )

    // Sort by correct count (descending), then by percentage (descending)
    leaderboard.sort((a, b) => b.correctCount - a.correctCount || b.percentage - a.percentage)

    return NextResponse.json({
      leaderboard,
      totalParticipants: users.length,
      totalQuestions: questions.length,
      showResults,
    })
  } catch (error) {
    console.error('Get results error:', error)
    return NextResponse.json({ error: 'Failed to get results' }, { status: 500 })
  }
}
