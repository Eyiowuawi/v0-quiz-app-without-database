import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, QuizState, User } from '@/lib/redis'
import { quizQuestions } from '@/lib/quiz-data'

interface StoredAnswer {
  email: string
  questionIndex: number
  selectedOption: number
  isCorrect: boolean
  answeredAt: number
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    const isModerator = request.nextUrl.searchParams.get('moderator') === 'true'
    
    // Check if quiz results are being shown
    const state = await redis.get<QuizState>(KEYS.QUIZ_STATE)
    const showResults = state?.showResults === true

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
      for (let i = 0; i < quizQuestions.length; i++) {
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
        totalQuestions: quizQuestions.length,
        percentage: totalAnswered > 0 ? Math.round((correctCount / quizQuestions.length) * 100) : 0,
        answers: userAnswers.map(a => ({
          questionIndex: a.questionIndex,
          question: quizQuestions[a.questionIndex]?.question,
          options: quizQuestions[a.questionIndex]?.options,
          selectedOption: a.selectedOption,
          correctOption: quizQuestions[a.questionIndex]?.correctOption,
          isCorrect: a.isCorrect,
        }))
      })
    }

    // Get leaderboard (moderator view or when results are shown)
    const users = await redis.get<User[]>(KEYS.USERS) || []
    const allAnswers = await redis.get<StoredAnswer[]>(KEYS.ANSWERS) || []

    const leaderboard = users.map(user => {
      const userAnswers = allAnswers.filter(a => a.email === user.email)
      const correctCount = userAnswers.filter(a => a.isCorrect).length
      return {
        email: user.email,
        correctCount,
        totalAnswered: userAnswers.length,
        percentage: quizQuestions.length > 0 ? Math.round((correctCount / quizQuestions.length) * 100) : 0,
      }
    }).sort((a, b) => b.correctCount - a.correctCount || b.percentage - a.percentage)

    return NextResponse.json({
      leaderboard,
      totalParticipants: users.length,
      totalQuestions: quizQuestions.length,
      showResults,
    })
  } catch (error) {
    console.error('Get results error:', error)
    return NextResponse.json({ error: 'Failed to get results' }, { status: 500 })
  }
}
