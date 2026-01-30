import { NextRequest, NextResponse } from 'next/server'
import { redis, KEYS, UserAnswer, User } from '@/lib/redis'
import { quizQuestions } from '@/lib/quiz-data'

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    
    const answers = await redis.get<UserAnswer[]>(KEYS.ANSWERS) || []
    const users = await redis.get<User[]>(KEYS.USERS) || []

    if (email) {
      // Get individual results
      const userAnswers = answers.filter(a => a.email === email.toLowerCase())
      const correctCount = userAnswers.filter(a => a.isCorrect).length
      const totalAnswered = userAnswers.length

      return NextResponse.json({
        email: email.toLowerCase(),
        correctCount,
        totalAnswered,
        totalQuestions: quizQuestions.length,
        percentage: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0,
        answers: userAnswers.map(a => ({
          questionIndex: a.questionIndex,
          question: quizQuestions[a.questionIndex]?.question,
          selectedOption: a.selectedOption,
          correctOption: quizQuestions[a.questionIndex]?.correctOption,
          isCorrect: a.isCorrect,
        }))
      })
    }

    // Get leaderboard
    const leaderboard = users.map(user => {
      const userAnswers = answers.filter(a => a.email === user.email)
      const correctCount = userAnswers.filter(a => a.isCorrect).length
      return {
        email: user.email,
        correctCount,
        totalAnswered: userAnswers.length,
        percentage: userAnswers.length > 0 ? Math.round((correctCount / userAnswers.length) * 100) : 0,
      }
    }).sort((a, b) => b.correctCount - a.correctCount || b.percentage - a.percentage)

    return NextResponse.json({
      leaderboard,
      totalParticipants: users.length,
      totalQuestions: quizQuestions.length,
    })
  } catch (error) {
    console.error('Get results error:', error)
    return NextResponse.json({ error: 'Failed to get results' }, { status: 500 })
  }
}
